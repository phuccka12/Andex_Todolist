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
      iconBg: isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600',
      accentDot: 'bg-indigo-500',
      icon: ListTodo,
    },
    {
      id: 'progress',
      title: 'Đang thực hiện',
      metric: `${inProgressTasks.length}`,
      unit: 'ca',
      subtitle: inProgressTasks[0]?.title || 'Sẵn sàng bắt đầu ca mới',
      iconBg: isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600',
      accentDot: 'bg-sky-500',
      icon: Flame,
    },
    {
      id: 'review',
      title: 'Chờ hoàn thiện',
      metric: `${editingTasks.length}`,
      unit: 'việc',
      subtitle: editingTasks[0]?.title || 'Không có việc tồn đọng',
      iconBg: isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600',
      accentDot: 'bg-amber-500',
      icon: Clock,
    },
    {
      id: 'done',
      title: 'Tỷ lệ hoàn thành',
      metric: `${completionRate}%`,
      unit: '',
      subtitle: `${doneTasks.length}/${totalTasks} việc đã xong`,
      iconBg: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
      accentDot: 'bg-emerald-500',
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
            className={`rounded-xl px-3.5 py-2.5 border flex items-center justify-between gap-3 transition-all select-none ${
              isDark
                ? 'bg-[#12151E] border-white/[0.08] hover:border-white/[0.16] text-slate-100'
                : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-900 shadow-2xs'
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
