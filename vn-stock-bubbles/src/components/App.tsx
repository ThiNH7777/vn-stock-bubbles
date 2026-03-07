import { useEffect } from 'react';
import { Header } from './Header';
import { BubbleCanvas } from './BubbleCanvas';
import { StockTable } from './StockTable';
import { Footer } from './Footer';
import { LoadingScreen } from './LoadingScreen';
import { DetailPanel } from './DetailPanel';
import { MobileTabBar } from './MobileTabBar';
import { useStockStore } from '../store/useStockStore';
import { useAppStore } from '../store/useAppStore';

export function App() {
  const loadRealData = useStockStore(s => s.loadRealData);
  const loading = useStockStore(s => s.loading);
  const isRealData = useStockStore(s => s.isRealData);
  const mobileView = useAppStore(s => s.mobileView);

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
          {/* Desktop: show both chart + table stacked */}
          <div className="hidden sm:block">
            <div className="h-[calc(100vh-5.5rem)]">
              <BubbleCanvas />
            </div>
            <StockTable />
            <Footer />
          </div>

          {/* Mobile: toggle between chart and table via bottom tab bar */}
          <div className="sm:hidden">
            {mobileView === 'chart' ? (
              <div className="h-[calc(100dvh-6.5rem)]">
                <BubbleCanvas />
              </div>
            ) : (
              <div className="pb-14">
                <StockTable />
                <Footer />
              </div>
            )}
            <MobileTabBar />
          </div>
        </>
      )}
      <DetailPanel />
    </>
  );
}
