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
      <div className="flex items-center justify-between pb-4 border-b border-[#EEF2F8] flex-wrap gap-3">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Không Gian Làm Việc / Nhãn & Danh Mục
          </div>
          <h2 className="text-lg font-black text-[#1E293B] tracking-tight">
            Phân Loại Nhãn & Danh Mục
          </h2>
          <p className="text-xs text-slate-500">
            Hệ thống phân loại công việc theo mức độ ưu tiên, danh mục và chủ đề cốt lõi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setIsCreatingTag(!isCreatingTag);
            }}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
            <span>Tạo Nhãn Mới</span>
          </button>

          <button
            onClick={onOpenTaskModal}
            className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
            <span>Thêm Việc Mới</span>
          </button>
        </div>
      </div>

      {/* 2. UNIFIED 4-METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tổng Số Nhãn
          </div>
          <div className="text-2xl font-black text-[#1E293B] tracking-tight">
            {tags.length} nhãn
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Đang hoạt động trong hệ thống
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Đã Phân Loại
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            {totalTagged} / {tasks.length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Nhiệm vụ có nhãn nhận diện
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Nhiệm Vụ Cốt Lõi
          </div>
          <div className="text-2xl font-black text-[#AE445A] tracking-tight">
            {p1Count} việc
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Mức ưu tiên P1 tối cao
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Phiên Deep Work
          </div>
          <div className="text-2xl font-black text-[#2563EB] tracking-tight">
            {deepWorkCount} việc
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Tập trung sâu chuyên môn
          </div>
        </div>
      </div>

      {/* 3. CREATE TAG INLINE FORM */}
      {isCreatingTag && (
        <form
          onSubmit={handleCreateTag}
          className="bg-white border border-[#2563EB]/40 rounded-2xl p-5 shadow-xs space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-extrabold text-[#1E293B]">Khởi tạo nhãn mới</h3>
            <button
              type="button"
              onClick={() => setIsCreatingTag(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Tên nhãn / chủ đề:</label>
              <input
                type="text"
                placeholder="Ví dụ: Khách Hàng VIP, Tài Chính, v.v..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFD] border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB]"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Màu sắc nhận diện (Designer Palettes):</label>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {Object.values(PALETTES).slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.name}
                    onClick={() => setNewTagColor(p.hex)}
                    style={{ backgroundColor: p.hex }}
                    className={`w-6 h-6 rounded-full transition-all ${
                      newTagColor === p.hex
                        ? 'ring-2 ring-offset-2 ring-slate-800 scale-120 shadow-xs'
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
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!newTagName.trim()}
              className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              Lưu Nhãn
            </button>
          </div>
        </form>
      )}

      {/* 4. TAG FILTER TOOLBAR */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-[#E2E8F0] p-2.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* All Button */}
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setSelectedTagId('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              selectedTagId === 'all'
                ? 'bg-[#1E293B] text-white border-[#1E293B] shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Tất cả</span>
            <span className="ml-1.5 text-[10px] font-mono opacity-80">({tasks.length})</span>
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
                className={`group px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#1E293B] text-white border-[#1E293B] shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span
                  style={{ backgroundColor: tag.color }}
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                />
                <span>{tag.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>

                {!tag.isDefault && (
                  <button
                    onClick={(e) => handleDeleteTag(tag.id, e)}
                    title="Xóa nhãn này"
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 stroke-[2]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Filter Summary */}
        <div className="flex items-center gap-2 text-xs text-slate-500 pr-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Đang lọc: <strong className="text-slate-800">{activeTag ? activeTag.name : 'Tất cả'}</strong> ({filteredTasks.length} việc)
          </span>
        </div>
      </div>

      {/* 5. FILTERED TASK CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xs font-bold">
              0
            </div>
            <p className="text-xs font-bold text-slate-700">Không tìm thấy công việc nào mang nhãn này</p>
            <p className="text-[11px] text-slate-400">Bấm "Thêm Việc Mới" để tạo nhiệm vụ với phân loại tương ứng</p>
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
                className={`rounded-2xl p-4 transition-all duration-200 cursor-pointer select-none ${
                  isCompleted ? 'opacity-40 saturate-50' : `${palette.shadow} hover:-translate-y-0.5 hover:brightness-105`
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
                  <h4 className="font-extrabold text-xs tracking-tight leading-snug drop-shadow-xs line-clamp-2">
                    {task.title}
                  </h4>
                </div>

                {/* Footer: progress & checklist */}
                <div className="flex items-center justify-between text-[10.5px] pt-2 border-t border-white/20">
                  <span className="font-bold opacity-85">
                    Tiến độ: {task.progress_percentage}%
                  </span>
                  {task.definition_of_done && task.definition_of_done.length > 0 && (
                    <span className="font-bold opacity-85">
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
