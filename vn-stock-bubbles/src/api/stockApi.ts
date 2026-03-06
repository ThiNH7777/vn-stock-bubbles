import type { StockData } from '../types/stock';

// ── VPS APIs (CORS-enabled, no proxy needed) ──
const VPS_BASE = 'https://bgapidatafeed.vps.com.vn';
const VPS_HIST = 'https://histdatafeed.vps.com.vn/tradingview';
// ── KBS APIs ──
const KBS_IIS = 'https://kbbuddywts.kbsec.com.vn/iis-server/investment';
const KBS_SAS = 'https://kbbuddywts.kbsec.com.vn/sas/kbsv-stock-data-store';

// ── Types for raw API responses ──

interface VpsListing {
  stock_code: string;
  name_en: string;
  name_vn: string;
  post_to: string; // 'HOSE' | 'HNX' | 'UPCOM'
  type: string;    // 'S' = stock
}

interface VpsPrice {
  sym: string;
  lastPrice: number;
  r: number;        // reference price (prev close / 1000)
  changePc: string; // daily % change
  lot: number;      // total volume
  c: number;        // ceiling
  f: number;        // floor
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string; // previous close in full VND (e.g. "164800.0")
}

interface VpsHistBars {
  s: string;        // 'ok' | 'no_data'
  t: number[];      // Unix timestamps
  c: number[];      // close prices (thousands VND, e.g. 62.4 = 62,400)
  o: number[];
  h: number[];
  l: number[];
  v: number[];
}

interface KbsHistorical {
  TradingDate: string;
  ClosePrice: number;
  MarketCapital: number;
}

interface KbsListing {
  symbol: string;
  name: string;
  nameEn: string;
  exchange: string;
  re: number;
  ceiling: number;
  floor: number;
  type: string;
}

// ── Fetch helpers ──

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// ── 1. Get all listed stock symbols ──

export async function fetchAllSymbols(): Promise<VpsListing[]> {
  const data = await fetchJson<VpsListing[]>(`${VPS_BASE}/getlistallstock`);
  return data.filter(s => s.type === 'S' && ['HOSE', 'HNX', 'UPCOM'].includes(s.post_to));
}

// ── 2. Get real-time prices for all symbols (single call) ──

export async function fetchPrices(symbols: string[]): Promise<Map<string, VpsPrice>> {
  const csv = symbols.join(',');
  const data = await fetchJson<VpsPrice[]>(`${VPS_BASE}/getliststockdata/${csv}`);
  const map = new Map<string, VpsPrice>();
  for (const d of data) map.set(d.sym, d);
  return map;
}

// ── 3. VPS Historical daily bars (full year available) ──

async function fetchVpsHistory(symbol: string, fromTs: number, toTs: number): Promise<VpsHistBars | null> {
  const url = `${VPS_HIST}/history?symbol=${symbol}&resolution=D&from=${fromTs}&to=${toTs}`;
  const data = await fetchJson<VpsHistBars>(url);
  return data.s === 'ok' && data.t.length > 0 ? data : null;
}

// ── 4. KBS historical (for market cap only — limited to ~3 months) ──

async function fetchKbsHistory(symbol: string, fromDate: string, toDate: string): Promise<KbsHistorical[]> {
  const url = `${KBS_SAS}/stock/${symbol}/historical-quotes?from=${fromDate}&to=${toDate}`;
  return fetchJson<KbsHistorical[]>(url);
}

// ── 5. KBS listings (company names) ──

export async function fetchKbsListings(): Promise<Map<string, KbsListing>> {
  const data = await fetchJson<KbsListing[]>(`${KBS_IIS}/stock/search/data`);
  const map = new Map<string, KbsListing>();
  for (const d of data) if (d.type === 'stock') map.set(d.symbol, d);
  return map;
}

// ── 6. Public stock history (1 year of daily bars) ──

export async function fetchStockHistory(
  ticker: string
): Promise<{ t: number[]; c: number[]; h: number[]; l: number[]; v: number[] } | null> {
  try {
    const today = new Date();
    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const data = await fetchVpsHistory(ticker, toUnix(yearAgo), toUnix(today));
    if (!data) return null;
    return { t: data.t, c: data.c, h: data.h, l: data.l, v: data.v };
  } catch {
    return null;
  }
}

// ── Helpers ──

function pctChange(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0;
  return +((newPrice - oldPrice) / oldPrice * 100).toFixed(2);
}

/** Find closest bar to targetTs within maxDays. Returns close price or null. */
function closestBar(timestamps: number[], closes: number[], targetTs: number, maxDays = 10): number | null {
  const maxMs = maxDays * 86400;
  let bestIdx = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < timestamps.length; i++) {
    const diff = Math.abs(timestamps[i]! - targetTs);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }
  return bestIdx >= 0 && bestDiff <= maxMs ? closes[bestIdx]! : null;
}

function toUnix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Main: fetch and assemble StockData[] ──

