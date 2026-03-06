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

    // --- Render function ---
    function render() {
      const state = stateRef.current;
      if (!state) return;
      const { buffers: b, count: n } = state;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Dark background
      ctx!.fillStyle = '#1a1a1a';
      ctx!.fillRect(0, 0, w, h);

      // Draw all bubbles
      for (let i = 0; i < n; i++) {
        const bx = b.x[i]!;
        const by = b.y[i]!;
        const r = b.radius[i]!;

        // Base blue circle
        ctx!.beginPath();
        ctx!.arc(bx, by, r, 0, TWO_PI);
        ctx!.fillStyle = 'hsl(210, 60%, 35%)';
        ctx!.fill();

        // 3D sphere radial gradient overlay
        const grad = ctx!.createRadialGradient(
          bx - r * 0.18,
          by - r * 0.22,
          r * 0.05,
          bx,
          by,
          r,
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
        grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(0.6, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');

        ctx!.beginPath();
        ctx!.arc(bx, by, r, 0, TWO_PI);
        ctx!.fillStyle = grad;
        ctx!.fill();
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
