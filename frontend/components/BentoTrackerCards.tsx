'use client';

import React from 'react';
import { TaskItem } from '../lib/types';
import { CheckCircle2, Clock, Flame, ListTodo } from 'lucide-react';
import { AppTheme } from '../lib/settingsStorage';

interface BentoTrackerCardsProps {
  tasks: TaskItem[];
  theme?: AppTheme;
}

export const BentoTrackerCards: React.FC<BentoTrackerCardsProps> = ({
  tasks,
  theme = 'slate',
}) => {
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((t) => t.column === 'in_progress');
  const editingTasks = tasks.filter((t) => t.column === 'editing' || t.column === 'in_review');
  const doneTasks = tasks.filter((t) => t.column === 'done');

  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;
  const totalMinutes = tasks.reduce((acc, t) => acc + (t.time_box?.duration_minutes || 90), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const isDark = theme === 'midnight';

  const CARDS = [
    {
      id: 'total',
      title: 'Tổng công việc',
      metric: `${totalTasks}`,
      unit: 'việc',
      subtitle: `${totalHours}h đã lên lịch`,
      cardBg: 'bg-[#FFF1F2]',
      iconBg: isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-[#E11D48] text-white border-2 border-[#0F172A]',
      accentDot: 'bg-[#E11D48]',
      icon: ListTodo,
    },
    {
      id: 'progress',
      title: 'Đang thực hiện',
      metric: `${inProgressTasks.length}`,
      unit: 'ca',
      subtitle: inProgressTasks[0]?.title || 'Sẵn sàng bắt đầu ca mới',
      cardBg: 'bg-[#FEF9C3]',
      iconBg: isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-[#FACC15] text-[#0F172A] border-2 border-[#0F172A]',
      accentDot: 'bg-[#F59E0B]',
      icon: Flame,
    },
    {
      id: 'review',
      title: 'Chờ hoàn thiện',
      metric: `${editingTasks.length}`,
      unit: 'việc',
      subtitle: editingTasks[0]?.title || 'Không có việc tồn đọng',
      cardBg: 'bg-[#DBEAFE]',
      iconBg: isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-[#3B82F6] text-white border-2 border-[#0F172A]',
      accentDot: 'bg-[#3B82F6]',
      icon: Clock,
    },
    {
      id: 'done',
      title: 'Tỷ lệ hoàn thành',
      metric: `${completionRate}%`,
      unit: '',
      subtitle: `${doneTasks.length}/${totalTasks} việc đã xong`,
      cardBg: 'bg-[#DCFCE7]',
      iconBg: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#22C55E] text-[#0F172A] border-2 border-[#0F172A]',
      accentDot: 'bg-[#22C55E]',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
      {CARDS.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            className={`rounded-2xl px-3.5 py-2 border-2 flex items-center justify-between gap-3 transition-all select-none ${
              isDark
                ? 'bg-[#12151E] border-white/[0.08] hover:border-white/[0.16] text-slate-100'
                : 'bg-white border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${card.accentDot} shrink-0`} />
                <span
                  className={`text-[10.5px] font-bold uppercase tracking-wider truncate ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {card.title}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg sm:text-xl font-black tracking-tight tabular-nums">
                  {card.metric}
                </span>
                {card.unit && (
                  <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {card.unit}
                  </span>
                )}
              </div>

              <p
                className={`text-[10.5px] truncate mt-0.5 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {card.subtitle}
              </p>
            </div>

            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
              <IconComponent className="w-4 h-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
