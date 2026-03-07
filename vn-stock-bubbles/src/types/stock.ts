export type Timeframe = 'day' | 'week' | 'month' | 'year';
export type Exchange = 'all' | 'HOSE' | 'HNX' | 'UPCOM';

export type Industry =
  | 'Ngân hàng' | 'Bất động sản' | 'Chứng khoán' | 'Thép'
  | 'Dầu khí' | 'Điện' | 'Xây dựng' | 'Bán lẻ'
  | 'Thực phẩm' | 'Công nghệ' | 'Hóa chất' | 'Dệt may'
  | 'Vận tải' | 'Bảo hiểm' | 'Y tế' | 'Khoáng sản'
  | 'Cao su' | 'Phân bón' | 'Viễn thông' | 'Thủy sản'
  | 'Ô tô' | 'Nhựa & Bao bì' | 'Gỗ & Nội thất' | 'Khác';

export type SortBy = 'default' | 'marketCap' | 'change' | 'price' | 'volume';

export interface StockData {
  ticker: string;         // e.g., "VNM", "VIC"
  companyName: string;    // e.g., "Vinamilk", "Vingroup"
  exchange: 'HOSE' | 'HNX' | 'UPCOM';
  industry: Industry;     // industry group
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
