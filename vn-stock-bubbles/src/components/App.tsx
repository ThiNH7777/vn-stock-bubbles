import { useEffect } from 'react';
import { Header } from './Header';
import { BubbleCanvas } from './BubbleCanvas';
import { StockTable } from './StockTable';
import { Footer } from './Footer';
import { LoadingScreen } from './LoadingScreen';
import { DetailPanel } from './DetailPanel';
import { useStockStore } from '../store/useStockStore';

export function App() {
  const loadRealData = useStockStore(s => s.loadRealData);
  const loading = useStockStore(s => s.loading);
  const isRealData = useStockStore(s => s.isRealData);

  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  return (
    <>
      <div className="sticky top-0 z-20">
        <Header />
      </div>
      {loading && !isRealData ? (
        <LoadingScreen />
      ) : (
        <>
          <div className="h-[calc(100vh-4.5rem)] sm:h-[calc(100vh-5.5rem)]">
            <BubbleCanvas />
          </div>
          <StockTable />
          <Footer />
        </>
      )}
      <DetailPanel />
    </>
  );
}
