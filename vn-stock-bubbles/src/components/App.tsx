import { useEffect } from 'react';
import { Header } from './Header';
import { BubbleCanvas } from './BubbleCanvas';
import { LoadingScreen } from './LoadingScreen';
import { useStockStore } from '../store/useStockStore';

export function App() {
  const loadRealData = useStockStore(s => s.loadRealData);
  const loading = useStockStore(s => s.loading);
  const isRealData = useStockStore(s => s.isRealData);

  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  if (loading && !isRealData) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <BubbleCanvas />
    </div>
  );
}
