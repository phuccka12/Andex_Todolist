'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Flame, Plus, Trash2, Award, Sparkles } from 'lucide-react';
import { soundEngine } from '../lib/audio';
import confetti from 'canvas-confetti';

interface Habit {
  id: string;
  name: string;
  icon: string;
  completed: boolean;
  streak: number;
}

const DEFAULT_HABITS: Habit[] = [
  { id: 'h1', name: 'Uống đủ 2L nước lọc', icon: '💧', completed: true, streak: 14 },
  { id: 'h2', name: 'Đọc tài liệu chuyên sâu 30 phút', icon: '📖', completed: true, streak: 8 },
  { id: 'h3', name: 'Vận động thể chất / Đi dạo 20 phút', icon: '🏃', completed: false, streak: 5 },
  { id: 'h4', name: 'Hoàn thành 2 ca Pomodoro Deep Work', icon: '💻', completed: true, streak: 12 },
  { id: 'h5', name: 'Tắt màn hình & Ngủ trước 23:00', icon: '🌙', completed: false, streak: 3 },
];

interface HabitTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HabitTrackerModal: React.FC<HabitTrackerModalProps> = ({ isOpen, onClose }) => {
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [newHabitName, setNewHabitName] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chrono_habits_v1');
      if (saved) {
        setHabits(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveHabits = (newHabits: Habit[]) => {
    setHabits(newHabits);
    try {
      localStorage.setItem('chrono_habits_v1', JSON.stringify(newHabits));
    } catch {}
  };

  const handleToggleHabit = (id: string) => {
    soundEngine.playSoftClick();
    const updated = habits.map((h) => {
      if (h.id === id) {
        const nextState = !h.completed;
        if (nextState) {
          soundEngine.playPentatonicChime(3);
          try {
            if (typeof window !== 'undefined') {
              confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
            }
          } catch {}
        }
        return {
          ...h,
          completed: nextState,
          streak: nextState ? h.streak + 1 : Math.max(0, h.streak - 1),
        };
      }
      return h;
    });
    saveHabits(updated);
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: `h_${Date.now()}`,
      name: newHabitName.trim(),
      icon: '✨',
      completed: false,
      streak: 0,
    };
    saveHabits([...habits, newHabit]);
    setNewHabitName('');
    soundEngine.playSoftClick();
  };

  const handleDeleteHabit = (id: string) => {
    saveHabits(habits.filter((h) => h.id !== id));
    soundEngine.playSoftClick();
  };

  if (!isOpen) return null;

  const completedCount = habits.filter((h) => h.completed).length;
  const progressPercent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-[#EEF2F8] animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#EEF2F8]">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF6DF] text-[#F59E0B] flex items-center justify-center font-bold shadow-xs">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#1E2433]">Theo Dõi Thói Quen (Habit Tracker)</h3>
            <p className="text-[10px] text-[#8F9CAE]">Duy trì kỷ luật hàng ngày & chuỗi ngày streak</p>
          </div>
        </div>

        {/* Daily Progress */}
        <div className="bg-[#FAFBFD] p-3.5 rounded-2xl border border-[#EEF2F8] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#1E2433]">Tiến độ hôm nay</span>
            <span className="text-[#3B82F6]">{completedCount}/{habits.length} thói quen ({progressPercent}%)</span>
          </div>
          <div className="w-full h-2 bg-[#EEF2F8] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#3B82F6] to-[#10B981] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Habits List */}
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {habits.map((habit) => (
            <div
              key={habit.id}
              onClick={() => handleToggleHabit(habit.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                habit.completed
                  ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                  : 'bg-white border-[#E2E8F0] hover:border-[#3B82F6]'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="text-base shrink-0">{habit.icon}</span>
                <span
                  className={`text-xs font-bold truncate ${
                    habit.completed ? 'line-through text-slate-400' : 'text-[#1E2433]'
                  }`}
                >
                  {habit.name}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5 fill-amber-500" />
                  <span>{habit.streak} ngày</span>
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteHabit(habit.id);
                  }}
                  className="text-slate-300 hover:text-rose-500 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add new habit input */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#EEF2F8]">
          <input
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="Thêm thói quen mới..."
            onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
            className="flex-1 px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E2433] focus:outline-none focus:border-[#3B82F6]"
          />
          <button
            onClick={handleAddHabit}
            className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
};
