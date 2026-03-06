import { useEffect } from 'react';
import { Header } from './Header';
import { BubbleCanvas } from './BubbleCanvas';
import { useStockStore } from '../store/useStockStore';

export function App() {
  const loadRealData = useStockStore(s => s.loadRealData);
  const loading = useStockStore(s => s.loading);
  const isRealData = useStockStore(s => s.isRealData);

  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  return (
    <div className="flex h-screen flex-col">
      <Header />
      {loading && !isRealData && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 rounded bg-black/70 px-3 py-1.5 text-xs text-white sm:top-12 sm:px-4 sm:py-2 sm:text-sm">
          Loading real market data...
        </div>
      )}
      <BubbleCanvas />
    </div>
  );
}
