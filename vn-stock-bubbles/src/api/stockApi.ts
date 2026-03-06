import type { StockData } from '../types/stock';

// ── VPS APIs (CORS-enabled, no proxy needed) ──
const VPS_BASE = 'https://bgapidatafeed.vps.com.vn';
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

interface KbsHistorical {
  TradingDate: string;
  ClosePrice: number;
  MarketCapital: number;
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

// ── 3. Get historical data for a single stock (for market cap + multi-timeframe changes) ──

async function fetchHistory(symbol: string, fromDate: string, toDate: string): Promise<KbsHistorical[]> {
  const url = `${KBS_SAS}/stock/${symbol}/historical-quotes?from=${fromDate}&to=${toDate}`;
  return fetchJson<KbsHistorical[]>(url);
}

// ── 4. Also get company names from KBS (has English names) ──

interface KbsListing {
  symbol: string;
  name: string;
  nameEn: string;
  exchange: string;
  re: number;     // reference price in full VND
  ceiling: number;
  floor: number;
  type: string;
}

export async function fetchKbsListings(): Promise<Map<string, KbsListing>> {
  const data = await fetchJson<KbsListing[]>(`${KBS_IIS}/stock/search/data`);
  const map = new Map<string, KbsListing>();
  for (const d of data) if (d.type === 'stock') map.set(d.symbol, d);
  return map;
}

// ── Compute % change between two prices ──

function pctChange(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0;
  return +((newPrice - oldPrice) / oldPrice * 100).toFixed(2);
}

// ── Parse KBS date "DD/MM/YYYY" → Date ──

function parseKbsDate(s: string): Date {
  const [d, m, y] = s.split('/');
  return new Date(+y!, +m! - 1, +d!);
}

// ── Find closest historical close to a target date (within maxDays tolerance) ──

function closestClose(history: KbsHistorical[], targetDate: Date, maxDays = 10): number | null {
  let best: KbsHistorical | null = null;
  let bestDiff = Infinity;
  for (const h of history) {
    const d = parseKbsDate(h.TradingDate);
    const diff = Math.abs(d.getTime() - targetDate.getTime());
    if (diff < bestDiff) { bestDiff = diff; best = h; }
  }
  const maxMs = maxDays * 86400000;
  return best && bestDiff <= maxMs ? best.ClosePrice : null;
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
    // Use lastPrice if traded today, otherwise use reference (prev close)
    const currentPrice = price.lastPrice > 0 ? price.lastPrice : price.r;
    if (currentPrice === 0) continue;

    const kbs = kbsListings.get(ticker);
    const exchange = listing.post_to as 'HOSE' | 'HNX' | 'UPCOM';
    const companyName = kbs?.nameEn || listing.name_en || listing.name_vn || ticker;
    // Compute signed daily change from actual prices (VPS changePc is unsigned)
    const dailyChange = price.r > 0 && price.lastPrice > 0
      ? +((price.lastPrice - price.r) / price.r * 100).toFixed(2)
      : 0;

    stocks.push({
      ticker,
      companyName,
      exchange,
      price: currentPrice,                 // in thousands VND (e.g. 156.5 = 156,500)
      marketCap: 0,                         // filled later from KBS historical
      changeDay: dailyChange,
      changeWeek: 0,
      changeMonth: 0,
      changeYear: 0,
    });
  }

  // Sort by daily trading volume (descending) to prioritize top stocks
  const volumeMap = new Map<string, number>();
  for (const listing of vpsListings) {
    const p = priceMap.get(listing.stock_code);
    if (p) volumeMap.set(listing.stock_code, p.lot * (p.lastPrice || p.r)); // value traded
  }
  stocks.sort((a, b) => (volumeMap.get(b.ticker) || 0) - (volumeMap.get(a.ticker) || 0));

  // Step 4: Fetch historical data for top N stocks (for market cap + multi-timeframe changes)
  const TOP_N = 200;
  const topStocks = stocks.slice(0, TOP_N);
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const toStr = fmt(today);
  const fromStr = fmt(oneYearAgo);

  // Parallel fetch with concurrency limit
  const BATCH = 20;
  const historyMap = new Map<string, KbsHistorical[]>();

  for (let i = 0; i < topStocks.length; i += BATCH) {
    const batch = topStocks.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(s => fetchHistory(s.ticker, fromStr, toStr))
    );
    for (let j = 0; j < batch.length; j++) {
      const r = results[j]!;
      if (r.status === 'fulfilled' && r.value.length > 0) {
        historyMap.set(batch[j]!.ticker, r.value);
      }
    }
  }

  // Step 5: Enrich with market cap + multi-timeframe changes
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const yearAgo = new Date(today); yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  for (const stock of stocks) {
    const hist = historyMap.get(stock.ticker);
    if (!hist || hist.length === 0) continue;

    // Latest record for market cap
    const latest = hist[hist.length - 1]!;
    stock.marketCap = Math.round(latest.MarketCapital / 1e9); // convert to billions VND

    // Compute multi-timeframe changes from historical close prices
    const currentPrice = latest.ClosePrice;
    const weekClose = closestClose(hist, weekAgo);
    const monthClose = closestClose(hist, monthAgo);
    const yearClose = closestClose(hist, yearAgo);

    if (weekClose) stock.changeWeek = pctChange(weekClose, currentPrice);
    if (monthClose) stock.changeMonth = pctChange(monthClose, currentPrice);
    if (yearClose) stock.changeYear = pctChange(yearClose, currentPrice);
  }

  // For stocks without KBS data, estimate market cap from volume rank
  // (give them a small market cap so they appear as small bubbles)
  let minMcap = Infinity;
  for (const s of stocks) if (s.marketCap > 0 && s.marketCap < minMcap) minMcap = s.marketCap;
  if (minMcap === Infinity) minMcap = 100;
  for (const s of stocks) if (s.marketCap === 0) s.marketCap = Math.round(minMcap * 0.5);

  return stocks;
}

// Format date as YYYY-MM-DD
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}
