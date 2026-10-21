'use client';

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

const MASCOT_QUOTES = [
  'Uống một ngụm nước ấm sau 45 phút tập trung sâu.',
  'Mỗi tiêu chí nghiệm thu hoàn tất là một bước tiến vững chắc.',
  'Thời gian không mất đi, nó được chuyển hóa vào sản phẩm của bạn.',
  'Giữ nhịp thở đều đặn và sự chú tâm trọn vẹn vào khối thời gian hiện tại.',
];

export const MascotNala: React.FC = () => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const nextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % MASCOT_QUOTES.length);
  };

  return (
    <div className="atelier-surface rounded-2xl p-4 space-y-2.5 border border-white/[0.06]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Nhắc Nhở Tĩnh Tâm</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
        </div>

        <button
          onClick={nextQuote}
          className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title="Đổi câu nói"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <p className="text-xs text-slate-400 italic leading-relaxed pl-2 border-l border-white/[0.08]">
        &ldquo;{MASCOT_QUOTES[quoteIndex]}&rdquo;
      </p>
    </div>
  );
};
