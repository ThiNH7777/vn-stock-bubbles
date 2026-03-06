export type Timeframe = 'day' | 'week' | 'month' | 'year';
export type Exchange = 'all' | 'HOSE' | 'HNX' | 'UPCOM';

export interface StockData {
  ticker: string;         // e.g., "VNM", "VIC"
  companyName: string;    // e.g., "Vinamilk", "Vingroup"
  exchange: 'HOSE' | 'HNX' | 'UPCOM';
  price: number;          // thousands of VND (e.g., 75.5 = 75,500 VND)
  marketCap: number;      // billions of VND
  volume: number;         // trading volume (number of shares)
  changeDay: number;      // % change today
  changeWeek: number;     // % change this week
  changeMonth: number;    // % change this month
  changeYear: number;     // % change this year
}

export interface MarketSummary {
  vnIndexValue: number;
  vnIndexChange: number;
  vnIndexChangePercent: number;
  gtgd: number;           // total trading value in billions VND
  upCount: number;
  downCount: number;
  flatCount: number;
}
