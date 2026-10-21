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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF2F8]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToTracker}
            className="p-2 rounded-xl text-[#5E687A] hover:text-[#1E2433] hover:bg-[#F4F6FA] border border-[#E2E8F0] transition-colors"
            title="Quay lại Time Tracker"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-[#1E2433] flex items-center gap-2">
              <Archive className="w-4 h-4 text-[#10B981]" />
              <span>Kho Lưu Trữ Công Việc Đã Hoàn Thành</span>
            </h2>
            <p className="text-[11px] text-[#8F9CAE]">
              Ghi lại lịch sử hoàn thành, khôi phục hoặc dọn dẹp các nhiệm vụ đã xong
            </p>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-[#E6F9F0] text-[#059669] font-bold rounded-xl flex items-center gap-1.5 border border-[#A7F3D0]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{completedTasks.length} Đã hoàn tất</span>
          </div>
          <div className="px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] font-bold rounded-xl flex items-center gap-1.5 border border-[#BFDBFE]">
            <Clock className="w-3.5 h-3.5" />
            <span>{totalHours} giờ cống hiến</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#EEF2F8] shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8F9CAE] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm công việc đã hoàn thành..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E2433] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8F9CAE] font-medium shrink-0">Ưu tiên:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#1E2433] focus:outline-none focus:border-[#3B82F6]"
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
        <div className="bg-white rounded-2xl border border-[#EEF2F8] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#E6F9F0] text-[#10B981] flex items-center justify-center mx-auto">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#1E2433]">Chưa có công việc hoàn thành nào</h3>
          <p className="text-xs text-[#8F9CAE] max-w-sm mx-auto">
            Khi bạn hoàn thành các việc trong bảng Kanban hoặc thời khóa biểu, chúng sẽ được lưu trữ tự động tại đây.
          </p>
          <button
            onClick={onBackToTracker}
            className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            Quay lại bảng làm việc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white border border-[#E2E8F0] hover:border-[#10B981] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-3 relative group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-5 h-5 rounded-full bg-[#E6F9F0] text-[#10B981] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-bold text-[#1E2433] line-through opacity-85">
                    {task.title}
                  </h4>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                  {task.priority || '#1 Cốt Lõi'}
                </span>
              </div>

              {/* Time and category */}
              <div className="flex items-center gap-3 text-[11px] text-[#8F9CAE]">
                <span className="flex items-center gap-1 font-semibold text-[#4B5565]">
                  <Clock className="w-3 h-3 text-[#10B981]" />
                  {task.time_box?.start || '09:00'} - {task.time_box?.end || '10:30'} ({task.time_box?.duration_minutes || 90}p)
                </span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
                  ✓ Hoàn thành 100%
                </span>
              </div>

              {/* Checklist achieved */}
              {task.definition_of_done && task.definition_of_done.length > 0 && (
                <div className="space-y-1 bg-[#F8FAFD] p-2.5 rounded-xl border border-[#EEF2F8] text-[11px]">
                  <p className="text-[10px] font-bold text-[#8F9CAE] uppercase">
                    Tiêu chí đã đạt ({task.definition_of_done.length}):
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {task.definition_of_done.map((chk) => (
                      <div key={chk.id} className="flex items-center gap-1.5 text-slate-600">
                        <CheckSquare className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{chk.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EEF2F8]">
                <button
                  onClick={() => {
                    soundEngine.playSoftClick();
                    onRestoreTask(task.id);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#3B82F6] hover:bg-[#EFF6FF] flex items-center gap-1 transition-colors"
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
                  className="p-1.5 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
