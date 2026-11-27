'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Filter } from 'lucide-react';
import { TaskItem } from '../lib/types';
import { PALETTES, resolvePalette } from '../lib/colorPalettes';
import { soundEngine } from '../lib/audio';

interface CustomTag {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
}

const DEFAULT_TAGS: CustomTag[] = [
  { id: 'p1', name: 'P1 · Cốt Lõi', color: '#AE445A', isDefault: true },
  { id: 'p2', name: 'P2 · Quan Trọng', color: '#F39F5A', isDefault: true },
  { id: 'p3', name: 'P3 · Tiêu Chuẩn', color: '#235347', isDefault: true },
  { id: 'deep_work', name: 'Deep Work', color: '#451952', isDefault: true },
  { id: 'optimization', name: 'Tối Ưu & R&D', color: '#01D1FF', isDefault: true },
  { id: 'creative', name: 'Sáng Tạo & UI', color: '#FF5959', isDefault: true },
];

const CUSTOM_TAGS_KEY = 'cbp_atelier_custom_tags_v3';

interface TagsViewProps {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  onOpenTaskModal: () => void;
}

export const TagsView: React.FC<TagsViewProps> = ({ tasks, onTaskClick, onOpenTaskModal }) => {
  const [tags, setTags] = useState<CustomTag[]>(DEFAULT_TAGS);
  const [selectedTagId, setSelectedTagId] = useState<string>('all');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#AE445A');

  // Load custom tags and sanitize any legacy emoji strings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_TAGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sanitize any stray emoji
          const cleaned = parsed.map((t: any) => ({
            id: t.id,
            name: typeof t.name === 'string' ? t.name.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() : 'Nhãn',
            color: t.color || '#AE445A',
            isDefault: t.isDefault,
          }));
          setTags(cleaned);
        }
      }
    } catch {}
  }, []);

  const saveTags = (updatedTags: CustomTag[]) => {
    setTags(updatedTags);
    try {
      localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(updatedTags));
    } catch {}
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    soundEngine.playSoftClick();
    const newTag: CustomTag = {
      id: `tag_${Date.now()}`,
      name: newTagName.trim(),
      color: newTagColor,
      isDefault: false,
    };

    const updated = [...tags, newTag];
    saveTags(updated);
    setNewTagName('');
    setIsCreatingTag(false);
  };

  const handleDeleteTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playSoftClick();
    const updated = tags.filter((t) => t.id !== tagId);
    saveTags(updated);
    if (selectedTagId === tagId) {
      setSelectedTagId('all');
    }
  };

  // Filter tasks based on selected tag
  const filteredTasks = tasks.filter((task) => {
    if (selectedTagId === 'all') return true;

    const currentTag = tags.find((t) => t.id === selectedTagId);
    if (!currentTag) return true;

    const query = currentTag.name.toLowerCase().replace(/p[123]\s*·?\s*/, '').trim();

    // Check priority match
    if (
      task.priority &&
      (task.priority.toLowerCase().includes(query) ||
        (currentTag.id === 'p1' && task.priority.includes('1')) ||
        (currentTag.id === 'p2' && task.priority.includes('2')) ||
        (currentTag.id === 'p3' && task.priority.includes('3')))
    ) {
      return true;
    }
    // Check category match
    if (task.category && task.category.toLowerCase().includes(query)) {
      return true;
    }
    // Check in title or note
    if (task.title.toLowerCase().includes(query)) {
      return true;
    }
    if (task.note && task.note.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  });

  const getTaskCountForTag = (tag: CustomTag) => {
    const query = tag.name.toLowerCase().replace(/p[123]\s*·?\s*/, '').trim();
    return tasks.filter((task) => {
      if (
        task.priority &&
        (task.priority.toLowerCase().includes(query) ||
          (tag.id === 'p1' && task.priority.includes('1')) ||
          (tag.id === 'p2' && task.priority.includes('2')) ||
          (tag.id === 'p3' && task.priority.includes('3')))
      )
        return true;
      if (task.category && task.category.toLowerCase().includes(query)) return true;
      if (task.title.toLowerCase().includes(query)) return true;
      if (task.note && task.note.toLowerCase().includes(query)) return true;
      return false;
    }).length;
  };

  const activeTag = tags.find((t) => t.id === selectedTagId);

  // Metrics for Top Strip
  const p1Count = tasks.filter((t) => t.priority?.includes('1')).length;
  const deepWorkCount = tasks.filter((t) => t.category === 'deep_work').length;
  const totalTagged = tasks.filter((t) => t.priority || t.category).length;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* 1. UNIFIED HEADER */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-[#0F172A] flex-wrap gap-3">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-[#E11D48] uppercase tracking-widest">
            Không Gian Làm Việc / Nhãn & Danh Mục
          </div>
          <h2 className="text-lg font-black text-[#0F172A] tracking-tight">
            Phân Loại Nhãn & Danh Mục
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Hệ thống phân loại công việc theo mức độ ưu tiên, danh mục và chủ đề cốt lõi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setIsCreatingTag(!isCreatingTag);
            }}
            className="px-3.5 py-1.5 bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] text-xs font-black rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] text-[#E11D48]" />
            <span>Tạo Nhãn Mới</span>
          </button>

          <button
            onClick={onOpenTaskModal}
            className="px-3.5 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-black rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Thêm Việc Mới</span>
          </button>
        </div>
      </div>

      {/* 2. UNIFIED 4-METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
            <span>Tổng Số Nhãn</span>
          </div>
          <div className="text-2xl font-black text-[#0F172A] tracking-tight">
            {tags.length} nhãn
          </div>
          <div className="text-[11px] text-slate-500 font-semibold">
            Đang hoạt động trong hệ thống
          </div>
        </div>

        <div className="bg-white border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Đã Phân Loại</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            {totalTagged} / {tasks.length}
          </div>
          <div className="text-[11px] text-slate-500 font-semibold">
            Nhiệm vụ có nhãn nhận diện
          </div>
        </div>

        <div className="bg-white border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Nhiệm Vụ Cốt Lõi</span>
          </div>
          <div className="text-2xl font-black text-[#E11D48] tracking-tight">
            {p1Count} việc
          </div>
          <div className="text-[11px] text-slate-500 font-semibold">
            Mức ưu tiên P1 tối cao
          </div>
        </div>

        <div className="bg-white border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>Phiên Deep Work</span>
          </div>
          <div className="text-2xl font-black text-[#1D4ED8] tracking-tight">
            {deepWorkCount} việc
          </div>
          <div className="text-[11px] text-slate-500 font-semibold">
            Tập trung sâu chuyên môn
          </div>
        </div>
      </div>

      {/* 3. CREATE TAG INLINE FORM */}
      {isCreatingTag && (
        <form
          onSubmit={handleCreateTag}
          className="bg-white border-2 border-[#0F172A] rounded-2xl p-5 shadow-[4px_4px_0px_#0F172A] space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#0F172A]/15">
            <h3 className="text-xs font-black text-[#0F172A]">Khởi tạo nhãn mới</h3>
            <button
              type="button"
              onClick={() => setIsCreatingTag(false)}
              className="p-1 text-[#0F172A] bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#0F172A] rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#0F172A]">Tên nhãn / chủ đề:</label>
              <input
                type="text"
                placeholder="Ví dụ: Khách Hàng VIP, Tài Chính, v.v..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFFDF7] border-2 border-[#0F172A] rounded-xl text-xs font-bold text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-[#FFF1F2] transition-colors"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#0F172A]">Màu sắc nhận diện (Designer Palettes):</label>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {Object.values(PALETTES).slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.name}
                    onClick={() => setNewTagColor(p.hex)}
                    style={{ backgroundColor: p.hex }}
                    className={`w-6 h-6 rounded-full border-2 border-[#0F172A] transition-all cursor-pointer ${
                      newTagColor === p.hex
                        ? 'ring-2 ring-offset-2 ring-[#E11D48] scale-115 shadow-[2px_2px_0px_#0F172A]'
                        : 'opacity-85 hover:opacity-100 hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingTag(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black text-[#0F172A] bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!newTagName.trim()}
              className="px-4 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-black rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] transition-all disabled:opacity-50 cursor-pointer"
            >
              Lưu Nhãn
            </button>
          </div>
        </form>
      )}

      {/* 4. TAG FILTER TOOLBAR */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white border-2 border-[#0F172A] p-3 rounded-2xl shadow-[3px_3px_0px_#0F172A]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* All Button */}
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setSelectedTagId('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 border-[#0F172A] cursor-pointer ${
              selectedTagId === 'all'
                ? 'bg-[#E11D48] text-white shadow-[2px_2px_0px_#0F172A]'
                : 'bg-[#FFFDF7] text-[#0F172A] hover:bg-[#FEF9C3]'
            }`}
          >
            <span>Tất cả</span>
            <span className="ml-1.5 text-[10px] font-mono opacity-85">({tasks.length})</span>
          </button>

          {/* Dynamic Tag Pills with clean dot */}
          {tags.map((tag) => {
            const count = getTaskCountForTag(tag);
            const isSelected = selectedTagId === tag.id;

            return (
              <div
                key={tag.id}
                onClick={() => {
                  soundEngine.playSoftClick();
                  setSelectedTagId(tag.id);
                }}
                className={`group px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 border-[#0F172A] flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#E11D48] text-white shadow-[2px_2px_0px_#0F172A]'
                    : 'bg-white text-[#0F172A] hover:bg-[#FEF9C3]'
                }`}
              >
                <span
                  style={{ backgroundColor: tag.color }}
                  className="w-2 h-2 rounded-full inline-block border border-[#0F172A] shrink-0"
                />
                <span>{tag.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                    isSelected ? 'bg-white text-[#E11D48]' : 'bg-[#FFF1F2] text-[#0F172A]'
                  }`}
                >
                  {count}
                </span>

                {!tag.isDefault && (
                  <button
                    onClick={(e) => handleDeleteTag(tag.id, e)}
                    title="Xóa nhãn này"
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-300 p-0.5 rounded transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 stroke-[2]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Filter Summary */}
        <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]/75 pr-1">
          <Filter className="w-3.5 h-3.5 text-[#E11D48]" />
          <span>
            Đang lọc: <strong className="text-[#0F172A] font-black">{activeTag ? activeTag.name : 'Tất cả'}</strong> ({filteredTasks.length} việc)
          </span>
        </div>
      </div>

      {/* 5. FILTERED TASK CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] rounded-2xl space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE4E6] text-[#E11D48] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center justify-center mx-auto text-xs font-black">
              0
            </div>
            <p className="text-xs font-black text-[#0F172A]">Không tìm thấy công việc nào mang nhãn này</p>
            <p className="text-[11px] text-slate-600 font-medium">Bấm "Thêm Việc Mới" để tạo nhiệm vụ với phân loại tương ứng</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const palette = resolvePalette(task.color_theme);
            const isCompleted = task.column === 'done';

            return (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                style={{
                  backgroundColor: isCompleted ? '#94A3B8' : palette.hex,
                  color: palette.textColor,
                }}
                className={`rounded-2xl p-4 border-2 border-[#0F172A] transition-all duration-200 cursor-pointer select-none ${
                  isCompleted
                    ? 'opacity-45 saturate-50 shadow-[1.5px_1.5px_0px_#0F172A]'
                    : 'shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_#0F172A]'
                } space-y-3 flex flex-col justify-between`}
              >
                {/* Header row: timebox & priority */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        backgroundColor: palette.badgeBg,
                        color: palette.badgeText,
                      }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight leading-none tabular-nums"
                    >
                      {task.time_box?.start || '09:00'} - {task.time_box?.end || '10:30'}
                    </span>
                    <span
                      style={{
                        backgroundColor: palette.badgeBg,
                        color: palette.badgeText,
                      }}
                      className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase leading-none"
                    >
                      {task.priority?.includes('1') ? 'P1' : task.priority?.includes('2') ? 'P2' : 'P3'}
                    </span>
                  </div>

                  <span
                    style={{
                      backgroundColor: palette.badgeBg,
                      color: palette.badgeText,
                    }}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                  >
                    {task.column}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h4 className="font-black text-xs tracking-tight leading-snug line-clamp-2">
                    {task.title}
                  </h4>
                </div>

                {/* Footer: progress & checklist */}
                <div className="flex items-center justify-between text-[10.5px] pt-2 border-t border-white/20">
                  <span className="font-bold opacity-90">
                    Tiến độ: {task.progress_percentage}%
                  </span>
                  {task.definition_of_done && task.definition_of_done.length > 0 && (
                    <span className="font-bold opacity-90">
                      Checklist: {task.definition_of_done.filter((c) => c.completed).length}/
                      {task.definition_of_done.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
