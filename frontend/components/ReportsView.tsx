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
      <div className="flex items-center justify-between pb-4 border-b-2 border-[#0F172A] flex-wrap gap-3">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-[#E11D48] uppercase tracking-widest">
            Không Gian Làm Việc / Báo Cáo
          </div>
          <h2 className="text-lg font-black text-[#0F172A] tracking-tight">
            Báo Cáo Năng Suất & Nhịp Làm Việc
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Tổng hợp thời lượng Deep Work, phân bổ độ ưu tiên và nhịp độ hoàn tất mục tiêu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF1F2] text-[#0F172A] text-xs font-extrabold rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]">
            <Calendar className="w-3.5 h-3.5 text-[#E11D48]" />
            <span>7 ngày qua</span>
          </div>

          <button
            onClick={() => {
              soundEngine.playSoftClick();
              onBackToTracker();
            }}
            className="px-3.5 py-1.5 bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] text-xs font-black rounded-xl border-2 border-[#0F172A] transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#0F172A] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lịch biểu</span>
          </button>
        </div>
      </div>

      {/* 2. UNIFIED 4-METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#FFF1F2] border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-2">
          <div className="text-[11px] font-black text-[#0F172A]/70 uppercase tracking-wider">
            Tổng Giờ Lập Lịch
          </div>
          <div className="text-2xl font-black text-[#0F172A] tracking-tight">
            {(totalMinutes / 60).toFixed(1)}h
          </div>
          <div className="text-[11px] text-slate-600 font-bold">
            Tương đương {totalTasks} ca làm việc
          </div>
        </div>

        <div className="bg-[#DCFCE7] border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-2">
          <div className="text-[11px] font-black text-[#0F172A]/70 uppercase tracking-wider">
            Đã Hoàn Tất
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            {(doneMinutes / 60).toFixed(1)}h
          </div>
          <div className="text-[11px] text-slate-600 font-bold">
            {doneTasks.length} nhiệm vụ chốt xong
          </div>
        </div>

        <div className="bg-[#DBEAFE] border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-2">
          <div className="text-[11px] font-black text-[#0F172A]/70 uppercase tracking-wider">
            Hiệu Suất Mục Tiêu
          </div>
          <div className="text-2xl font-black text-[#E11D48] tracking-tight">
            {completionRate}%
          </div>
          <div className="text-[11px] text-slate-600 font-bold">
            Tỷ lệ hoàn thành nhiệm vụ
          </div>
        </div>

        <div className="bg-[#FEF9C3] border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-2">
          <div className="text-[11px] font-black text-[#0F172A]/70 uppercase tracking-wider">
            Đang Xử Lý
          </div>
          <div className="text-2xl font-black text-amber-700 tracking-tight">
            {inProgressTasks.length + editingTasks.length} việc
          </div>
          <div className="text-[11px] text-slate-600 font-bold">
            {inProgressTasks.length} đang làm · {editingTasks.length} đang duyệt
          </div>
        </div>
      </div>

      {/* 3. DETAILED ANALYTICS 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Priority Distribution */}
        <div className="bg-white border-2 border-[#0F172A] p-5 rounded-2xl shadow-[4px_4px_0px_#0F172A] space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#0F172A]/15">
            <div>
              <h3 className="font-black text-sm text-[#0F172A]">Phân Bổ Độ Ưu Tiên</h3>
              <p className="text-[11px] text-slate-600 font-medium">Tỷ trọng các nhóm nhiệm vụ theo mức quan trọng</p>
            </div>
            <span className="text-xs font-black text-[#0F172A] bg-[#FEF9C3] px-2.5 py-0.5 rounded-full border border-[#0F172A]">
              {totalTasks} công việc
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {[
              {
                id: 'p1',
                label: 'P1 · Cốt Lõi',
                desc: 'Nhiệm vụ tối quan trọng, tác động trực tiếp',
                count: p1Tasks.length,
                color: '#E11D48', // Genncore Crimson
              },
              {
                id: 'p2',
                label: 'P2 · Quan Trọng',
                desc: 'Hỗ trợ mục tiêu chiến lược, cần hoàn tất sớm',
                count: p2Tasks.length,
                color: '#F59E0B', // Cartoon Amber
              },
              {
                id: 'p3',
                label: 'P3 · Tiêu Chuẩn',
                desc: 'Công việc vận hành thường quy, duy trì hệ thống',
                count: p3Tasks.length,
                color: '#10B981', // Cartoon Emerald
              },
            ].map((p) => {
              const pct = totalTasks > 0 ? Math.round((p.count / totalTasks) * 100) : 0;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-black text-[#0F172A]">
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: p.color }}
                        className="w-2.5 h-2.5 rounded-full border border-[#0F172A] inline-block"
                      />
                      <span>{p.label}</span>
                    </div>
                    <span className="text-[#0F172A]/75 font-bold font-mono">
                      {p.count} việc ({pct}%)
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-[#FFFDF7] border border-[#0F172A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: p.color }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workflow Status Distribution */}
        <div className="bg-white border-2 border-[#0F172A] p-5 rounded-2xl shadow-[4px_4px_0px_#0F172A] space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#0F172A]/15">
            <div>
              <h3 className="font-black text-sm text-[#0F172A]">Quy Trình & Trạng Thái</h3>
              <p className="text-[11px] text-slate-600 font-medium">Tiến độ lưu chuyển công việc qua các giai đoạn</p>
            </div>
            <span className="text-xs font-black text-[#E11D48] bg-[#FFE4E6] px-2.5 py-0.5 rounded-full border border-[#0F172A]">
              4 cột Kanban
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {[
              {
                id: 'draft',
                label: 'Lên Kế Hoạch (Draft)',
                count: draftTasks.length,
                color: '#E11D48',
              },
              {
                id: 'in_progress',
                label: 'Đang Thực Hiện (In Progress)',
                count: inProgressTasks.length,
                color: '#3B82F6',
              },
              {
                id: 'editing',
                label: 'Đang Duyệt & Tinh Chỉnh (Editing)',
                count: editingTasks.length,
                color: '#F59E0B',
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
                  <div className="flex items-center justify-between text-xs font-black text-[#0F172A]">
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: col.color }}
                        className="w-2.5 h-2.5 rounded-full border border-[#0F172A] inline-block"
                      />
                      <span>{col.label}</span>
                    </div>
                    <span className="text-[#0F172A]/75 font-bold font-mono">
                      {col.count} việc ({pct}%)
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-[#FFFDF7] border border-[#0F172A] rounded-full overflow-hidden">
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
      <div className="bg-white border-2 border-[#0F172A] p-5 rounded-2xl shadow-[4px_4px_0px_#0F172A] space-y-4">
        <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#0F172A]/15 flex-wrap gap-2">
          <div>
            <h3 className="font-black text-sm text-[#0F172A]">Nhịp Độ Công Việc Trong Tuần</h3>
            <p className="text-[11px] text-slate-600 font-medium">Số lượng nhiệm vụ được phân bổ và hoàn thành theo từng ngày</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-black text-[#0F172A]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FEF08A] border border-[#0F172A] inline-block" />
              Tổng việc
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] border border-[#0F172A] inline-block" />
              Đã chốt xong
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2 text-center">
          {dayStats.map((d) => (
            <div
              key={d.name}
              className="space-y-2 bg-[#FFFDF7] p-3 rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]"
            >
              <div className="text-[11px] font-black text-[#0F172A]">{d.name}</div>
              <div className="h-20 flex items-end justify-center gap-1.5 py-1">
                {/* Total bar */}
                <div
                  className="w-3.5 bg-[#FEF08A] border border-[#0F172A] rounded-t-md transition-all"
                  style={{ height: `${Math.min(100, Math.max(14, d.total * 20))}%` }}
                  title={`Tổng số: ${d.total} việc`}
                />
                {/* Done bar */}
                <div
                  className="w-3.5 bg-[#E11D48] border border-[#0F172A] rounded-t-md transition-all"
                  style={{ height: `${Math.min(100, Math.max(14, d.done * 20))}%` }}
                  title={`Hoàn thành: ${d.done} việc`}
                />
              </div>
              <div className="text-[10px] font-mono font-black text-[#0F172A] bg-[#FFF1F2] px-1.5 py-0.5 rounded-md border border-[#0F172A]/20 inline-block">
                {d.done}/{d.total}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
