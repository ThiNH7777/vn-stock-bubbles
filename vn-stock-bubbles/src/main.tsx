import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { MOCK_STOCKS } from './data/mockStocks';
import { createSimulationBuffers, initBuffersFromStocks } from './simulation/state';

// Verify mock data and simulation buffers initialization
const buffers = createSimulationBuffers(MOCK_STOCKS.length);
initBuffersFromStocks(buffers, MOCK_STOCKS, 8, 60);
console.log(`[VN Stock Bubbles] Loaded ${MOCK_STOCKS.length} stocks`);
console.log(`[VN Stock Bubbles] HOSE: ${MOCK_STOCKS.filter(s => s.exchange === 'HOSE').length}, HNX: ${MOCK_STOCKS.filter(s => s.exchange === 'HNX').length}, UPCOM: ${MOCK_STOCKS.filter(s => s.exchange === 'UPCOM').length}`);
console.log(`[VN Stock Bubbles] Buffers initialized - radius range: ${Math.min(...buffers.radius).toFixed(1)} to ${Math.max(...buffers.radius).toFixed(1)}`);

function App() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <h1 className="text-3xl font-bold text-white">VN Stock Bubbles</h1>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
