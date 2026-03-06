import { useRef, useEffect } from 'react';
import { MOCK_STOCKS } from '../data/mockStocks';
import { createSimulationBuffers, initBuffersFromStocks } from '../simulation/state';
import type { SimulationBuffers } from '../simulation/state';
import {
  createPhysicsState,
  initialPlacement,
  stepPhysics,
  handleResize,
} from '../simulation/physics';
import type { PhysicsState } from '../simulation/physics';
import { createGameLoop } from '../simulation/gameLoop';

const TWO_PI = Math.PI * 2;

interface SimState {
  buffers: SimulationBuffers;
  physics: PhysicsState;
  count: number;
  loop: { start: () => void; stop: () => void };
}

export function BubbleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SimState | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Sizing ---
    const dpr = window.devicePixelRatio || 1;
    let w = parent.clientWidth;
    let h = parent.clientHeight;

    function applySize() {
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + 'px';
      canvas!.style.height = h + 'px';
    }
    applySize();

    // --- Simulation init ---
    const count = MOCK_STOCKS.length;
    const buffers = createSimulationBuffers(count);
    initBuffersFromStocks(buffers, MOCK_STOCKS, 8, 55, w, h);
    const physics = createPhysicsState(count, w, h);
    initialPlacement(buffers, count, w, h);

    // --- Color helpers ---
    function getBubbleColor(change: number): { r: number; g: number; b: number } {
      const abs = Math.abs(change);
      const t = Math.min(abs / 7, 1); // normalize to 0-1 over 7% range
      if (abs < 0.1) {
        // Reference/yellow — very muted
        const intensity = 0.3;
        return { r: Math.round(255 * intensity), g: Math.round(193 * intensity), b: Math.round(7 * intensity) };
      }
      if (change > 0) {
        // Blue (VN up) #2196F3 — intensity scales with magnitude
        const base = 0.25;
        const scale = base + t * (1 - base);
        return { r: Math.round(33 * scale), g: Math.round(150 * scale), b: Math.round(243 * scale) };
      }
      // Red (VN down) #F44336
      const base = 0.25;
      const scale = base + t * (1 - base);
      return { r: Math.round(244 * scale), g: Math.round(67 * scale), b: Math.round(54 * scale) };
    }

    // --- Render function ---
    let animTime = 0;
    function render() {
      const state = stateRef.current;
      if (!state) return;
      const { buffers: b, count: n } = state;
      animTime += 0.016; // ~60fps increment

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Dark background
      ctx!.fillStyle = '#1a1a1a';
      ctx!.fillRect(0, 0, w, h);

      // Draw all bubbles with neon glow edge style
      for (let i = 0; i < n; i++) {
        const bx = b.x[i]!;
        const by = b.y[i]!;
        const r = b.radius[i]!;
        const stock = MOCK_STOCKS[i]!;
        const change = stock.changes.day;
        const abs = Math.abs(change);
        const color = getBubbleColor(change);
        const colorStr = `rgb(${color.r}, ${color.g}, ${color.b})`;

        // Breathing glow for high % change
        const glowIntensity = abs > 2 ? Math.min((abs - 2) / 5, 1) : 0;
        const breathe = glowIntensity > 0 ? 0.7 + 0.3 * Math.sin(animTime * 2.5 + i * 0.3) : 0;

        ctx!.save();

        // Outer neon glow
        if (glowIntensity > 0) {
          ctx!.shadowBlur = 12 + glowIntensity * 25;
          ctx!.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${(0.3 + breathe * 0.4).toFixed(2)})`;
        }

        // Neon border ring
        ctx!.beginPath();
        ctx!.arc(bx, by, r, 0, TWO_PI);
        ctx!.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(0.6 + glowIntensity * 0.4).toFixed(2)})`;
        ctx!.lineWidth = 2 + glowIntensity;
        ctx!.stroke();

        ctx!.restore();

        // Dark fill with edge-to-center gradient (bright edge → dark center)
        const fillGrad = ctx!.createRadialGradient(bx, by, r * 0.1, bx, by, r);
        fillGrad.addColorStop(0, 'rgba(20, 20, 20, 0.95)'); // very dark center
        fillGrad.addColorStop(0.6, 'rgba(20, 20, 20, 0.85)');
        fillGrad.addColorStop(0.85, `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`);
        fillGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`);

        ctx!.beginPath();
        ctx!.arc(bx, by, r - 1, 0, TWO_PI);
        ctx!.fillStyle = fillGrad;
        ctx!.fill();

        // 3D highlight overlay (top-left)
        const hlGrad = ctx!.createRadialGradient(
          bx - r * 0.25, by - r * 0.3, r * 0.05,
          bx, by, r,
        );
        hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
        hlGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
        hlGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0)');
        hlGrad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');

        ctx!.beginPath();
        ctx!.arc(bx, by, r - 1, 0, TWO_PI);
        ctx!.fillStyle = hlGrad;
        ctx!.fill();

        // Text: ticker + % change
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(bx, by, r, 0, TWO_PI);
        ctx!.clip();

        ctx!.fillStyle = '#fff';
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.shadowColor = 'rgba(0,0,0,0.6)';
        ctx!.shadowBlur = 3;

        // Ticker symbol
        const symSize = Math.max(7, r * 0.32);
        ctx!.font = `800 ${symSize}px Verdana, Arial, sans-serif`;
        ctx!.fillText(stock.symbol, bx, by - r * 0.08);

        // % change
        const chSize = Math.max(5, r * 0.22);
        ctx!.font = `700 ${chSize}px Verdana, Arial, sans-serif`;
        ctx!.fillStyle = 'rgba(255,255,255,0.85)';
        const sign = change > 0 ? '+' : '';
        ctx!.fillText(`${sign}${change.toFixed(1)}%`, bx, by + r * 0.22);

        ctx!.shadowBlur = 0;
        ctx!.restore();
      }
    }

    // --- Game loop ---
    const loop = createGameLoop(
      (dt, time) => stepPhysics(physics, buffers, count, dt, time),
      render,
    );

    stateRef.current = { buffers, physics, count, loop };
    loop.start();

    // --- ResizeObserver ---
    const observer = new ResizeObserver(() => {
      const newW = parent.clientWidth;
      const newH = parent.clientHeight;
      if (newW === w && newH === h) return;
      w = newW;
      h = newH;
      applySize();
      handleResize(physics, buffers, count, w, h);
    });
    observer.observe(parent);

    // --- Cleanup ---
    return () => {
      loop.stop();
      observer.disconnect();
      stateRef.current = null;
    };
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
