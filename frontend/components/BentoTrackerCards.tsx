'use client';

import React from 'react';
import { TaskItem } from '../lib/types';
import { CheckCircle2, Clock, Flame, ListTodo } from 'lucide-react';

interface BentoTrackerCardsProps {
  tasks: TaskItem[];
}

export const BentoTrackerCards: React.FC<BentoTrackerCardsProps> = ({ tasks }) => {
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((t) => t.column === 'in_progress');
  const editingTasks = tasks.filter((t) => t.column === 'editing' || t.column === 'in_review');
  const doneTasks = tasks.filter((t) => t.column === 'done');

  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;
  const totalMinutes = tasks.reduce((acc, t) => acc + (t.time_box?.duration_minutes || 90), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const CARDS = [
    {
      id: 'total',
      title: 'Tổng công việc',
      metric: `${totalTasks} Tasks`,
      subtitle: `${totalHours} giờ được lập lịch`,
      gradient: 'from-[#6C5CE7] to-[#8E7CFF]',
      icon: ListTodo,
    },
    {
      id: 'progress',
      title: 'Đang tập trung',
      metric: `${inProgressTasks.length} Đang làm`,
      subtitle: inProgressTasks[0]?.title || 'Sẵn sàng bắt đầu ca mới',
      gradient: 'from-[#3B82F6] to-[#60A5FA]',
      icon: Flame,
    },
    {
      id: 'review',
      title: 'Chờ duyệt / Hoàn thiện',
      metric: `${editingTasks.length} Đang duyệt`,
      subtitle: editingTasks[0]?.title || 'Không có task nghẽn',
      gradient: 'from-[#F59E0B] to-[#FBBF24]',
      icon: Clock,
    },
    {
      id: 'done',
      title: 'Tỉ lệ hoàn thành',
      metric: `${completionRate}% Đạt được`,
      subtitle: `${doneTasks.length} việc đã chốt xong`,
      gradient: 'from-[#F43F5E] to-[#FB7185]',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0">
      {CARDS.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            className={`bg-gradient-to-r ${card.gradient} rounded-2xl p-3.5 flex flex-col justify-between text-white shadow-xs hover:shadow-md transition-all transform hover:-translate-y-0.5 select-none`}
          >
            {/* Top row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-white/90 tracking-wide uppercase">
                {card.title}
              </span>
              <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <IconComponent className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Bottom metrics */}
            <div>
              <h3 className="font-extrabold text-base tracking-tight">{card.metric}</h3>
              <p className="text-[11px] text-white/90 mt-0.5 line-clamp-1 font-medium">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
