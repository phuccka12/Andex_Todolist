'use client';

import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Flame, CheckCircle2, Target, Volume2 } from 'lucide-react';
import { TaskItem } from '../lib/types';
import { soundEngine } from '../lib/audio';
import confetti from 'canvas-confetti';

interface PomodoroFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
}

export const PomodoroFocusModal: React.FC<PomodoroFocusModalProps> = ({
  isOpen,
  onClose,
  tasks,
}) => {
  const [mode, setMode] = useState<'focus' | 'short_break' | 'long_break'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
  const [completedSessions, setCompletedSessions] = useState(2);

  // Mode durations in seconds
  const durations = {
    focus: 25 * 60,
    short_break: 5 * 60,
    long_break: 15 * 60,
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      soundEngine.playPentatonicChime(4);
      if (mode === 'focus') {
        setCompletedSessions((prev) => prev + 1);
        try {
          if (typeof window !== 'undefined') {
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
          }
        } catch {}
        setMode('short_break');
        setTimeLeft(durations.short_break);
      } else {
        setMode('focus');
        setTimeLeft(durations.focus);
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode]);

  const switchMode = (newMode: 'focus' | 'short_break' | 'long_break') => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(durations[newMode]);
    soundEngine.playSoftClick();
  };

  const toggleStartPause = () => {
    soundEngine.playSoftClick();
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    soundEngine.playSoftClick();
    setIsRunning(false);
    setTimeLeft(durations[mode]);
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalDuration = durations[mode];
  const progressPercent = Math.round(((totalDuration - timeLeft) / totalDuration) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] max-w-md w-full p-6 space-y-5 shadow-2xl relative border border-[#EEF2F8] animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#EEF2F8]">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF1F2] text-[#F43F5E] flex items-center justify-center font-bold shadow-xs">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#1E2433]">Đồng Hồ Pomodoro Deep Work</h3>
            <p className="text-[10px] text-[#8F9CAE]">Duy trì sự tập trung cao độ theo phiên 25 phút</p>
          </div>
        </div>

        {/* Mode Pills */}
        <div className="flex bg-[#F4F6FA] p-1 rounded-full text-xs font-bold text-[#8F9CAE]">
          <button
            onClick={() => switchMode('focus')}
            className={`flex-1 py-1.5 rounded-full transition-all ${
              mode === 'focus' ? 'bg-[#F43F5E] text-white shadow-xs' : 'hover:text-[#1E2433]'
            }`}
          >
            Tập trung (25p)
          </button>
          <button
            onClick={() => switchMode('short_break')}
            className={`flex-1 py-1.5 rounded-full transition-all ${
              mode === 'short_break' ? 'bg-[#10B981] text-white shadow-xs' : 'hover:text-[#1E2433]'
            }`}
          >
            Nghỉ ngắn (5p)
          </button>
          <button
            onClick={() => switchMode('long_break')}
            className={`flex-1 py-1.5 rounded-full transition-all ${
              mode === 'long_break' ? 'bg-[#3B82F6] text-white shadow-xs' : 'hover:text-[#1E2433]'
            }`}
          >
            Nghỉ dài (15p)
          </button>
        </div>

        {/* Big Circular Counter */}
        <div className="relative py-4 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 rounded-full border-8 border-[#F1F4FA] flex items-center justify-center bg-gradient-to-b from-[#FAFBFD] to-white shadow-inner">
            <div className="text-center">
              <span className="text-4xl font-black text-[#1E2433] tracking-tighter font-mono">
                {formattedTime}
              </span>
              <p className="text-[10px] font-bold text-[#8F9CAE] uppercase tracking-wider mt-1">
                {mode === 'focus' ? 'Đang tập trung' : 'Đang nghỉ ngơi'}
              </p>
            </div>
          </div>
        </div>

        {/* Selected Task Focus */}
        <div className="space-y-1.5 bg-[#F8FAFD] p-3 rounded-2xl border border-[#EEF2F8]">
          <span className="text-[10px] font-bold text-[#8F9CAE] flex items-center gap-1 uppercase tracking-wide">
            <Target className="w-3 h-3 text-[#3B82F6]" />
            <span>Mục tiêu phiên này:</span>
          </span>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full bg-white border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#1E2433] focus:outline-none focus:border-[#3B82F6]"
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.priority})
              </option>
            ))}
          </select>
        </div>

        {/* Control Buttons & Sessions Counter */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#64748B]">
            <span>🍅 Đã chốt:</span>
            <span className="text-[#F43F5E]">{completedSessions} phiên</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2.5 rounded-full text-[#8F9CAE] hover:text-[#1E2433] hover:bg-[#F4F6FA] border border-[#E2E8F0] transition-colors"
              title="Đặt lại thời gian"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleStartPause}
              className={`px-5 py-2.5 rounded-full text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95 ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-[#F43F5E] hover:bg-rose-600'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Tạm Dừng</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Bắt Đầu Phiên</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
