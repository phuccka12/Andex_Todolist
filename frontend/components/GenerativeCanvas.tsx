'use client';

import React, { useEffect, useRef } from 'react';
import { Download } from 'lucide-react';

interface GenerativeCanvasProps {
  completedHours: number;
  haikuPoem?: string;
}

export const GenerativeCanvas: React.FC<GenerativeCanvasProps> = ({
  completedHours = 4.5,
  haikuPoem = `Mưa rơi ngoài khung kính,\nNét code đọng trang hồ,\nThời gian hóa dòng thơ.`,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 180;

    // Dark architectural canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0B0F19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid coordinates
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 20; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Elegant generative concentric resonance rings (Teenage Engineering style)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const rings = Math.min(12, Math.floor(completedHours * 2) + 3);

    for (let i = 1; i <= rings; i++) {
      ctx.beginPath();
      const radius = i * 7 + Math.sin(i) * 2;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = i === rings
        ? 'rgba(29, 185, 84, 0.6)'
        : `rgba(255, 255, 255, ${0.04 + (i / rings) * 0.08})`;
      ctx.lineWidth = i === rings ? 1.5 : 1;
      ctx.stroke();
    }

    // Center focal point
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1DB954';
    ctx.fill();
  }, [completedHours]);

  return (
    <div className="atelier-surface rounded-2xl p-5 space-y-4 border border-white/[0.06]">
      {/* Module Title */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            Sóng Tập Trung
          </span>
          <h2 className="text-xs font-semibold text-slate-200 mt-0.5">
            Tần Số Hoạt Động
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06]">
          {completedHours}h TÍCH LŨY
        </span>
      </div>

      {/* Minimalist Canvas Display */}
      <div className="relative rounded-xl overflow-hidden border border-white/[0.05] group">
        <canvas ref={canvasRef} className="w-full h-36 object-cover" />
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const link = document.createElement('a');
              link.download = 'cbp-frequency.png';
              link.href = canvas.toDataURL();
              link.click();
            }}
            className="p-1.5 bg-black/60 hover:bg-black/90 text-slate-300 rounded-md border border-white/10"
            title="Xuất tần số"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Zen Haiku Poem Box with generous breathing room */}
      <div className="pt-2 border-t border-white/[0.04]">
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2">
          Zen Haiku
        </p>
        <div className="space-y-1.5 font-serif italic text-xs text-slate-300 leading-[1.8] pl-2 border-l border-white/[0.1]">
          {haikuPoem.split('\n').map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
};
