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
  onDeleteTask?: (taskId: string) => Promise<void>;
}

const COLUMNS = [
  { id: 'draft', label: 'Draft', color: 'text-[#E11D48]', bg: 'bg-[#FFE4E6]', colBg: 'bg-[#FFFDF7]' },
  { id: 'in_progress', label: 'In Progress', color: 'text-[#1D4ED8]', bg: 'bg-[#DBEAFE]', colBg: 'bg-[#FFFDF7]' },
  { id: 'editing', label: 'Editing', color: 'text-[#D97706]', bg: 'bg-[#FEF9C3]', colBg: 'bg-[#FFFDF7]' },
  { id: 'done', label: 'Done', color: 'text-[#059669]', bg: 'bg-[#DCFCE7]', colBg: 'bg-[#FFFDF7]' },
] as const;

export const KanbanSection: React.FC<KanbanSectionProps> = ({
  tasks,
  onTaskClick,
  onToggleChecklist,
  onMoveColumn,
  onAddTaskToColumn,
  onDeleteTask,
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
            className={`${col.colBg} border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] rounded-2xl p-3.5 flex flex-col justify-between transition-all min-h-[190px]`}
          >
            <div>
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#0F172A]/15 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.bg} border border-[#0F172A] ${col.color}`} />
                  <h3 className="font-black text-xs text-[#0F172A]">{col.label}</h3>
                  <span className="text-[10px] font-black text-[#0F172A] bg-white border border-[#0F172A] px-1.5 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => onAddTaskToColumn(col.id)}
                  className="p-1 rounded-lg bg-white border border-[#0F172A] text-[#0F172A] hover:bg-[#FEF9C3] shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer"
                  title={`Thêm task vào ${col.label}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5">
                {colTasks.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-[#0F172A]/25 bg-white/75 py-4 px-2 text-center">
                    <p className="text-[11px] font-bold text-[#0F172A]/60">
                      Chưa có công việc
                    </p>
                  </div>
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
                        className="bg-white rounded-2xl p-2.5 border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0F172A] transition-all space-y-2 group cursor-grab active:cursor-grabbing"
                      >
                        {/* Top Palette Pill Tag */}
                        <div className="flex items-center justify-between gap-1">
                          <span
                            style={{ backgroundColor: palette.hex, color: palette.textColor }}
                            className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight whitespace-nowrap border border-[#0F172A] shadow-[1px_1px_0px_#0F172A] flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                            {palette.name}
                          </span>

                          <div className="flex items-center gap-1">
                            {onDeleteTask && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  soundEngine.playSoftClick();
                                  await onDeleteTask(task.id);
                                }}
                                title="Xóa công việc này"
                                className="text-[#0F172A]/60 hover:text-[#E11D48] p-1 rounded-lg hover:bg-[#FFE4E6] border border-transparent hover:border-[#0F172A] shrink-0 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {nextCol && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  soundEngine.playSoftClick();
                                  onMoveColumn(task.id, nextCol);
                                }}
                                title={`Chuyển sang ${nextCol}`}
                                className="text-[#0F172A] bg-white hover:bg-[#FEF9C3] p-1 rounded-lg border border-[#0F172A] shadow-[1px_1px_0px_#0F172A] shrink-0 transition-all cursor-pointer"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-1.5">
                          <span
                            onClick={() => onTaskClick(task)}
                            className="text-xs font-black text-[#0F172A] hover:text-[#E11D48] cursor-pointer line-clamp-2 transition-colors flex-1"
                          >
                            {task.title}
                          </span>
                        </div>

                        {/* Checklist items (Real toggle) */}
                        {task.definition_of_done && task.definition_of_done.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t-2 border-[#0F172A]/15">
                            {task.definition_of_done.map((item) => (
                              <label
                                key={item.id}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0F172A]/85 cursor-pointer select-none hover:text-[#E11D48]"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={() => {
                                    soundEngine.playSoftClick();
                                    onToggleChecklist(task.id, item.id);
                                  }}
                                  className="w-3.5 h-3.5 accent-[#E11D48] rounded border-2 border-[#0F172A] focus:ring-0 cursor-pointer"
                                />
                                <span className={`truncate ${item.completed ? 'line-through text-slate-400' : ''}`}>
                                  {item.text}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Card Footer: Timebox & Progress */}
                        <div className="flex items-center justify-between text-[10px] text-[#0F172A]/75 pt-1.5 border-t border-[#0F172A]/10">
                          <span className="flex items-center gap-1 font-bold">
                            <Clock className="w-2.5 h-2.5 text-[#E11D48]" />
                            {task.time_box?.start || '09:00'} - {task.time_box?.end || '10:30'}
                          </span>

                          <span className={`px-1.5 py-0.5 rounded-md font-black border border-[#0F172A] ${
                            task.progress_percentage === 100
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : 'bg-[#FEF9C3] text-[#0F172A]'
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
              className="mt-3 w-full py-1.5 rounded-xl bg-white hover:bg-[#FEF9C3] border-2 border-dashed border-[#0F172A]/40 hover:border-[#0F172A] text-[#0F172A] hover:text-[#E11D48] text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3 text-[#E11D48]" />
              <span>Thêm việc</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
