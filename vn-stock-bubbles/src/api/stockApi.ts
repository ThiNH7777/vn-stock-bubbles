import type { StockData, MarketSummary } from '../types/stock';

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

// ── 3. VPS Historical bars (supports D, 60, 30, 15, 5, 1 resolutions) ──

async function fetchVpsHistory(symbol: string, fromTs: number, toTs: number, resolution = 'D'): Promise<VpsHistBars | null> {
  const url = `${VPS_HIST}/history?symbol=${symbol}&resolution=${resolution}&from=${fromTs}&to=${toTs}`;
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

// ── 7. Hourly stock history (60min bars, last 35 days for Day/Week/Month charts) ──

export async function fetchStockIntraday(
  ticker: string
): Promise<{ t: number[]; c: number[]; h: number[]; l: number[]; v: number[] } | null> {
  try {
    const today = new Date();
    const from = new Date(today.getTime() - 35 * 86400000); // 35 days covers month + weekends
    const data = await fetchVpsHistory(ticker, toUnix(from), toUnix(today), '60');
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

// ── VN-Index from VPS TradingView endpoint ──

async function fetchVnIndex(): Promise<{ value: number; change: number; changePercent: number } | null> {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 10 * 86400000);
    const data = await fetchVpsHistory('VNINDEX', toUnix(weekAgo), toUnix(today));
    if (!data || data.c.length < 2) return null;
    const latest = data.c[data.c.length - 1]!;
    const prev = data.c[data.c.length - 2]!;
    const change = +(latest - prev).toFixed(2);
    const changePercent = +((change / prev) * 100).toFixed(2);
    return { value: +latest.toFixed(2), change, changePercent };
  } catch {
    return null;
  }
}

// ── Main: fetch and assemble StockData[] + MarketSummary ──

export interface FetchResult {
  stocks: StockData[];
  marketSummary: MarketSummary;
}

// Phase 1 (fast): listings + prices + daily change + market summary
// This is enough to show bubbles immediately (~2-3s)
export async function fetchStockDataFast(): Promise<FetchResult> {
  const [vpsListings, kbsListings] = await Promise.all([
    fetchAllSymbols(),
    fetchKbsListings(),
  ]);

  const symbols = vpsListings.map(s => s.stock_code);
  const [priceMap, vnIndex] = await Promise.all([
    fetchPrices(symbols),
    fetchVnIndex(),
  ]);

  const stocks: StockData[] = [];
  let upCount = 0, downCount = 0, flatCount = 0;
  let totalTradingValue = 0;

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
      ticker, companyName, exchange,
      price: currentPrice, marketCap: 0,
      volume: price.lot || 0,
      changeDay: dailyChange, changeWeek: 0, changeMonth: 0, changeYear: 0,
    });

    if (dailyChange > 0.01) upCount++;
    else if (dailyChange < -0.01) downCount++;
    else flatCount++;
    totalTradingValue += price.lot * (price.lastPrice || price.r);
  }

  // Sort by daily trading value
  const volumeMap = new Map<string, number>();
  for (const listing of vpsListings) {
    const p = priceMap.get(listing.stock_code);
    if (p) volumeMap.set(listing.stock_code, p.lot * (p.lastPrice || p.r));
  }
  stocks.sort((a, b) => (volumeMap.get(b.ticker) || 0) - (volumeMap.get(a.ticker) || 0));

  // Temp market cap from volume rank so bubbles have size variety
  for (let i = 0; i < stocks.length; i++) {
    stocks[i]!.marketCap = Math.max(10, Math.round(1000 - i * 2));
  }

  const marketSummary: MarketSummary = {
    vnIndexValue: vnIndex?.value ?? 0,
    vnIndexChange: vnIndex?.change ?? 0,
    vnIndexChangePercent: vnIndex?.changePercent ?? 0,
    gtgd: Math.round(totalTradingValue / 1e6),
    upCount, downCount, flatCount,
  };

  return { stocks, marketSummary };
}

// Phase 2 (enrich): historical data for multi-timeframe changes + real market cap
// Runs in background after bubbles are already visible
export async function enrichStockData(stocks: StockData[]): Promise<StockData[]> {
  const TOP_N = 200;
  const topStocks = stocks.slice(0, TOP_N);
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const toTs = toUnix(today);
  const fromTs = toUnix(oneYearAgo);
  const toStr = fmtDate(today);
  const fromStr = fmtDate(oneYearAgo);

  const BATCH = 50;
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

  const weekAgoTs = toUnix(new Date(today.getTime() - 7 * 86400000));
  const monthAgoTs = toUnix(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()));
  const yearAgoTs = fromTs;

  // Clone stocks to avoid mutating the original
  const enriched = stocks.map(s => ({ ...s }));

  for (const stock of enriched) {
    const kbsHist = kbsHistMap.get(stock.ticker);
    if (kbsHist && kbsHist.length > 0) {
      stock.marketCap = Math.round(kbsHist[kbsHist.length - 1]!.MarketCapital / 1e9);
    }

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

  let minMcap = Infinity;
  for (const s of enriched) if (s.marketCap > 0 && s.marketCap < minMcap) minMcap = s.marketCap;
  if (minMcap === Infinity) minMcap = 100;
  for (const s of enriched) if (s.marketCap === 0) s.marketCap = Math.round(minMcap * 0.5);

  return enriched;
}
