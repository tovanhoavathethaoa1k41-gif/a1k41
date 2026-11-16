import React, { useEffect, useRef } from 'react';

interface Mote {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  twinkle: number;
}

/**
 * Hiệu ứng nhẹ cho tab Quả Bóng Vàng: những hạt bụi vàng lấp lánh bay chậm lên trên.
 */
export const GoldenDustOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const count = Math.min(36, Math.max(14, Math.floor(width / 40)));
    const motes: Mote[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.6,
      speed: Math.random() * 0.35 + 0.12,
      drift: Math.random() * 0.3 - 0.15,
      phase: Math.random() * Math.PI * 2,
      twinkle: Math.random() * 0.03 + 0.01
    }));

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      t += 1;
      for (const m of motes) {
        m.y -= m.speed;
        m.x += m.drift + Math.sin(t * 0.01 + m.phase) * 0.15;
        if (m.y < -6) {
          m.y = height + 6;
          m.x = Math.random() * width;
        }
        if (m.x < -6) m.x = width + 6;
        if (m.x > width + 6) m.x = -6;
        const alpha = 0.15 + 0.45 * (0.5 + 0.5 * Math.sin(t * m.twinkle + m.phase));
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 208, 90, ${alpha})`;
        ctx.shadowColor = 'rgba(234, 179, 8, 0.7)';
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw();
      cancelAnimationFrame(raf);
    } else {
      draw();
    }

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-yellow-600/10 via-transparent to-transparent" />
    </div>
  );
};
