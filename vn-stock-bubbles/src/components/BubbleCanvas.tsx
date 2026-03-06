import { useRef, useEffect, useMemo } from 'react';
import { useStockStore } from '../store/useStockStore';
import { useAppStore } from '../store/useAppStore';
import { createSimulationBuffers, initBuffersFromStocks, computeRadii } from '../simulation/state';
import type { SimulationBuffers } from '../simulation/state';
import {
  createPhysicsState,
  initialPlacement,
  stepPhysics,
  handleResize,
} from '../simulation/physics';
import type { PhysicsState } from '../simulation/physics';
import { createGameLoop } from '../simulation/gameLoop';
import type { StockData, Timeframe } from '../types/stock';

const TWO_PI = Math.PI * 2;

function getChange(stock: StockData, tf: Timeframe): number {
  switch (tf) {
    case 'day': return stock.changeDay;
    case 'week': return stock.changeWeek;
    case 'month': return stock.changeMonth;
    case 'year': return stock.changeYear;
  }
}

interface SimState {
  buffers: SimulationBuffers;
  physics: PhysicsState;
  count: number;
  loop: { start: () => void; stop: () => void };
}

export function BubbleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SimState | null>(null);
  const allStocks = useStockStore(s => s.stocks);
  const currentPage = useAppStore(s => s.currentPage);
  const stocks = useMemo(
    () => allStocks.slice(currentPage * 100, (currentPage + 1) * 100),
    [allStocks, currentPage],
  );

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

    // --- Pointer interaction state (plain vars, NOT React state) ---
    let hoveredIndex = -1;
    let dragState: {
      bubbleIndex: number;
      startTime: number;
      startX: number;
      startY: number;
      isDragging: boolean;
      lastX: number;
      lastY: number;
      lastTime: number;
      currentX: number;
      currentY: number;
    } | null = null;

    // --- Hit-test function ---
    function hitTest(px: number, py: number): number {
      // Reverse order = topmost bubble (last drawn) has priority
      for (let i = count - 1; i >= 0; i--) {
        const dx = px - buffers.x[i]!;
        const dy = py - buffers.y[i]!;
        const r = buffers.radius[i]!;
        if (dx * dx + dy * dy <= r * r) return i;
      }
      return -1;
    }

    // --- Pointer event handlers ---
    function onPointerDown(e: PointerEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const idx = hitTest(px, py);
      if (idx < 0) return;

      canvas!.setPointerCapture(e.pointerId);
      dragState = {
        bubbleIndex: idx,
        startTime: performance.now(),
        startX: px,
        startY: py,
        isDragging: false,
        lastX: px,
        lastY: py,
        lastTime: performance.now(),
        currentX: px,
        currentY: py,
      };
      canvas!.style.cursor = 'pointer';
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      if (!dragState) {
        // Hover hit-test for glow
        hoveredIndex = hitTest(px, py);
        canvas!.style.cursor = hoveredIndex >= 0 ? 'pointer' : 'default';
        return;
      }

      // Check displacement from start to decide if dragging
      const dx = px - dragState.startX;
      const dy = py - dragState.startY;
      if (!dragState.isDragging && Math.sqrt(dx * dx + dy * dy) > 5) {
        dragState.isDragging = true;
        canvas!.style.cursor = 'grabbing';
      }

      if (dragState.isDragging) {
        const idx = dragState.bubbleIndex;
        // Move bubble directly to pointer position
        buffers.x[idx] = px;
        buffers.y[idx] = py;
        // Zero velocity so physics doesn't fight the drag
        buffers.vx[idx] = 0;
        buffers.vy[idx] = 0;
        // Track last position/time for momentum calculation
        dragState.lastX = dragState.currentX;
        dragState.lastY = dragState.currentY;
        dragState.lastTime = performance.now();
        dragState.currentX = px;
        dragState.currentY = py;
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (!dragState) return;

      const elapsed = performance.now() - dragState.startTime;

      if (!dragState.isDragging && elapsed < 200) {
        // TAP: set selected stock in store
        const stock = stocks[dragState.bubbleIndex];
        if (stock) {
          useAppStore.getState().setSelectedStock(stock);
        }
        canvas!.style.cursor = 'pointer';
      } else if (dragState.isDragging) {
        // RELEASE: apply momentum (throw velocity)
        const rect = canvas!.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const dt = Math.max(1, performance.now() - dragState.lastTime);
        const throwVx = (px - dragState.lastX) / dt * 16; // Scale to per-frame
        const throwVy = (py - dragState.lastY) / dt * 16;
        const idx = dragState.bubbleIndex;
        buffers.vx[idx] = throwVx * 0.3; // Dampen throw
        buffers.vy[idx] = throwVy * 0.3;
        canvas!.style.cursor = 'pointer';
      }

      dragState = null;
    }

    function onPointerLeave() {
      hoveredIndex = -1;
      canvas!.style.cursor = 'default';
    }

    // Register pointer events with { passive: false } to prevent default browser drag
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);

    // --- Color helpers ---
    // RGB -> HSL
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

    // HSL -> RGB
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

    // massRatio: 0..1 where 1 = heaviest bubble -> bright neon, 0 = dim/dark
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

    // --- Color lerp: smooth color transitions on timeframe change ---
    const displayChange = new Float32Array(count);
    // Initialize to current timeframe values
    const initTf = useAppStore.getState().selectedTimeframe;
    for (let i = 0; i < count; i++) {
      displayChange[i] = getChange(stocks[i]!, initTf);
    }

    function animateColors() {
      const tf = useAppStore.getState().selectedTimeframe;
      for (let i = 0; i < count; i++) {
        const target = getChange(stocks[i]!, tf);
        const cur = displayChange[i]!;
        if (Math.abs(cur - target) > 0.01) {
          displayChange[i] = cur + (target - cur) * LERP_SPEED;
        } else {
          displayChange[i] = target;
        }
      }
    }

    // --- Render function ---
    let animTime = 0;
    function render() {
      const state = stateRef.current;
      if (!state) return;
      const { buffers: b, count: n } = state;
      animTime += 0.016;

      // Read current UI state (cheap synchronous call every frame)
      const { searchQuery, selectedStock } = useAppStore.getState();
      const query = searchQuery.trim().toUpperCase();
      const hasSearch = query.length > 0;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Dark background
      ctx!.fillStyle = '#222222';
      ctx!.fillRect(0, 0, w, h);

      // Find max mass for neon scaling
      let maxMass = 0;
      for (let i = 0; i < n; i++) { if (b.mass[i]! > maxMass) maxMass = b.mass[i]!; }

      // Draw all bubbles -- translucent glass orb style
      for (let i = 0; i < n; i++) {
        const bx = b.x[i]!;
        const by = b.y[i]!;
        const r = b.radius[i]!;
        const stock = stocks[i]!;
        // Use displayChange for smooth color/text animation
        const change = displayChange[i]!;
        const abs = Math.abs(change);

        // Search: dim non-matching bubbles
        const isMatch = !hasSearch || stock.ticker.includes(query) || stock.companyName.toUpperCase().includes(query);
        const dimAlpha = hasSearch ? (isMatch ? 1 : 0.12) : 1;
        ctx!.globalAlpha = dimAlpha;
        const massRatio = maxMass > 0 ? b.mass[i]! / maxMass : 0;
        const color = getBubbleColor(change, massRatio);
        const centerColor = getCenterColor(color);
        const edgeColor = getEdgeColor(color);

        // Hover and selected state
        const isHovered = (i === hoveredIndex);
        const isSelected = selectedStock !== null && stock.ticker === selectedStock.ticker;
        const isHighlighted = isHovered || isSelected;

        // Glow intensity based on % change (threshold 1%)
        const baseGlowT = abs > 1 ? Math.min((abs - 1) / 11, 1) : 0;
        const glowT = isHighlighted ? Math.max(baseGlowT, 0.8) : baseGlowT;
        const breathe = isHighlighted
          ? 1 - 0.25 + 0.25 * Math.sin(animTime * 3.5 + i * 0.3)   // Faster, stronger pulse
          : 1 - 0.15 + 0.15 * Math.sin(animTime * 1.9 + i * 0.3);

        // -- 1. SOFT OUTER GLOW (hazy aura, no hard edge) --
        if (glowT > 0) {
          const spread = isHighlighted ? 48 : 32;
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

        // -- 2. OUTLINE (soft feathered ring via radial gradient) --
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

        // -- 3. TRANSLUCENT FILL (bright center -> transparent edge) --
        const fillGrad = ctx!.createRadialGradient(bx, by, 0, bx, by, r);
        fillGrad.addColorStop(0, `rgba(${centerColor.r}, ${centerColor.g}, ${centerColor.b}, 0.25)`);
        fillGrad.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`);
        fillGrad.addColorStop(1, `rgba(${edgeColor.r}, ${edgeColor.g}, ${edgeColor.b}, 0.05)`);

        ctx!.beginPath();
        ctx!.arc(bx, by, r, 0, TWO_PI);
        ctx!.fillStyle = fillGrad;
        ctx!.fill();

        // -- Glass rim -- thin bright ring at edge (soap bubble reflection) --
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

        // -- 4. 3D HIGHLIGHT (glassy specular) --
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

        // -- 5. LOGO + TEXT --
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

        // Reset alpha for next bubble
        ctx!.globalAlpha = 1;
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

    // --- Radius animation: lerp toward targetRadius each physics tick ---
    const LERP_SPEED = 0.07; // ~7% per frame -> smooth ~0.5s transition
    let lastTimeframe: Timeframe = useAppStore.getState().selectedTimeframe;

    function updateRadiiTargets(tf: Timeframe) {
      const absChanges = [];
      for (let i = 0; i < count; i++) {
        absChanges.push(Math.abs(getChange(stocks[i]!, tf)));
      }
      computeRadii(buffers.targetRadius, absChanges, w, h);
    }

    function animateRadii() {
      for (let i = 0; i < count; i++) {
        const cur = buffers.radius[i]!;
        const tgt = buffers.targetRadius[i]!;
        if (Math.abs(cur - tgt) > 0.1) {
          buffers.radius[i] = cur + (tgt - cur) * LERP_SPEED;
          buffers.mass[i] = buffers.radius[i]! * buffers.radius[i]!;
        }
      }
    }

    // --- Game loop ---
    const loop = createGameLoop(
      (dt, time) => {
        // Detect timeframe change and recompute targets
        const tf = useAppStore.getState().selectedTimeframe;
        if (tf !== lastTimeframe) {
          lastTimeframe = tf;
          updateRadiiTargets(tf);
        }
        animateRadii();
        animateColors();
        stepPhysics(physics, buffers, count, dt, time);

        // Drag exclusion: after physics step, re-pin dragged bubble to pointer
        if (dragState && dragState.isDragging) {
          const idx = dragState.bubbleIndex;
          buffers.x[idx] = dragState.currentX;
          buffers.y[idx] = dragState.currentY;
          buffers.vx[idx] = 0;
          buffers.vy[idx] = 0;
        }
      },
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
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      stateRef.current = null;
    };
  }, [stocks]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="block touch-none" />
    </div>
  );
}
