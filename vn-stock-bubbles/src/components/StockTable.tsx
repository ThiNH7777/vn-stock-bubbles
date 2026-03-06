import { useMemo, useCallback } from 'react';
import { useStockStore } from '../store/useStockStore';
import { useAppStore } from '../store/useAppStore';
import type { StockData } from '../types/stock';

const LOGO_URL = 'https://finance.vietstock.vn/image/';

function formatVND(priceThousands: number): string {
  const full = Math.round(priceThousands * 1000);
  return new Intl.NumberFormat('vi-VN').format(full);
}

function formatMarketCap(b: number): string {
  if (b >= 1000) return (b / 1000).toFixed(1) + 'T';
  return b.toLocaleString('vi-VN') + 'B';
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return v.toLocaleString('vi-VN');
}

function ChangeBadge({ val }: { val: number }) {
  if (val === 0) return <span className="text-white/30">0%</span>;
  const bg = val > 0 ? 'bg-[#22ec6c]/20 text-[#22ec6c]' : 'bg-[#ff4136]/20 text-[#ff4136]';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${bg}`}>
      {val > 0 ? '+' : ''}{val.toFixed(1)}%
    </span>
  );
}

export function StockTable() {
  const allStocks = useStockStore(s => s.stocks);
  const currentPage = useAppStore(s => s.currentPage);
  const setSelectedStock = useAppStore(s => s.setSelectedStock);

  const stocks = useMemo(
    () => allStocks.slice(currentPage * 100, (currentPage + 1) * 100),
    [allStocks, currentPage],
  );

  const onLogoError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).style.display = 'none';
  }, []);

  const offset = currentPage * 100;

  return (
    <div className="bg-[#1e1e1e] border-t border-white/10">
      {/* Sticky header */}
      <table className="w-full text-xs sm:text-sm">
        <thead className="sticky top-0 z-10 bg-[#2a2a2a]">
          <tr className="text-white/40 text-left">
            <th className="w-10 py-2.5 pl-3 pr-1 font-medium">#</th>
            <th className="py-2.5 pl-1 font-medium">Mã</th>
            <th className="py-2.5 pr-3 text-right font-medium">Giá</th>
            <th className="hidden py-2.5 pr-3 text-right font-medium sm:table-cell">Vốn hóa</th>
            <th className="hidden py-2.5 pr-3 text-right font-medium md:table-cell">KL</th>
            <th className="py-2.5 pr-2 text-center font-medium">Ngày</th>
            <th className="py-2.5 pr-2 text-center font-medium">Tuần</th>
            <th className="hidden py-2.5 pr-2 text-center font-medium sm:table-cell">Tháng</th>
            <th className="hidden py-2.5 pr-3 text-center font-medium sm:table-cell">Năm</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s, i) => (
            <tr
              key={s.ticker}
              onClick={() => setSelectedStock(s)}
              className="cursor-pointer border-t border-white/5 transition-colors hover:bg-white/5"
            >
              <td className="py-2 pl-3 pr-1 text-white/30 font-medium">{offset + i + 1}</td>
              <td className="py-2 pl-1">
                <div className="flex items-center gap-2">
                  <img
                    src={`${LOGO_URL}${s.ticker}`}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded-full bg-white/5 object-contain"
                    onError={onLogoError}
                  />
                  <span className="font-bold text-white">{s.ticker}</span>
                  <span className="hidden text-[10px] text-white/30 md:inline">{s.exchange}</span>
                </div>
              </td>
              <td className="py-2 pr-3 text-right font-medium text-white">{formatVND(s.price)}</td>
              <td className="hidden py-2 pr-3 text-right text-white/60 sm:table-cell">{formatMarketCap(s.marketCap)}</td>
              <td className="hidden py-2 pr-3 text-right text-white/60 md:table-cell">{s.volume ? formatVolume(s.volume) : '-'}</td>
              <td className="py-2 pr-2 text-center"><ChangeBadge val={s.changeDay} /></td>
              <td className="py-2 pr-2 text-center"><ChangeBadge val={s.changeWeek} /></td>
              <td className="hidden py-2 pr-2 text-center sm:table-cell"><ChangeBadge val={s.changeMonth} /></td>
              <td className="hidden py-2 pr-3 text-center sm:table-cell"><ChangeBadge val={s.changeYear} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
