'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  Trash2,
  Search,
  Calendar,
  Clock,
  Sparkles,
  Archive,
  ArrowLeft,
  CheckSquare,
} from 'lucide-react';
import { TaskItem } from '../lib/types';
import { soundEngine } from '../lib/audio';
import { notify } from '../lib/notificationService';


interface CompletedTasksArchiveProps {
  tasks: TaskItem[];
  onRestoreTask: (taskId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onBackToTracker: () => void;
}

export const CompletedTasksArchive: React.FC<CompletedTasksArchiveProps> = ({
  tasks,
  onRestoreTask,
  onDeleteTask,
  onBackToTracker,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const completedTasks = tasks.filter((t) => t.column === 'done');

  const filteredTasks = completedTasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const totalMinutes = completedTasks.reduce(
    (acc, t) => acc + (t.time_box?.duration_minutes || 90),
    0
  );
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#0F172A]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToTracker}
            className="p-2 rounded-xl bg-[#FEF9C3] text-[#0F172A] hover:bg-[#FDE047] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer"
            title="Quay lại Time Tracker"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-black text-[#0F172A] flex items-center gap-2">
              <Archive className="w-4 h-4 text-[#E11D48]" />
              <span>Kho Lưu Trữ Công Việc Đã Hoàn Thành</span>
            </h2>
            <p className="text-[11px] text-slate-600 font-medium">
              Ghi lại lịch sử hoàn thành, khôi phục hoặc dọn dẹp các nhiệm vụ đã xong
            </p>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-[#DCFCE7] text-[#0F172A] font-black rounded-xl flex items-center gap-1.5 border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{completedTasks.length} Đã hoàn tất</span>
          </div>
          <div className="px-3 py-1.5 bg-[#FFE4E6] text-[#E11D48] font-black rounded-xl flex items-center gap-1.5 border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]">
            <Clock className="w-3.5 h-3.5" />
            <span>{totalHours} giờ cống hiến</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#E11D48] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm công việc đã hoàn thành..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#FFFDF7] border-2 border-[#0F172A] rounded-xl text-xs font-bold text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-[#FFF1F2] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#0F172A] font-black shrink-0">Ưu tiên:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 bg-[#FFFDF7] border-2 border-[#0F172A] rounded-xl text-xs font-black text-[#0F172A] focus:outline-none focus:bg-[#FFF1F2] cursor-pointer transition-colors"
          >
            <option value="all">Tất cả mức độ</option>
            <option value="#1 Cốt Lõi">P1 · Cốt lõi</option>
            <option value="#2 Quan Trọng">P2 · Quan trọng</option>
            <option value="#3 Bình Thường">P3 · Tiêu chuẩn</option>
          </select>
        </div>
      </div>

      {/* Completed Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-[#15803D] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] flex items-center justify-center mx-auto">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-[#0F172A]">Chưa có công việc hoàn thành nào</h3>
          <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
            Khi bạn hoàn thành các việc trong bảng Kanban hoặc thời khóa biểu, chúng sẽ được lưu trữ tự động tại đây.
          </p>
          <button
            onClick={onBackToTracker}
            className="px-4 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-black rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer"
          >
            Quay lại bảng làm việc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white border-2 border-[#0F172A] rounded-2xl p-4 shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_#0F172A] transition-all space-y-3 relative group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-6 h-6 rounded-lg bg-[#DCFCE7] text-[#15803D] border-2 border-[#0F172A] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-black text-[#0F172A] line-through opacity-85">
                    {task.title}
                  </h4>
                </div>

                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#FFF1F2] text-[#E11D48] border border-[#0F172A] shrink-0">
                  {task.priority || '#1 Cốt Lõi'}
                </span>
              </div>

              {/* Time and category */}
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 font-bold text-[#0F172A]/80">
                  <Clock className="w-3 h-3 text-[#E11D48]" />
                  {task.time_box?.start || '09:00'} - {task.time_box?.end || '10:30'} ({task.time_box?.duration_minutes || 90}p)
                </span>
                <span className="text-[#15803D] font-black bg-[#DCFCE7] border border-[#0F172A] px-2 py-0.5 rounded-md text-[10px]">
                  ✓ Hoàn thành 100%
                </span>
              </div>

              {/* Checklist achieved */}
              {task.definition_of_done && task.definition_of_done.length > 0 && (
                <div className="space-y-1.5 bg-[#FFFDF7] p-2.5 rounded-xl border-2 border-[#0F172A] text-[11px]">
                  <p className="text-[10px] font-black text-[#0F172A]/75 uppercase">
                    Tiêu chí đã đạt ({task.definition_of_done.length}):
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {task.definition_of_done.map((chk) => (
                      <div key={chk.id} className="flex items-center gap-1.5 text-[#0F172A] font-medium">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{chk.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2.5 border-t-2 border-[#0F172A]/15">
                <button
                  onClick={() => {
                    soundEngine.playSoftClick();
                    onRestoreTask(task.id);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-black text-[#0F172A] bg-[#FEF9C3] hover:bg-[#FDE047] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Khôi phục lại trạng thái Đang làm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục việc này</span>
                </button>

                <button
                  onClick={async () => {
                    const confirmed = await notify.confirm('Xóa vĩnh viễn công việc này khỏi kho lưu trữ? Thao tác này không thể hoàn tác.', {
                      title: 'Xóa Vĩnh Viễn',
                      confirmText: 'Xóa ngay',
                      type: 'warning',
                    });
                    if (confirmed) {
                      soundEngine.playSoftClick();
                      onDeleteTask(task.id);
                    }
                  }}
                  className="p-1.5 px-2.5 rounded-xl bg-[#FFE4E6] hover:bg-[#E11D48] text-[#E11D48] hover:text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer flex items-center gap-1 text-xs font-black"
                  title="Xóa vĩnh viễn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
