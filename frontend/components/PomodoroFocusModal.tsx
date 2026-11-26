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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFDF7] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-[6px_6px_0px_#0F172A] relative border-2 border-[#0F172A] animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] hover:bg-[#FFE4E6] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-3 border-b-2 border-[#0F172A]/15">
          <div className="w-10 h-10 rounded-2xl bg-[#FFE4E6] border-2 border-[#0F172A] text-[#E11D48] flex items-center justify-center font-bold shadow-[2px_2px_0px_#0F172A]">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm text-[#0F172A]">Đồng Hồ Pomodoro Deep Work</h3>
            <p className="text-[10px] text-slate-600 font-bold">Duy trì sự tập trung cao độ theo phiên 25 phút</p>
          </div>
        </div>

        {/* Mode Pills */}
        <div className="flex bg-[#FFF1F2] p-1.5 rounded-2xl border-2 border-[#0F172A] gap-1 text-xs font-black text-[#0F172A]">
          <button
            onClick={() => switchMode('focus')}
            className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
              mode === 'focus'
                ? 'bg-[#E11D48] text-white border border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                : 'hover:bg-white/70 text-[#0F172A]'
            }`}
          >
            Tập trung (25p)
          </button>
          <button
            onClick={() => switchMode('short_break')}
            className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
              mode === 'short_break'
                ? 'bg-[#DCFCE7] text-[#0F172A] border border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                : 'hover:bg-white/70 text-[#0F172A]'
            }`}
          >
            Nghỉ ngắn (5p)
          </button>
          <button
            onClick={() => switchMode('long_break')}
            className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
              mode === 'long_break'
                ? 'bg-[#FEF9C3] text-[#0F172A] border border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                : 'hover:bg-white/70 text-[#0F172A]'
            }`}
          >
            Nghỉ dài (15p)
          </button>
        </div>

        {/* Central Timer Card */}
        <div className="bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] rounded-3xl p-6 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-[#0F172A] tracking-tighter font-mono">
            {formattedTime}
          </span>
          <span className="px-3 py-0.5 rounded-full bg-[#FFF1F2] border border-[#0F172A] text-[10px] font-black text-[#E11D48] uppercase tracking-wider mt-2">
            {mode === 'focus' ? 'Đang tập trung' : 'Đang nghỉ ngơi'}
          </span>
          <div className="w-full h-2.5 bg-[#FFF1F2] border border-[#0F172A] rounded-full overflow-hidden mt-4">
            <div
              className="h-full bg-[#E11D48] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Selected Task Focus */}
        <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
          <span className="text-[10px] font-black text-[#0F172A] flex items-center gap-1.5 uppercase tracking-wide">
            <Target className="w-3.5 h-3.5 text-[#E11D48]" />
            <span>Mục tiêu phiên này:</span>
          </span>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none"
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black text-[#0F172A]">
            <span>🍅 Đã chốt:</span>
            <span className="text-[#E11D48]">{completedSessions} phiên</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2.5 rounded-xl bg-white hover:bg-[#FEF9C3] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black transition-all cursor-pointer"
              title="Đặt lại thời gian"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleStartPause}
              className="px-5 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:translate-y-0.5"
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
