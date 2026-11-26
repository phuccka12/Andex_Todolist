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
    <div className="hidden md:flex fixed bottom-6 right-6 z-40 flex-col items-end pointer-events-none select-none">
      {/* Friendly Gencoore AI Trigger */}
      <button
        onClick={() => {
          soundEngine.playPentatonicChime(4);
          onOpen();
        }}
        className="pointer-events-auto group relative flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-2xl bg-white/95 hover:bg-white text-slate-800 shadow-xl shadow-indigo-950/10 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-200 border border-indigo-100 cursor-pointer backdrop-blur-md"
        title="Mở Trợ lý Gencoore AI"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4F46E5] via-[#7C3AED] to-[#EC4899] flex items-center justify-center text-white shadow-sm">
            <Bot className="w-4 h-4 text-white group-hover:rotate-6 transition-transform duration-200" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border-2 border-white"></span>
          </span>
        </div>

        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold tracking-tight text-slate-900">
              Gencoore AI
            </span>
            <Sparkles className="w-3 h-3 text-pink-500" />
          </div>
          <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
            Trợ lý lịch trình thân thiện
          </span>
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform hidden sm:block" />
      </button>
    </div>
  );
};
