'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, Clock, Tag, Flag, Palette, ExternalLink } from 'lucide-react';
import { TaskItem } from '../lib/types';
import { soundEngine } from '../lib/audio';
import { PALETTES } from '../lib/colorPalettes';
import { generateGoogleCalendarUrl } from '../lib/calendarSync';
import { notify } from '../lib/notificationService';



interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<TaskItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialTask?: TaskItem | null;
  defaultDayIndex?: number;
  defaultTimeSlot?: string;
  defaultColumn?: 'draft' | 'in_progress' | 'editing' | 'done';
  defaultScheduledDate?: string;
}

const DAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTask,
  defaultDayIndex = 1,
  defaultTimeSlot = '09:00',
  defaultColumn = 'draft',
  defaultScheduledDate,
}) => {
  const [title, setTitle] = useState('');
  const [column, setColumn] = useState<'draft' | 'in_progress' | 'editing' | 'done'>(defaultColumn);
  const [dayIndex, setDayIndex] = useState(defaultDayIndex);
  const [scheduledDate, setScheduledDate] = useState(
    initialTask?.scheduled_date || defaultScheduledDate || new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState(defaultTimeSlot);
  const [endTime, setEndTime] = useState('10:30');
  const [category, setCategory] = useState<'deep_work' | 'optimization' | 'research' | 'meeting'>('deep_work');
  const [priority, setPriority] = useState('#1 Cốt Lõi');
  const [colorTheme, setColorTheme] = useState('twilight');
  const [selectedPaletteGroup, setSelectedPaletteGroup] = useState<'twilight' | 'forest' | 'designer' | 'classic'>('twilight');
  const [note, setNote] = useState('');
  const [checklist, setChecklist] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setColumn(
        initialTask.column === 'todo' ? 'draft' :
        initialTask.column === 'in_review' ? 'editing' :
        initialTask.column as any
      );
      setDayIndex(typeof initialTask.day_index === 'number' ? initialTask.day_index : defaultDayIndex);
      setScheduledDate(initialTask.scheduled_date || defaultScheduledDate || new Date().toISOString().split('T')[0]);
      setStartTime(initialTask.time_box?.start || defaultTimeSlot);
      setEndTime(initialTask.time_box?.end || '10:30');
      setCategory(initialTask.category as any || 'deep_work');
      setPriority(initialTask.priority || '#1 Cốt Lõi');
      const theme = initialTask.color_theme || 'twilight';
      setColorTheme(theme);
      if (PALETTES[theme]?.group) {
        setSelectedPaletteGroup(PALETTES[theme].group);
      }
      setNote(initialTask.note || '');
      setChecklist(initialTask.definition_of_done || []);
    } else {
      setTitle('');
      setColumn(defaultColumn);
      setDayIndex(defaultDayIndex);
      setScheduledDate(defaultScheduledDate || new Date().toISOString().split('T')[0]);
      setStartTime(defaultTimeSlot);
      setEndTime('10:30');
      setCategory('deep_work');
      setPriority('#1 Cốt Lõi');
      setColorTheme('twilight');
      setSelectedPaletteGroup('twilight');
      setNote('');
      setChecklist([]);
    }
  }, [initialTask, isOpen, defaultDayIndex, defaultTimeSlot]);

  if (!isOpen) return null;

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklist([
      ...checklist,
      { id: `chk_${Date.now()}`, text: newChecklistText.trim(), completed: false },
    ]);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim(),
        column,
        day_index: dayIndex,
        scheduled_date: scheduledDate,
        time_box: {
          start: startTime,
          end: endTime,
          duration_minutes: 90,
        },
        category: category as any,
        priority,
        color_theme: colorTheme,
        note,
        definition_of_done: checklist,
      });
      soundEngine.playPentatonicChime(4);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialTask || !onDelete) return;
    const confirmed = await notify.confirm('Bạn có chắc chắn muốn xóa công việc này khỏi hệ thống? Thao tác này không thể hoàn tác.', {
      title: 'Xóa Công Việc',
      confirmText: 'Xóa ngay',
      cancelText: 'Giữ lại',
      type: 'warning',
    });
    if (confirmed) {
      try {
        setIsSubmitting(true);
        await onDelete(initialTask.id);
        soundEngine.playSoftClick();
        onClose();
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFDF7] rounded-3xl max-w-lg w-full p-6 shadow-[6px_6px_0px_#0F172A] relative border-2 border-[#0F172A] animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] hover:bg-[#FFE4E6] transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-black text-[#0F172A] mb-4">
          {initialTask ? 'Chỉnh sửa Công việc' : 'Thêm Công việc mới'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-black text-[#0F172A] mb-1">Tên công việc *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Thiết kế trang thanh toán, Tối ưu database..."
              required
              className="w-full px-3.5 py-2.5 bg-white border-2 border-[#0F172A] rounded-xl text-sm font-semibold text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none transition-all"
            />
          </div>

          {/* Column & Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-[#0F172A] mb-1">Trạng thái (Cột)</label>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border-2 border-[#0F172A] rounded-xl text-xs font-semibold text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none"
              >
                <option value="draft">Draft (Bản nháp)</option>
                <option value="in_progress">In Progress (Đang làm)</option>
                <option value="editing">Editing (Đang duyệt)</option>
                <option value="done">Done (Hoàn thành)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-[#0F172A] mb-1">Ngày Lên Lịch (Ngày Thực Hiện)</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setScheduledDate(val);
                  if (val) {
                    const parts = val.split('-');
                    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    const dayIdx = (d.getDay() + 6) % 7;
                    setDayIndex(dayIdx);
                  }
                }}
                className="w-full px-3 py-2 bg-white border-2 border-[#0F172A] rounded-xl text-xs font-semibold text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none"
              />
            </div>
          </div>

          {/* Time Start & End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-[#0F172A] mb-1">Giờ bắt đầu</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="09:00"
                className="w-full px-3 py-2 bg-white border-2 border-[#0F172A] rounded-xl text-xs font-semibold text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#0F172A] mb-1">Giờ kết thúc</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="10:30"
                className="w-full px-3 py-2 bg-white border-2 border-[#0F172A] rounded-xl text-xs font-semibold text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none"
              />
            </div>
          </div>

          {/* Color theme & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-black text-[#0F172A]">
                  Bảng màu phong cách (Designer Color Palettes)
                </label>
                <span className="text-[10px] font-black text-[#0F172A] bg-[#FEF9C3] border border-[#0F172A] px-2 py-0.5 rounded-full shadow-[1px_1px_0px_#0F172A]">
                  {PALETTES[colorTheme]?.name || colorTheme}
                </span>
              </div>

              {/* Live Preview Capsule */}
              <div
                style={{
                  backgroundColor: (PALETTES[colorTheme] || PALETTES.twilight).hex,
                  color: (PALETTES[colorTheme] || PALETTES.twilight).textColor,
                }}
                className="rounded-2xl p-2.5 mb-2.5 border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] transition-all duration-200 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    style={{
                      backgroundColor: (PALETTES[colorTheme] || PALETTES.twilight).badgeBg,
                      color: (PALETTES[colorTheme] || PALETTES.twilight).badgeText,
                    }}
                    className="px-2 py-0.5 rounded-full text-[10px] font-black leading-none border border-[#0F172A]/20"
                  >
                    {startTime || '09:00'}
                  </span>
                  <span className="text-xs font-extrabold truncate drop-shadow-xs">
                    {title.trim() || 'Xem trước hiển thị thẻ công việc'}
                  </span>
                </div>
                <span
                  style={{
                    backgroundColor: (PALETTES[colorTheme] || PALETTES.twilight).badgeBg,
                    color: (PALETTES[colorTheme] || PALETTES.twilight).badgeText,
                  }}
                  className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase shrink-0 leading-none border border-[#0F172A]/20"
                >
                  {priority.includes('1') ? 'P1' : priority.includes('2') ? 'P2' : 'P3'}
                </span>
              </div>

              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#FFF1F2] border-2 border-[#0F172A] rounded-xl mb-2.5 overflow-x-auto text-[11px] font-black">
                {[
                  { id: 'twilight', label: 'Twilight Sunset', dot: '#AE445A' },
                  { id: 'forest', label: 'Deep Forest', dot: '#235347' },
                  { id: 'designer', label: 'Designer Grid', dot: '#01D1FF' },
                  { id: 'classic', label: 'Classic Staples', dot: '#E11D48' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedPaletteGroup(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      selectedPaletteGroup === tab.id
                        ? 'bg-white text-[#0F172A] border border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-white/60'
                    }`}
                  >
                    <span style={{ backgroundColor: tab.dot }} className="w-2 h-2 rounded-full inline-block border border-[#0F172A]" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Categorized Swatches with Hex Codes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[145px] overflow-y-auto pr-1 pb-1">
                {Object.values(PALETTES)
                  .filter((p) => p.group === selectedPaletteGroup)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setColorTheme(p.id)}
                      className={`flex items-center gap-2 p-1.5 rounded-xl border-2 border-[#0F172A] text-left transition-all cursor-pointer ${
                        colorTheme === p.id
                          ? 'bg-[#FEF9C3] shadow-[2px_2px_0px_#0F172A]'
                          : 'bg-white hover:bg-[#FFF1F2]'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: p.hex }}
                        className="w-4.5 h-4.5 rounded-full shrink-0 border-2 border-[#0F172A]"
                      />
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="text-[11px] font-black text-[#0F172A] truncate">{p.name}</p>
                        <p className="text-[9.5px] font-mono font-bold text-[#475569] tracking-tight uppercase">{p.hex}</p>
                      </div>
                      {colorTheme === p.id && (
                        <span className="w-2 h-2 rounded-full bg-[#E11D48] border border-[#0F172A] shrink-0" />
                      )}
                    </button>
                  ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#0F172A] mb-1">Mức ưu tiên</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-[#0F172A] rounded-xl text-xs font-semibold text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none"
              >
                <option value="#1 Cốt Lõi">P1 · Cốt lõi (Critical)</option>
                <option value="#2 Quan Trọng">P2 · Quan trọng (High)</option>
                <option value="#3 Bình Thường">P3 · Tiêu chuẩn (Normal)</option>
              </select>
            </div>
          </div>

          {/* Definition of Done (Checklist) */}
          <div>
            <label className="block text-xs font-black text-[#0F172A] mb-1.5">
              Checklist hoàn thành ({checklist.length})
            </label>
            <div className="space-y-2 mb-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-semibold text-[#0F172A]"
                >
                  <span className={item.completed ? 'line-through text-slate-400' : ''}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="text-[#0F172A]/60 hover:text-[#E11D48] hover:bg-[#FFE4E6] p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Thêm tiêu chí xong..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                className="flex-1 px-3 py-2 bg-white border-2 border-[#0F172A] rounded-xl text-xs font-semibold text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3.5 py-2 bg-[#FEF9C3] hover:bg-[#FDE047] text-xs font-black text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] rounded-xl transition-all cursor-pointer"
              >
                Thêm
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-between border-t-2 border-[#0F172A]/15 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {initialTask && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Xóa công việc
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const url = generateGoogleCalendarUrl({
                    title: title || 'Nhiệm vụ mới',
                    date: scheduledDate,
                    time: `${startTime} - ${endTime}`,
                    notes: note,
                    priority,
                  });
                  window.open(url, '_blank');
                }}
                className="px-2.5 py-2 bg-white hover:bg-[#FEF9C3] text-[11px] font-black text-[#0F172A] rounded-xl transition-all border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center gap-1.5 cursor-pointer"
                title="Mở Google Calendar và đưa ca việc này vào lịch của bạn"
              >
                <Calendar className="w-3.5 h-3.5 text-[#E11D48]" />
                <span>Google Calendar</span>
                <ExternalLink className="w-3 h-3 text-[#0F172A]" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-[#FEF9C3] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black rounded-xl transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Đang lưu...' : initialTask ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
