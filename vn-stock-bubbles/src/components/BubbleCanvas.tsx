import { useRef, useEffect } from 'react';
import { useStockStore } from '../store/useStockStore';
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
  const stocks = useStockStore(s => s.stocks);

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
    const count = Math.min(100, stocks.length);
    const buffers = createSimulationBuffers(count);
    // Radius is auto-scaled inside initBuffersFromStocks to fit screen
    initBuffersFromStocks(buffers, stocks, 0, 0, w, h);
    const physics = createPhysicsState(count, w, h);
    initialPlacement(buffers, count, w, h);

    // --- Color helpers ---
    // RGB → HSL
    function rgbToHSL(cr: number, cg: number, cb: number) {
      const r1 = cr / 255, g1 = cg / 255, b1 = cb / 255;
      const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r1) h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)) / 6;
        else if (max === g1) h = ((b1 - r1) / d + 2) / 6;
        else h = ((r1 - g1) / d + 4) / 6;
      }
      return { h, s, l };
    }

    // HSL → RGB
    function hslToRGB(h: number, s: number, l: number) {
      let r: number, g: number, b: number;
      if (s === 0) { r = g = b = l; }
      else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1; if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    // massRatio: 0..1 where 1 = heaviest bubble → bright neon, 0 = dim/dark
    function getBubbleColor(change: number, massRatio: number): { r: number; g: number; b: number } {
      const abs = Math.abs(change);
      const t = Math.min(abs / 12, 1);
      // Heavy = overbright neon (1.4), light = 0.5. Heavy bubbles glow beyond normal.
      const neon = 0.5 + massRatio * 0.9;
      const B = 1.3; // global brightness boost +30%
      if (abs < 0.1) {
        // Neutral/yellow
        return { r: Math.min(255, Math.round(255 * neon * 0.5 * B)), g: Math.min(255, Math.round(193 * neon * 0.5 * B)), b: Math.min(255, Math.round(7 * neon * 0.5 * B)) };
      }
      if (change > 0) {
        // Green (VN up)
        const scale = neon * (0.5 + t * 0.5) * B;
        return { r: Math.min(255, Math.round(34 * scale)), g: Math.min(255, Math.round(255 * scale)), b: Math.min(255, Math.round(108 * scale)) };
      }
      // Red (VN down)
      const scale = neon * (0.5 + t * 0.5) * B;
      return { r: Math.min(255, Math.round(255 * scale)), g: Math.min(255, Math.round(67 * scale)), b: Math.min(255, Math.round(54 * scale)) };
    }

    // Lighter/desaturated center color for glass effect
    function getCenterColor(color: { r: number; g: number; b: number }) {
      const hsl = rgbToHSL(color.r, color.g, color.b);
      const newS = hsl.s * (1 - 0.5);   // desaturate 50%
      const newL = hsl.l + (1 - hsl.l) * 0.6; // lighten 60%
      return hslToRGB(hsl.h, newS, Math.min(newL, 1));
    }

    // Darker/richer edge color
    function getEdgeColor(color: { r: number; g: number; b: number }) {
      const hsl = rgbToHSL(color.r, color.g, color.b);
      return hslToRGB(hsl.h, Math.min(hsl.s * 1.1, 1), hsl.l * (1 - 0.15));
    }

    // --- Render function ---
    let animTime = 0;
    function render() {
      const state = stateRef.current;
      if (!state) return;
      const { buffers: b, count: n } = state;
      animTime += 0.016;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Dark background
      ctx!.fillStyle = '#222222';
      ctx!.fillRect(0, 0, w, h);

      // Find max mass for neon scaling
      let maxMass = 0;
      for (let i = 0; i < n; i++) { if (b.mass[i]! > maxMass) maxMass = b.mass[i]!; }

      // Draw all bubbles — translucent glass orb style
      for (let i = 0; i < n; i++) {
        const bx = b.x[i]!;
        const by = b.y[i]!;
        const r = b.radius[i]!;
        const stock = stocks[i]!;
        const change = stock.changeDay;
        const abs = Math.abs(change);
        const massRatio = maxMass > 0 ? b.mass[i]! / maxMass : 0;
        const color = getBubbleColor(change, massRatio);
        const centerColor = getCenterColor(color);
        const edgeColor = getEdgeColor(color);

        // Glow intensity based on % change (threshold 1%)
        const glowT = abs > 1 ? Math.min((abs - 1) / 11, 1) : 0;
        const breathe = 1 - 0.15 + 0.15 * Math.sin(animTime * 1.9 + i * 0.3);

        // ── 1. SOFT OUTER GLOW (hazy aura, no hard edge) ──
        if (glowT > 0) {
          const spread = 32;
          const outerR = r + spread;
          const alphaScale = glowT * breathe;
          const innerStart = r * 0.6;

          const glowGrad = ctx!.createRadialGradient(bx, by, innerStart, bx, by, outerR);
          glowGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
          const peakStop = Math.max(0.01, Math.min((r * 0.85 - innerStart) / (outerR - innerStart), 0.99));
          glowGrad.addColorStop(peakStop, `rgba(${color.r}, ${color.g}, ${color.b}, ${(0.15 * alphaScale).toFixed(3)})`);
          glowGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

          ctx!.beginPath();
          ctx!.arc(bx, by, outerR, 0, TWO_PI);
          ctx!.fillStyle = glowGrad;
          ctx!.fill();
        }

        // ── 2. OUTLINE (soft feathered ring via radial gradient) ──
        const ringW = 10 + glowT * 4;
        const ringAlpha = Math.min(1, 0.6 + glowT * 0.2);
        const soft = 0.7;
        const innerR = Math.max(0, r - ringW * (0.3 + soft * 0.4));
        const outerR2 = r + ringW * (0.3 + soft * 0.4);
        const ringGrad = ctx!.createRadialGradient(bx, by, innerR, bx, by, outerR2);
        ringGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ringGrad.addColorStop(0.21, `rgba(${color.r}, ${color.g}, ${color.b}, ${(ringAlpha * 0.15).toFixed(3)})`);
        ringGrad.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${ringAlpha.toFixed(3)})`);
        ringGrad.addColorStop(0.85, `rgba(${color.r}, ${color.g}, ${color.b}, ${(ringAlpha * 0.3).toFixed(3)})`);
        ringGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx!.beginPath();
        ctx!.arc(bx, by, outerR2, 0, TWO_PI);
        ctx!.fillStyle = ringGrad;
        ctx!.fill();

        // ── 3. TRANSLUCENT FILL (bright center → transparent edge) ──
        const fillGrad = ctx!.createRadialGradient(bx, by, 0, bx, by, r);
        fillGrad.addColorStop(0, `rgba(${centerColor.r}, ${centerColor.g}, ${centerColor.b}, 0.25)`);
        fillGrad.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`);
        fillGrad.addColorStop(1, `rgba(${edgeColor.r}, ${edgeColor.g}, ${edgeColor.b}, 0.05)`);

        ctx!.beginPath();
        ctx!.arc(bx, by, r, 0, TWO_PI);
        ctx!.fillStyle = fillGrad;
        ctx!.fill();

        // ── Glass rim — thin bright ring at edge (soap bubble reflection) ──
        const brightR = Math.min(255, color.r + 80);
        const brightG = Math.min(255, color.g + 80);
        const brightB = Math.min(255, color.b + 80);
        const rimGrad = ctx!.createRadialGradient(bx, by, r * 0.88, bx, by, r);
        rimGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        rimGrad.addColorStop(0.6, `rgba(${brightR}, ${brightG}, ${brightB}, 0.15)`);
        rimGrad.addColorStop(0.85, `rgba(${brightR}, ${brightG}, ${brightB}, 0.35)`);
        rimGrad.addColorStop(1, `rgba(${brightR}, ${brightG}, ${brightB}, 0.075)`);

        ctx!.beginPath();
        ctx!.arc(bx, by, r, 0, TWO_PI);
        ctx!.fillStyle = rimGrad;
        ctx!.fill();

        // ── 4. 3D HIGHLIGHT (glassy specular) ──
        const hlCx = bx + r * -0.15;
        const hlCy = by + r * -0.35;
        const hlR = r * 0.25;

        const hlGrad = ctx!.createRadialGradient(hlCx, hlCy, 0, hlCx, hlCy, hlR);
        hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
        hlGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.06)');
        hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(bx, by, r, 0, TWO_PI);
        ctx!.clip();

        ctx!.beginPath();
        ctx!.arc(hlCx, hlCy, hlR, 0, TWO_PI);
        ctx!.fillStyle = hlGrad;
        ctx!.fill();

        // Bottom shadow for depth
        const bsGrad = ctx!.createRadialGradient(bx, by + r * 0.3, r * 0.2, bx, by + r * 0.3, r * 0.9);
        bsGrad.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
        bsGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx!.beginPath();
        ctx!.arc(bx, by + r * 0.3, r * 0.9, 0, TWO_PI);
        ctx!.fillStyle = bsGrad;
        ctx!.fill();

        ctx!.restore();

        // ── 5. LOGO + TEXT ──
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(bx, by, r, 0, TWO_PI);
        ctx!.clip();

        // Draw logo if loaded
        const logo = logoImages[stock.ticker];
        if (logo && logo.complete && logo.naturalWidth > 0) {
          const logoSize = r * 0.55;
          ctx!.globalAlpha = 0.85;
          ctx!.drawImage(logo, bx - logoSize / 2, by - r * 0.35 - logoSize / 2, logoSize, logoSize);
          ctx!.globalAlpha = 1;
        }

        ctx!.fillStyle = '#fff';
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.shadowColor = 'rgba(0,0,0,0.6)';
        ctx!.shadowBlur = 3;

        // Shift text down if logo present
        const hasLogo = logo && logo.complete && logo.naturalWidth > 0;
        const textY = hasLogo ? by + r * 0.15 : by - r * 0.08;

        const symSize = Math.max(7, r * 0.28);
        ctx!.font = `800 ${symSize}px Verdana, Arial, sans-serif`;
        ctx!.fillText(stock.ticker, bx, textY);

        const chSize = Math.max(5, r * 0.2);
        ctx!.font = `700 ${chSize}px Verdana, Arial, sans-serif`;
        ctx!.fillStyle = 'rgba(255,255,255,0.85)';
        const sign = change > 0 ? '+' : '';
        ctx!.fillText(`${sign}${change.toFixed(1)}%`, bx, textY + r * 0.25);

        ctx!.shadowBlur = 0;
        ctx!.restore();
      }
    }

    // --- Preload stock logos ---
    const logoImages: Record<string, HTMLImageElement> = {};
    for (let i = 0; i < count; i++) {
      const ticker = stocks[i]!.ticker;
      const img = new Image();
      img.src = `https://finance.vietstock.vn/image/${ticker}`;
      logoImages[ticker] = img;
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
      // Recalculate radii for new screen size, then update physics
      initBuffersFromStocks(buffers, stocks, 0, 0, w, h);
      handleResize(physics, buffers, count, w, h);
    });
    observer.observe(parent);

    // --- Cleanup ---
    return () => {
      loop.stop();
      observer.disconnect();
      stateRef.current = null;
    };
  }, [stocks]);

  return (
    <div className="relative flex-1 overflow-hidden">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
