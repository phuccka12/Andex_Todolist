'use client';

import React from 'react';
import { Plus, CheckCircle2, ChevronRight, Check, Trash2, Clock } from 'lucide-react';
import { TaskItem } from '../lib/types';
import { soundEngine } from '../lib/audio';
import { resolvePalette } from '../lib/colorPalettes';

interface KanbanSectionProps {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  onToggleChecklist: (taskId: string, checklistId: string) => Promise<void>;
  onMoveColumn: (taskId: string, newColumn: 'draft' | 'in_progress' | 'editing' | 'done') => Promise<void>;
  onAddTaskToColumn: (column: 'draft' | 'in_progress' | 'editing' | 'done') => void;
}

const COLUMNS = [
  { id: 'draft', label: 'Draft', color: 'text-[#6C5CE7]', bg: 'bg-[#ECE9FE]' },
  { id: 'in_progress', label: 'In Progress', color: 'text-[#3B82F6]', bg: 'bg-[#EBF3FF]' },
  { id: 'editing', label: 'Editing', color: 'text-[#F59E0B]', bg: 'bg-[#FFF6DF]' },
  { id: 'done', label: 'Done', color: 'text-[#10B981]', bg: 'bg-[#E6F9F0]' },
] as const;

export const KanbanSection: React.FC<KanbanSectionProps> = ({
  tasks,
  onTaskClick,
  onToggleChecklist,
  onMoveColumn,
  onAddTaskToColumn,
}) => {
  const getTasksForColumn = (colId: string) => {
    return tasks.filter((t) => {
      if (colId === 'draft') return t.column === 'draft' || t.column === 'todo';
      if (colId === 'in_progress') return t.column === 'in_progress';
      if (colId === 'editing') return t.column === 'editing' || t.column === 'in_review';
      if (colId === 'done') return t.column === 'done';
      return false;
    });
  };

  const getNextColumn = (currentCol: string): 'draft' | 'in_progress' | 'editing' | 'done' | null => {
    if (currentCol === 'draft' || currentCol === 'todo') return 'in_progress';
    if (currentCol === 'in_progress') return 'editing';
    if (currentCol === 'editing' || currentCol === 'in_review') return 'done';
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0">
      {COLUMNS.map((col) => {
        const colTasks = getTasksForColumn(col.id);

        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={async (e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData('text/plain');
              if (taskId) {
                soundEngine.playSoftClick();
                await onMoveColumn(taskId, col.id);
              }
            }}
            className="bg-[#FAFBFD] border border-[#EEF2F8] hover:border-[#3B82F6]/50 rounded-2xl p-3.5 flex flex-col justify-between transition-colors min-h-[190px]"
          >
            <div>
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F8] mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.bg} ring-2 ring-current ${col.color}`} />
                  <h3 className="font-extrabold text-xs text-[#1E2433]">{col.label}</h3>
                  <span className="text-[10px] font-bold text-[#8F9CAE] bg-[#EEF2F8] px-1.5 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => onAddTaskToColumn(col.id)}
                  className="p-1 rounded-md text-[#8F9CAE] hover:text-[#1E2433] hover:bg-[#EEF2F8] transition-colors"
                  title={`Thêm task vào ${col.label}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5">
                {colTasks.length === 0 ? (
                  <p className="text-[11px] text-[#A0AEC0] italic py-2 text-center">
                    Chưa có công việc
                  </p>
                ) : (
                  colTasks.map((task) => {
                    const nextCol = getNextColumn(task.column);
                    const palette = resolvePalette(task.color_theme);

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id);
                          e.dataTransfer.effectAllowed = 'move';
                          soundEngine.playSoftClick();
                        }}
                        className="bg-white rounded-2xl p-2.5 border border-[#EEF2F8] shadow-2xs hover:shadow-xs transition-all space-y-2 group cursor-grab active:cursor-grabbing hover:border-slate-300"
                      >
                        {/* Top Palette Pill Tag */}
                        <div className="flex items-center justify-between gap-1">
                          <span
                            style={{ backgroundColor: palette.hex, color: palette.textColor }}
                            className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight whitespace-nowrap shadow-2xs flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                            {palette.name}
                          </span>

                          {nextCol && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                soundEngine.playSoftClick();
                                onMoveColumn(task.id, nextCol);
                              }}
                              title={`Chuyển sang ${nextCol}`}
                              className="text-[#8F9CAE] hover:text-[#3B82F6] p-0.5 rounded-md hover:bg-[#F0F4FA] shrink-0 transition-colors"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-1.5">
                          <span
                            onClick={() => onTaskClick(task)}
                            className="text-xs font-bold text-[#1E2433] hover:text-[#3B82F6] cursor-pointer line-clamp-2 transition-colors flex-1"
                          >
                            {task.title}
                          </span>
                        </div>

                        {/* Checklist items (Real toggle) */}
                        {task.definition_of_done && task.definition_of_done.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-[#F4F6FA]">
                            {task.definition_of_done.map((item) => (
                              <label
                                key={item.id}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 text-[11px] text-[#4B5565] cursor-pointer select-none hover:text-[#1E2433]"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={() => {
                                    soundEngine.playSoftClick();
                                    onToggleChecklist(task.id, item.id);
                                  }}
                                  className="w-3 h-3 text-[#3B82F6] rounded-xs border-gray-300 focus:ring-0"
                                />
                                <span className={`truncate ${item.completed ? 'line-through text-slate-400' : ''}`}>
                                  {item.text}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Card Footer: Timebox & Progress */}
                        <div className="flex items-center justify-between text-[10px] text-[#8F9CAE] pt-1">
                          <span className="flex items-center gap-1 font-semibold">
                            <Clock className="w-2.5 h-2.5" />
                            {task.time_box?.start || '09:00'} - {task.time_box?.end || '10:30'}
                          </span>

                          <span className={`px-1.5 py-0.2 rounded font-bold ${
                            task.progress_percentage === 100
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {task.progress_percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Add Task Button */}
            <button
              onClick={() => onAddTaskToColumn(col.id)}
              className="mt-3 w-full py-1.5 rounded-xl border border-dashed border-[#D2DCED] hover:border-[#3B82F6] text-[#8F9CAE] hover:text-[#3B82F6] text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm việc</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
