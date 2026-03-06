import { useRef, useEffect, useState, useCallback } from 'react';
import { fetchStockHistory } from '../api/stockApi';

interface DetailChartProps {
  ticker: string;
}

interface ChartData {
  closes: number[];
  highs: number[];
  lows: number[];
  timestamps: number[];
}

export function DetailChart({ ticker }: DetailChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch data when ticker changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setData(null);

    fetchStockHistory(ticker).then((result) => {
      if (cancelled) return;
      if (!result || result.c.length === 0) {
        setError(true);
        setLoading(false);
        return;
      }
      setData({
        closes: result.c,
        highs: result.h,
        lows: result.l,
        timestamps: result.t,
      });
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [ticker]);

  // Draw chart on canvas
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = parent.clientWidth;
    const displayH = 180;

    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { closes } = data;
    if (closes.length < 2) return;

    // Chart area with padding
    const padLeft = 8;
    const padRight = 8;
    const padTop = 24;
    const padBottom = 24;
    const chartW = displayW - padLeft - padRight;
    const chartH = displayH - padTop - padBottom;

    // Find min/max
    let min = Infinity;
    let max = -Infinity;
    let minIdx = 0;
    let maxIdx = 0;
    for (let i = 0; i < closes.length; i++) {
      if (closes[i]! < min) { min = closes[i]!; minIdx = i; }
      if (closes[i]! > max) { max = closes[i]!; maxIdx = i; }
    }
    const range = max - min || 1;

    // Helper to get x/y for a data point
    const getX = (i: number) => padLeft + (i / (closes.length - 1)) * chartW;
    const getY = (val: number) => padTop + chartH - ((val - min) / range) * chartH;

    // Clear
    ctx.clearRect(0, 0, displayW, displayH);

    // Overall direction
    const overallUp = closes[closes.length - 1]! >= closes[0]!;
    const lineColor = overallUp ? '#22ec6c' : '#ff4336';

    // Draw filled area under line
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + chartH); // bottom-left
    for (let i = 0; i < closes.length; i++) {
      ctx.lineTo(getX(i), getY(closes[i]!));
    }
    ctx.lineTo(padLeft + chartW, padTop + chartH); // bottom-right
    ctx.closePath();

    // Gradient fill
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    grad.addColorStop(0, lineColor + '40');
    grad.addColorStop(1, lineColor + '08');
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw line on top
    ctx.beginPath();
    for (let i = 0; i < closes.length; i++) {
      const px = getX(i);
      const py = getY(closes[i]!);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // High/Low markers
    const markerRadius = 3;
    const formatPrice = (p: number) => p >= 1000
      ? (p / 1000).toFixed(1) + 'k'
      : p.toFixed(1);

    // High marker
    const hx = getX(maxIdx);
    const hy = getY(max);
    ctx.beginPath();
    ctx.arc(hx, hy, markerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#22ec6c';
    ctx.fill();
    ctx.font = '600 10px Verdana, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = maxIdx > closes.length * 0.7 ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    const hLabel = `H: ${formatPrice(max)}`;
    ctx.fillText(hLabel, hx + (maxIdx > closes.length * 0.7 ? -6 : 6), hy - 5);

    // Low marker
    const lx = getX(minIdx);
    const ly = getY(min);
    ctx.beginPath();
    ctx.arc(lx, ly, markerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4336';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = minIdx > closes.length * 0.7 ? 'right' : 'left';
    ctx.textBaseline = 'top';
    const lLabel = `L: ${formatPrice(min)}`;
    ctx.fillText(lLabel, lx + (minIdx > closes.length * 0.7 ? -6 : 6), ly + 5);

    // Y-axis labels (min/max)
    ctx.font = '500 9px Verdana, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(formatPrice(max), padLeft, padTop - 16);
    ctx.textBaseline = 'bottom';
    ctx.fillText(formatPrice(min), padLeft, padTop + chartH + 16);
  }, [data]);

  // Redraw on data change and resize
  useEffect(() => {
    if (!data) return;
    drawChart();

    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => drawChart());
    observer.observe(parent);
    return () => observer.disconnect();
  }, [data, drawChart]);

  if (loading) {
    return (
      <div className="flex h-[180px] items-center justify-center">
        <span className="text-xs text-white/40">Loading chart...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[180px] items-center justify-center">
        <span className="text-xs text-white/30">Chart unavailable</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <canvas ref={canvasRef} className="block w-full" />
    </div>
  );
}
