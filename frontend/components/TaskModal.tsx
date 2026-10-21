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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-2xl relative border border-[#EEF2F8] animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-[#8F9CAE] hover:text-[#1E2433] hover:bg-[#F4F6FA] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-[#1E2433] mb-4">
          {initialTask ? 'Chỉnh sửa Công việc' : 'Thêm Công việc mới'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[#4B5565] mb-1">Tên công việc *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Thiết kế trang thanh toán, Tối ưu database..."
              required
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#1E2433] focus:outline-none focus:border-[#3B82F6] focus:bg-white transition-all"
            />
          </div>

          {/* Column & Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#4B5565] mb-1">Trạng thái (Cột)</label>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#1E2433] focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="draft">Draft (Bản nháp)</option>
                <option value="in_progress">In Progress (Đang làm)</option>
                <option value="editing">Editing (Đang duyệt)</option>
                <option value="done">Done (Hoàn thành)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4B5565] mb-1">Ngày Lên Lịch (Ngày Thực Hiện)</label>
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
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#1E2433] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {/* Time Start & End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#4B5565] mb-1">Giờ bắt đầu</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="09:00"
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#1E2433] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4B5565] mb-1">Giờ kết thúc</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="10:30"
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#1E2433] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {/* Color theme & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#4B5565]">
                  Bảng màu phong cách (Designer Color Palettes)
                </label>
                <span className="text-[10px] font-extrabold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
                  {PALETTES[colorTheme]?.name || colorTheme}
                </span>
              </div>

              {/* Live Preview Capsule */}
              <div
                style={{
                  backgroundColor: (PALETTES[colorTheme] || PALETTES.twilight).hex,
                  color: (PALETTES[colorTheme] || PALETTES.twilight).textColor,
                }}
                className={`rounded-2xl p-2.5 mb-2.5 ${(PALETTES[colorTheme] || PALETTES.twilight).shadow} transition-all duration-200 flex items-center justify-between gap-2`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    style={{
                      backgroundColor: (PALETTES[colorTheme] || PALETTES.twilight).badgeBg,
                      color: (PALETTES[colorTheme] || PALETTES.twilight).badgeText,
                    }}
                    className="px-2 py-0.5 rounded-full text-[10px] font-black leading-none"
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
                  className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase shrink-0 leading-none"
                >
                  {priority.includes('1') ? 'P1' : priority.includes('2') ? 'P2' : 'P3'}
                </span>
              </div>

              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl mb-2.5 overflow-x-auto text-[11px] font-bold">
                {[
                  { id: 'twilight', label: 'Twilight Sunset', dot: '#AE445A' },
                  { id: 'forest', label: 'Deep Forest', dot: '#235347' },
                  { id: 'designer', label: 'Designer Grid', dot: '#01D1FF' },
                  { id: 'classic', label: 'Classic Staples', dot: '#2563EB' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedPaletteGroup(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      selectedPaletteGroup === tab.id
                        ? 'bg-white text-[#0F172A] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    <span style={{ backgroundColor: tab.dot }} className="w-1.5 h-1.5 rounded-full inline-block" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Categorized Swatches with Hex Codes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[145px] overflow-y-auto pr-1">
                {Object.values(PALETTES)
                  .filter((p) => p.group === selectedPaletteGroup)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setColorTheme(p.id)}
                      className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition-all ${
                        colorTheme === p.id
                          ? 'border-[#0F172A] bg-slate-50 ring-1 ring-[#0F172A] shadow-xs'
                          : 'border-[#E2E8F0] hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: p.hex }}
                        className="w-4.5 h-4.5 rounded-full shrink-0 shadow-2xs border border-black/10"
                      />
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="text-[11px] font-bold text-[#1E293B] truncate">{p.name}</p>
                        <p className="text-[9.5px] font-mono text-[#64748B] tracking-tight uppercase">{p.hex}</p>
                      </div>
                      {colorTheme === p.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0F172A] shrink-0" />
                      )}
                    </button>
                  ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4B5565] mb-1">Mức ưu tiên</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#1E2433] focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="#1 Cốt Lõi">P1 · Cốt lõi (Critical)</option>
                <option value="#2 Quan Trọng">P2 · Quan trọng (High)</option>
                <option value="#3 Bình Thường">P3 · Tiêu chuẩn (Normal)</option>
              </select>
            </div>
          </div>

          {/* Definition of Done (Checklist) */}
          <div>
            <label className="block text-xs font-bold text-[#4B5565] mb-1.5">
              Checklist hoàn thành ({checklist.length})
            </label>
            <div className="space-y-1.5 mb-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#EEF2F8] text-xs text-[#1E2433]"
                >
                  <span className={item.completed ? 'line-through text-slate-400' : ''}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="text-slate-400 hover:text-red-500 p-0.5"
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
                className="flex-1 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E2433] focus:outline-none focus:border-[#3B82F6]"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-1.5 bg-[#EEF2F8] hover:bg-[#E2E8F0] text-xs font-bold text-[#1E2433] rounded-xl"
              >
                Thêm
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-[#EEF2F8] gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {initialTask && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
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
                className="px-2.5 py-1.5 text-[11px] font-bold text-[#1E293B] hover:bg-slate-100/80 rounded-xl transition-all border border-[#E2E8F0] flex items-center gap-1.5 shadow-2xs"
                title="Mở Google Calendar và đưa ca việc này vào lịch của bạn"
              >
                <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Google Calendar</span>
                <ExternalLink className="w-3 h-3 text-[#94A3B8]" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#8F9CAE] hover:text-[#1E2433] hover:bg-[#F4F6FA] rounded-xl transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
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
