'use client';

import React from 'react';
import { Bot, Sparkles, ChevronRight } from 'lucide-react';
import { soundEngine } from '../lib/audio';

interface FloatingAiWidgetProps {
  isOpen: boolean;
  onOpen: () => void;
}

export const FloatingAiWidget: React.FC<FloatingAiWidgetProps> = ({
  isOpen,
  onOpen,
}) => {
  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-none select-none">
      {/* Refined Atelier Executive Capsule Trigger */}
      <button
        onClick={() => {
          soundEngine.playPentatonicChime(4);
          onOpen();
        }}
        className="pointer-events-auto group relative flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-2xl bg-[#1E293B] hover:bg-[#0F172A] text-white shadow-xl shadow-slate-900/15 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-200 border border-slate-700/60 cursor-pointer"
        title="Mở Trợ lý Atelier Concierge"
      >
        {/* Icon with online status dot */}
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10">
            <Bot className="w-4 h-4 text-sky-400 group-hover:rotate-6 transition-transform duration-200" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
        </div>

        {/* Text Label */}
        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold tracking-tight text-white">
              Atelier Concierge
            </span>
            <Sparkles className="w-3 h-3 text-amber-300" />
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Điều hành lịch & Quét slot trống
          </span>
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform hidden sm:block" />
      </button>
    </div>
  );
};
