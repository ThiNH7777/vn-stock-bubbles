import { useRef, useEffect, useCallback } from 'react';

function drawTestBubble(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  // Base blue circle (VN positive convention)
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'hsl(210, 60%, 35%)';

  // Glow border
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = 'rgba(50, 130, 255, 0.4)';
  ctx.fill();
  ctx.restore();

  // 3D sphere radial gradient overlay
  const grad = ctx.createRadialGradient(
    cx - r * 0.18,
    cy - r * 0.22,
    r * 0.05,
    cx,
    cy,
    r,
  );
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
  grad.addColorStop(0.6, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Ticker label "VNM"
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px Verdana, Arial, sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 3;
  ctx.fillText('VNM', cx, cy - 6);
  ctx.shadowBlur = 0;

  // Percentage label "+2.5%"
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = 'bold 13px Verdana, Arial, sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 2;
  ctx.fillText('+2.5%', cx, cy + 14);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function renderCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) {
  const parent = canvas.parentElement;
  if (!parent) return;

  const w = parent.clientWidth;
  const h = parent.clientHeight;
  const dpr = window.devicePixelRatio || 1;

  // HiDPI scaling
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Dark background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, w, h);

  // Test bubble centered
  const bubbleRadius = 60;
  drawTestBubble(ctx, w / 2, h / 2, bubbleRadius);
}

export function BubbleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderCanvas(canvas, ctx);
  }, []);

  useEffect(() => {
    draw();

    // ResizeObserver on parent for responsive redraw
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      draw();
    });
    observer.observe(parent);

    return () => {
      observer.disconnect();
    };
  }, [draw]);

  return (
    <div className="relative flex-1 overflow-hidden">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