export async function fetchStockData(): Promise<StockData[]> {
  // Step 1: Get listings from both sources in parallel
  const [vpsListings, kbsListings] = await Promise.all([
    fetchAllSymbols(),
    fetchKbsListings(),
  ]);

  // Step 2: Get real-time prices from VPS
  const symbols = vpsListings.map(s => s.stock_code);
  const priceMap = await fetchPrices(symbols);

  // Step 3: Build initial stock data with daily change
  const stocks: StockData[] = [];
  for (const listing of vpsListings) {
    const ticker = listing.stock_code;
    const price = priceMap.get(ticker);
    if (!price) continue;
    const currentPrice = price.lastPrice > 0 ? price.lastPrice : price.r;
    if (currentPrice === 0) continue;

    const kbs = kbsListings.get(ticker);
    const exchange = listing.post_to as 'HOSE' | 'HNX' | 'UPCOM';
    const companyName = kbs?.nameEn || listing.name_en || listing.name_vn || ticker;
    const dailyChange = price.r > 0 && price.lastPrice > 0
      ? +((price.lastPrice - price.r) / price.r * 100).toFixed(2)
      : 0;

    stocks.push({
      ticker,
      companyName,
      exchange,
      price: currentPrice,
      marketCap: 0,
      changeDay: dailyChange,
      changeWeek: 0,
      changeMonth: 0,
      changeYear: 0,
    });
  }

  // Sort by daily trading value (descending) to prioritize top stocks
  const volumeMap = new Map<string, number>();
  for (const listing of vpsListings) {
    const p = priceMap.get(listing.stock_code);
    if (p) volumeMap.set(listing.stock_code, p.lot * (p.lastPrice || p.r));
  }
  stocks.sort((a, b) => (volumeMap.get(b.ticker) || 0) - (volumeMap.get(a.ticker) || 0));

  // Step 4: Fetch historical data for top N stocks
  const TOP_N = 200;
  const topStocks = stocks.slice(0, TOP_N);
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const toTs = toUnix(today);
  const fromTs = toUnix(oneYearAgo);
  const toStr = fmtDate(today);
  const fromStr = fmtDate(oneYearAgo);

  // Parallel fetch: VPS historical (for % changes) + KBS historical (for market cap)
  const BATCH = 20;
  const vpsHistMap = new Map<string, VpsHistBars>();
  const kbsHistMap = new Map<string, KbsHistorical[]>();

  for (let i = 0; i < topStocks.length; i += BATCH) {
    const batch = topStocks.slice(i, i + BATCH);
    const [vpsResults, kbsResults] = await Promise.all([
      Promise.allSettled(batch.map(s => fetchVpsHistory(s.ticker, fromTs, toTs))),
      Promise.allSettled(batch.map(s => fetchKbsHistory(s.ticker, fromStr, toStr))),
    ]);
    for (let j = 0; j < batch.length; j++) {
      const vpsR = vpsResults[j]!;
      const kbsR = kbsResults[j]!;
      if (vpsR.status === 'fulfilled' && vpsR.value) {
        vpsHistMap.set(batch[j]!.ticker, vpsR.value);
      }
      if (kbsR.status === 'fulfilled' && kbsR.value.length > 0) {
        kbsHistMap.set(batch[j]!.ticker, kbsR.value);
      }
    }
  }

  // Step 5: Enrich with market cap (KBS) + multi-timeframe changes (VPS historical)
  const weekAgoTs = toUnix(new Date(today.getTime() - 7 * 86400000));
  const monthAgoTs = toUnix(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()));
  const yearAgoTs = fromTs;

  for (const stock of stocks) {
    // Market cap from KBS (most recent entry)
    const kbsHist = kbsHistMap.get(stock.ticker);
    if (kbsHist && kbsHist.length > 0) {
      const latest = kbsHist[kbsHist.length - 1]!;
      stock.marketCap = Math.round(latest.MarketCapital / 1e9);
    }

    // Multi-timeframe % changes from VPS historical (full year data)
    const vpsHist = vpsHistMap.get(stock.ticker);
    if (vpsHist) {
      const latestClose = vpsHist.c[vpsHist.c.length - 1]!;
      const weekClose = closestBar(vpsHist.t, vpsHist.c, weekAgoTs);
      const monthClose = closestBar(vpsHist.t, vpsHist.c, monthAgoTs);
      const yearClose = closestBar(vpsHist.t, vpsHist.c, yearAgoTs);

      if (weekClose) stock.changeWeek = pctChange(weekClose, latestClose);
      if (monthClose) stock.changeMonth = pctChange(monthClose, latestClose);
      if (yearClose) stock.changeYear = pctChange(yearClose, latestClose);
    }
  }

  // Fallback market cap for stocks without KBS data
  let minMcap = Infinity;
  for (const s of stocks) if (s.marketCap > 0 && s.marketCap < minMcap) minMcap = s.marketCap;
  if (minMcap === Infinity) minMcap = 100;
  for (const s of stocks) if (s.marketCap === 0) s.marketCap = Math.round(minMcap * 0.5);

  return stocks;
}
