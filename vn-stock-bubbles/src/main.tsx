import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

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
