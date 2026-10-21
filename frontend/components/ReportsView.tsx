'use client';

import React from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { TaskItem } from '../lib/types';
import { soundEngine } from '../lib/audio';

interface ReportsViewProps {
  tasks: TaskItem[];
  onBackToTracker: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ tasks, onBackToTracker }) => {
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.column === 'done');
  const inProgressTasks = tasks.filter((t) => t.column === 'in_progress');
  const draftTasks = tasks.filter((t) => t.column === 'draft' || t.column === 'todo');
  const editingTasks = tasks.filter((t) => t.column === 'editing' || t.column === 'in_review');

  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;
  const totalMinutes = tasks.reduce((acc, t) => acc + (t.time_box?.duration_minutes || 90), 0);
  const doneMinutes = doneTasks.reduce((acc, t) => acc + (t.time_box?.duration_minutes || 90), 0);

  // Day distribution (Mon -> Sun)
  const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const dayStats = daysOfWeek.map((dayName, index) => {
    const dayTasks = tasks.filter((t) => {
      const dIndex = typeof t.day_index === 'number' ? t.day_index : 1;
      return dIndex === index;
    });
    const completed = dayTasks.filter((t) => t.column === 'done').length;
    return {
      name: dayName,
      total: dayTasks.length,
      done: completed,
      pct: dayTasks.length > 0 ? Math.round((completed / dayTasks.length) * 100) : 0,
    };
  });

  // Priority distribution
  const p1Tasks = tasks.filter((t) => t.priority?.includes('1'));
  const p2Tasks = tasks.filter((t) => t.priority?.includes('2'));
  const p3Tasks = tasks.filter((t) => t.priority?.includes('3'));

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* 1. UNIFIED HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-[#EEF2F8] flex-wrap gap-3">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Không Gian Làm Việc / Báo Cáo
          </div>
          <h2 className="text-lg font-black text-[#1E293B] tracking-tight">
            Báo Cáo Năng Suất & Nhịp Làm Việc
          </h2>
          <p className="text-xs text-slate-500">
            Tổng hợp thời lượng Deep Work, phân bổ độ ưu tiên và nhịp độ hoàn tất mục tiêu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>7 ngày qua</span>
          </div>

          <button
            onClick={() => {
              soundEngine.playSoftClick();
              onBackToTracker();
            }}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lịch biểu</span>
          </button>
        </div>
      </div>

      {/* 2. UNIFIED 4-METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tổng Giờ Lập Lịch
          </div>
          <div className="text-2xl font-black text-[#1E293B] tracking-tight">
            {(totalMinutes / 60).toFixed(1)}h
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Tương đương {totalTasks} ca làm việc
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Đã Hoàn Tất
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            {(doneMinutes / 60).toFixed(1)}h
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {doneTasks.length} nhiệm vụ chốt xong
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Hiệu Suất Mục Tiêu
          </div>
          <div className="text-2xl font-black text-[#2563EB] tracking-tight">
            {completionRate}%
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Tỷ lệ hoàn thành nhiệm vụ
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Đang Xử Lý
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">
            {inProgressTasks.length + editingTasks.length} việc
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {inProgressTasks.length} đang làm · {editingTasks.length} đang duyệt
          </div>
        </div>
      </div>

      {/* 3. DETAILED ANALYTICS 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Priority Distribution */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-[#1E2433]">Phân Bổ Độ Ưu Tiên</h3>
              <p className="text-[11px] text-slate-400">Tỷ trọng các nhóm nhiệm vụ theo mức quan trọng</p>
            </div>
            <span className="text-xs font-bold text-slate-500">{totalTasks} công việc</span>
          </div>

          <div className="space-y-4 pt-1">
            {[
              {
                id: 'p1',
                label: 'P1 · Cốt Lõi',
                desc: 'Nhiệm vụ tối quan trọng, tác động trực tiếp',
                count: p1Tasks.length,
                color: '#AE445A', // Twilight Rose
              },
              {
                id: 'p2',
                label: 'P2 · Quan Trọng',
                desc: 'Hỗ trợ mục tiêu chiến lược, cần hoàn tất sớm',
                count: p2Tasks.length,
                color: '#F39F5A', // Sunset Amber
              },
              {
                id: 'p3',
                label: 'P3 · Tiêu Chuẩn',
                desc: 'Công việc vận hành thường quy, duy trì hệ thống',
                count: p3Tasks.length,
                color: '#235347', // Forest Emerald
              },
            ].map((p) => {
              const pct = totalTasks > 0 ? Math.round((p.count / totalTasks) * 100) : 0;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1E2433]">
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: p.color }}
                        className="w-2 h-2 rounded-full inline-block"
                      />
                      <span>{p.label}</span>
                    </div>
                    <span className="text-slate-500 font-semibold font-mono">
                      {p.count} việc ({pct}%)
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#F1F4FA] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: p.color }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workflow Status Distribution */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-[#1E2433]">Quy Trình & Trạng Thái</h3>
              <p className="text-[11px] text-slate-400">Tiến độ lưu chuyển công việc qua các giai đoạn</p>
            </div>
            <span className="text-xs font-bold text-slate-500">4 cột Kanban</span>
          </div>

          <div className="space-y-4 pt-1">
            {[
              {
                id: 'draft',
                label: 'Lên Kế Hoạch (Draft)',
                count: draftTasks.length,
                color: '#64748B',
              },
              {
                id: 'in_progress',
                label: 'Đang Thực Hiện (In Progress)',
                count: inProgressTasks.length,
                color: '#2563EB',
              },
              {
                id: 'editing',
                label: 'Đang Duyệt & Tinh Chỉnh (Editing)',
                count: editingTasks.length,
                color: '#D97706',
              },
              {
                id: 'done',
                label: 'Đã Hoàn Thành (Done)',
                count: doneTasks.length,
                color: '#10B981',
              },
            ].map((col) => {
              const pct = totalTasks > 0 ? Math.round((col.count / totalTasks) * 100) : 0;
              return (
                <div key={col.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1E2433]">
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: col.color }}
                        className="w-2 h-2 rounded-full inline-block"
                      />
                      <span>{col.label}</span>
                    </div>
                    <span className="text-slate-500 font-semibold font-mono">
                      {col.count} việc ({pct}%)
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#F1F4FA] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: col.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. WEEKLY RHYTHM BAR CHART */}
      <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h3 className="font-extrabold text-sm text-[#1E2433]">Nhịp Độ Công Việc Trong Tuần</h3>
            <p className="text-[11px] text-slate-400">Số lượng nhiệm vụ được phân bổ và hoàn thành theo từng ngày</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
              Tổng việc
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block" />
              Đã chốt xong
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-2 text-center">
          {dayStats.map((d) => (
            <div key={d.name} className="space-y-2 bg-[#FAFBFD] p-3 rounded-xl border border-slate-100">
              <div className="text-[11px] font-bold text-slate-500">{d.name}</div>
              <div className="h-20 flex items-end justify-center gap-1.5 py-1">
                {/* Total bar */}
                <div
                  className="w-3 bg-slate-200 rounded-t-sm transition-all"
                  style={{ height: `${Math.min(100, Math.max(12, d.total * 20))}%` }}
                  title={`Tổng số: ${d.total} việc`}
                />
                {/* Done bar */}
                <div
                  className="w-3 bg-[#2563EB] rounded-t-sm transition-all"
                  style={{ height: `${Math.min(100, Math.max(12, d.done * 20))}%` }}
                  title={`Hoàn thành: ${d.done} việc`}
                />
              </div>
              <div className="text-[10px] font-mono font-bold text-slate-700">
                {d.done}/{d.total}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
