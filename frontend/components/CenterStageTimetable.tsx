'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MoreHorizontal,
  Plus,
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckSquare,
  Square,
  Archive,
  Move,
  GripVertical,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  List,
  LayoutGrid,
  CalendarDays,
  Sparkle,
  Search,
  X,
  Filter,
  Bell,
} from 'lucide-react';
import { TaskItem } from '../lib/types';
import { soundEngine } from '../lib/audio';
import { AppSettings } from '../lib/settingsStorage';
import { PALETTES, ColorPalette, resolvePalette } from '../lib/colorPalettes';
import confetti from 'canvas-confetti';
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday as isTodayDate,
} from 'date-fns';

interface CenterStageTimetableProps {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  onAddSlotClick: (dayIndex: number, timeSlot: string, scheduledDate?: string) => void;
  onToggleComplete: (taskId: string) => Promise<void>;
  onToggleChecklist?: (taskId: string, checklistId: string) => Promise<void>;
  onRescheduleTask: (taskId: string, newDayIndex: number, newTimeSlot: string, newDate?: string) => Promise<void>;
  onOpenArchive: () => void;
  onOpenScheduleReminder?: () => void;
  settings?: AppSettings;
}

type ViewMode = 'Week' | 'Agenda' | 'Day' | 'Month';
type Density = 'compact' | 'normal' | 'detailed';
type TimeSpanMode = 'work' | 'autofit' | 'full';

const TIMETABLE_PREFS_KEY = 'cbp_timetable_prefs_v2';

export const CenterStageTimetable: React.FC<CenterStageTimetableProps> = ({
  tasks,
  onTaskClick,
  onAddSlotClick,
  onToggleComplete,
  onToggleChecklist,
  onRescheduleTask,
  onOpenArchive,
  onOpenScheduleReminder,
  settings,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('Week');
  const [density, setDensity] = useState<Density>('compact');
  const [timeSpanMode, setTimeSpanMode] = useState<TimeSpanMode>('work');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ dayIndex: number; timeSlot: string; dateStr: string } | null>(null);

  // Quick Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterThemeGroup, setFilterThemeGroup] = useState<string>('all');

  // Filtered Tasks computation based on search, priority, and palette group
  const displayTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchNote = task.note ? task.note.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchNote) return false;
      }

      // 2. Priority Filter
      if (filterPriority !== 'all') {
        if (filterPriority === 'P1' && !task.priority?.includes('1')) return false;
        if (filterPriority === 'P2' && !task.priority?.includes('2')) return false;
        if (filterPriority === 'P3' && !task.priority?.includes('3')) return false;
      }

      // 3. Color Theme / Group Filter
      if (filterThemeGroup !== 'all') {
        const palette = resolvePalette(task.color_theme);
        if (filterThemeGroup === 'twilight' && palette.group !== 'twilight') return false;
        if (filterThemeGroup === 'forest' && palette.group !== 'forest') return false;
        if (filterThemeGroup === 'designer' && palette.group !== 'designer') return false;
        if (filterThemeGroup === 'classic' && palette.group !== 'classic') return false;
      }

      return true;
    });
  }, [tasks, searchQuery, filterPriority, filterThemeGroup]);

  const hasActiveFilters = searchQuery.trim() !== '' || filterPriority !== 'all' || filterThemeGroup !== 'all';

  const clearAllFilters = () => {
    soundEngine.playSoftClick();
    setSearchQuery('');
    setFilterPriority('all');
    setFilterThemeGroup('all');
  };

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TIMETABLE_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.density) setDensity(parsed.density);
        if (parsed.timeSpanMode) setTimeSpanMode(parsed.timeSpanMode);
        if (parsed.viewMode) setViewMode(parsed.viewMode);
      }
    } catch {}
  }, []);

  // Save preferences to localStorage
  const savePreference = (key: string, value: any) => {
    try {
      const saved = localStorage.getItem(TIMETABLE_PREFS_KEY);
      const existing = saved ? JSON.parse(saved) : {};
      localStorage.setItem(TIMETABLE_PREFS_KEY, JSON.stringify({ ...existing, [key]: value }));
    } catch {}
  };

  const handleSetDensity = (newDensity: Density) => {
    soundEngine.playSoftClick();
    setDensity(newDensity);
    savePreference('density', newDensity);
  };

  const handleSetTimeSpanMode = (newMode: TimeSpanMode) => {
    soundEngine.playSoftClick();
    setTimeSpanMode(newMode);
    savePreference('timeSpanMode', newMode);
  };

  const handleSetViewMode = (newView: ViewMode) => {
    soundEngine.playSoftClick();
    setViewMode(newView);
    savePreference('viewMode', newView);
  };

  // Live real-time tick: updates every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const completedCount = tasks.filter((t) => t.column === 'done').length;

  // Format time display based on user settings (24h vs 12h)
  const formatDisplayTime = (time24: string) => {
    if (settings?.timeFormat !== '12h') return time24;
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h < 10 ? '0' + h : h}:${m} ${ampm}`;
  };

  // Dynamic Week Days based on selectedDate and weekStartsOn setting
  const weekStartConfig = settings?.weekStartsOn !== undefined ? settings.weekStartsOn : 1;
  const currentWeekStart = startOfWeek(selectedDate, { weekStartsOn: weekStartConfig as any });
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(currentWeekStart, i);
      return {
        dateObj: d,
        dateStr: format(d, 'yyyy-MM-dd'),
        displayDate: format(d, 'dd/MM/yyyy'),
        shortDate: format(d, 'dd/MM'),
        name: ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'][i],
        shortName: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i],
        dayNum: d.getDate(),
        isToday: isTodayDate(d),
        index: i,
      };
    });
  }, [currentWeekStart]);

  const isCurrentWeek = weekDays.some((d) => d.isToday);
  const selectedDayIndex = (selectedDate.getDay() + 6) % 7;

  // Dynamic 1-hour resolution time rows with Auto-fit / Work / Full presets
  const activeTimeRows = useMemo(() => {
    let startH = 8;
    let endH = 18;

    if (timeSpanMode === 'full') {
      startH = 6;
      endH = 22;
    } else if (timeSpanMode === 'work') {
      startH = 8;
      endH = 18;
    } else if (timeSpanMode === 'autofit') {
      const weekDateStrs = new Set(weekDays.map((d) => d.dateStr));
      const relevantTasks = tasks.filter((t) => {
        if (t.scheduled_date) return weekDateStrs.has(t.scheduled_date);
        const dIndex = typeof t.day_index === 'number' ? t.day_index : 1;
        return dIndex >= 0 && dIndex <= 6;
      });

      if (relevantTasks.length > 0) {
        let minH = 23;
        let maxH = 0;
        relevantTasks.forEach((t) => {
          const start = t.time_box?.start || '09:00';
          const h = parseInt(start.split(':')[0], 10);
          if (!isNaN(h)) {
            if (h < minH) minH = h;
            if (h > maxH) maxH = h;
          }
        });
        if (minH <= maxH) {
          startH = Math.max(6, minH);
          endH = Math.min(22, maxH + 1);
        }
      } else {
        startH = 8;
        endH = 17;
      }
    }

    const rows: string[] = [];
    for (let h = startH; h <= endH; h++) {
      rows.push(`${h < 10 ? '0' + h : h}:00`);
    }
    return rows;
  }, [timeSpanMode, weekDays, tasks]);

  // Generous row height for clean breathing room
  const rowHeightPx = density === 'compact' ? 56 : density === 'normal' ? 68 : 84;

  // Dynamic real-time needle position
  const getCurrentTimeTop = (now: Date) => {
    if (activeTimeRows.length === 0) return null;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const firstHour = parseInt(activeTimeRows[0].split(':')[0], 10);
    const lastHour = parseInt(activeTimeRows[activeTimeRows.length - 1].split(':')[0], 10);

    const startMinutes = firstHour * 60;
    const endMinutes = (lastHour + 1) * 60;

    if (currentMinutes < startMinutes || currentMinutes > endMinutes) return null;

    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const hourIndex = currentH - firstHour;

    if (hourIndex < 0 || hourIndex >= activeTimeRows.length) return null;

    const progress = currentM / 60;
    return Math.round((hourIndex + progress) * rowHeightPx);
  };

  const currentTimeTop = getCurrentTimeTop(currentTime);

  // Week navigation
  const handlePrevWeek = () => {
    soundEngine.playSoftClick();
    setSelectedDate((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    soundEngine.playSoftClick();
    setSelectedDate((prev) => addWeeks(prev, 1));
  };

  const handleToday = () => {
    soundEngine.playSoftClick();
    const now = new Date();
    setSelectedDate(now);
    setCurrentMonth(now);
  };

  // Completion trigger with chime and confetti
  const handleTaskComplete = async (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    soundEngine.playPentatonicChime(3);
    try {
      if (settings?.confettiEnabled !== false && typeof window !== 'undefined') {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#AE445A', '#235347', '#F39F5A', '#446592', '#FF5959'],
        });
      }
    } catch {}

    await onToggleComplete(task.id);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
    soundEngine.playSoftClick();
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number, timeSlot: string, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dropTarget || dropTarget.dayIndex !== dayIndex || dropTarget.timeSlot !== timeSlot || dropTarget.dateStr !== dateStr) {
      setDropTarget({ dayIndex, timeSlot, dateStr });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dayIndex: number, timeSlot: string, dateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDropTarget(null);

    if (taskId) {
      soundEngine.playSoftClick();
      await onRescheduleTask(taskId, dayIndex, timeSlot, dateStr);
    }
  };

  // Month navigation with date-fns
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToTodayMonth = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Generate month days using date-fns
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="flex-1 min-h-0 flex flex-col pt-1">
      {/* Top Header: Title, Controls & Switchers */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-extrabold text-[#1E2433] tracking-tight">
              Lịch Biểu & Quản Lý Công Việc
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EBF3FF] text-[#2563EB] border border-[#BFDBFE]/60">
              {viewMode === 'Week'
                ? `Tuần: ${weekDays[0].shortDate} — ${weekDays[6].shortDate}`
                : viewMode === 'Agenda'
                ? `Lịch trình tuần: ${weekDays[0].shortDate} — ${weekDays[6].shortDate}`
                : viewMode === 'Day'
                ? `${weekDays[selectedDayIndex]?.name} (${weekDays[selectedDayIndex]?.displayDate})`
                : `Tháng ${format(currentMonth, 'MM/yyyy')}`}
            </span>
            {viewMode === 'Week' && timeSpanMode === 'autofit' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]/60 flex items-center gap-1">
                <Sparkle className="w-2.5 h-2.5" />
                Tự co giãn ({activeTimeRows[0]} - {activeTimeRows[activeTimeRows.length - 1]})
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#8F9CAE] mt-0.5">
            {viewMode === 'Week'
              ? 'Thẻ công việc màu sắc đậm đà chuẩn Designer Palettes (Twilight, Deep Forest, Sunset Amber)'
              : viewMode === 'Agenda'
              ? 'Xem dòng thời gian không khoảng trống: hiển thị đúng các công việc cần làm trong tuần'
              : viewMode === 'Day'
              ? 'Chi tiết từng khung giờ trong ngày, bấm để tạo nhanh công việc'
              : 'Tổng quan cả tháng: Bấm vào ngày để lên lịch cho tuần tương lai'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick link to Completed Archive */}
          <button
            onClick={onOpenArchive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E6F9F0] text-[#059669] text-xs font-bold hover:bg-[#D1FAE5] border border-[#A7F3D0] transition-all shadow-2xs"
            title="Xem kho lưu trữ các task đã hoàn thành"
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kho Đã Xong</span>
            <span className="sm:hidden">Xong</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] ml-0.5 font-black">
              {completedCount}
            </span>
          </button>

          {/* Time range mode selector (Work / Auto-fit / Full) */}
          {(viewMode === 'Week' || viewMode === 'Day') && (
            <div className="flex items-center bg-[#F4F6FA] p-0.5 rounded-full text-xs font-bold text-[#64748B] border border-[#E5EDF6]">
              <button
                onClick={() => handleSetTimeSpanMode('work')}
                className={`px-2.5 py-1 rounded-full transition-all text-[11px] ${
                  timeSpanMode === 'work'
                    ? 'bg-white text-[#2563EB] shadow-2xs font-extrabold'
                    : 'hover:text-[#1E2433]'
                }`}
                title="Khung giờ hành chính: 08:00 - 18:00 (Gọn gàng nhất)"
              >
                Hành chính
              </button>
              <button
                onClick={() => handleSetTimeSpanMode('autofit')}
                className={`px-2.5 py-1 rounded-full transition-all text-[11px] flex items-center gap-1 ${
                  timeSpanMode === 'autofit'
                    ? 'bg-white text-[#059669] shadow-2xs font-extrabold'
                    : 'hover:text-[#1E2433]'
                }`}
                title="Tự động thu hẹp giờ theo các công việc thực tế trong tuần"
              >
                <Sparkle className="w-2.5 h-2.5" />
                Tự co giãn
              </button>
              <button
                onClick={() => handleSetTimeSpanMode('full')}
                className={`px-2.5 py-1 rounded-full transition-all text-[11px] ${
                  timeSpanMode === 'full'
                    ? 'bg-white text-[#2563EB] shadow-2xs font-extrabold'
                    : 'hover:text-[#1E2433]'
                }`}
                title="Toàn ngày: 06:00 - 22:00"
              >
                Toàn ngày
              </button>
            </div>
          )}

          {/* Row Density Selector (Compact / Normal / Detailed) */}
          {viewMode === 'Week' && (
            <div className="flex items-center bg-[#F4F6FA] p-0.5 rounded-full border border-[#E5EDF6]" title="Độ cao dòng hiển thị">
              <button
                onClick={() => handleSetDensity('compact')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                  density === 'compact'
                    ? 'bg-white text-[#2563EB] shadow-2xs font-black'
                    : 'text-[#8F9CAE] hover:text-[#1E2433]'
                }`}
                title="Gọn gàng (56px) - Vừa vặn màn hình"
              >
                Gọn
              </button>
              <button
                onClick={() => handleSetDensity('normal')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                  density === 'normal'
                    ? 'bg-white text-[#2563EB] shadow-2xs font-black'
                    : 'text-[#8F9CAE] hover:text-[#1E2433]'
                }`}
                title="Tiêu chuẩn (68px)"
              >
                Vừa
              </button>
              <button
                onClick={() => handleSetDensity('detailed')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                  density === 'detailed'
                    ? 'bg-white text-[#2563EB] shadow-2xs font-black'
                    : 'text-[#8F9CAE] hover:text-[#1E2433]'
                }`}
                title="Chi tiết rộng (84px)"
              >
                Rộng
              </button>
            </div>
          )}

          {/* Main View Switcher Pills */}
          <div className="flex items-center bg-[#F1F4F9] p-0.5 rounded-full text-xs font-semibold text-[#8F9CAE] border border-[#E2E8F0]">
            <button
              onClick={() => handleSetViewMode('Week')}
              className={`px-3 py-1 rounded-full transition-all text-xs font-bold flex items-center gap-1 ${
                viewMode === 'Week'
                  ? 'bg-[#2563EB] text-white shadow-2xs font-extrabold'
                  : 'hover:text-[#1E2433]'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Lưới Tuần</span>
            </button>
            <button
              onClick={() => handleSetViewMode('Agenda')}
              className={`px-3 py-1 rounded-full transition-all text-xs font-bold flex items-center gap-1 ${
                viewMode === 'Agenda'
                  ? 'bg-[#2563EB] text-white shadow-2xs font-extrabold'
                  : 'hover:text-[#1E2433]'
              }`}
            >
              <List className="w-3 h-3" />
              <span>Lịch Trình</span>
            </button>
            <button
              onClick={() => handleSetViewMode('Day')}
              className={`px-2.5 py-1 rounded-full transition-all text-xs font-bold ${
                viewMode === 'Day'
                  ? 'bg-[#2563EB] text-white shadow-2xs font-extrabold'
                  : 'hover:text-[#1E2433]'
              }`}
            >
              Ngày
            </button>
            <button
              onClick={() => handleSetViewMode('Month')}
              className={`px-2.5 py-1 rounded-full transition-all text-xs font-bold flex items-center gap-1 ${
                viewMode === 'Month'
                  ? 'bg-[#2563EB] text-white shadow-2xs font-extrabold'
                  : 'hover:text-[#1E2433]'
              }`}
            >
              <CalendarDays className="w-3 h-3" />
              <span>Tháng</span>
            </button>
          </div>

          {/* Quick Schedule Reminder & Calendar Button */}
          {onOpenScheduleReminder && (
            <button
              onClick={() => {
                soundEngine.playSoftClick();
                onOpenScheduleReminder();
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-[#1E2433] border border-[#CBD5E1] rounded-full text-xs font-bold transition-all shadow-2xs group"
              title="Nhắc việc tự động qua email & Đồng bộ Google Calendar"
            >
              <Bell className="w-3.5 h-3.5 text-[#2563EB] group-hover:scale-110 transition-transform" />
              <span>Nhắc Lịch & Calendar</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter & Search Bar */}
      <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-2xl mb-2.5 shrink-0 shadow-2xs space-y-2">
        <div className="flex items-center gap-2 justify-between flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm công việc, ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#1E293B] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Filter Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Priority Quick Filter */}
            <div className="flex items-center bg-[#F1F4F9] p-0.5 rounded-xl border border-[#E2E8F0] text-[11px] font-bold">
              {[
                { id: 'all', label: 'Tất cả mức' },
                { id: 'P1', label: 'P1 Cốt lõi' },
                { id: 'P2', label: 'P2 Quan trọng' },
                { id: 'P3', label: 'P3 Tiêu chuẩn' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    soundEngine.playSoftClick();
                    setFilterPriority(p.id);
                  }}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    filterPriority === p.id
                      ? 'bg-white text-[#1E293B] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Color Palette Quick Filter */}
            <div className="flex items-center bg-[#F1F4F9] p-0.5 rounded-xl border border-[#E2E8F0] text-[11px] font-bold">
              {[
                { id: 'all', label: 'Mọi bảng màu' },
                { id: 'twilight', label: 'Twilight', hex: '#AE445A' },
                { id: 'forest', label: 'Deep Forest', hex: '#235347' },
                { id: 'designer', label: 'Designer Grid', hex: '#01D1FF' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    soundEngine.playSoftClick();
                    setFilterThemeGroup(c.id);
                  }}
                  className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    filterThemeGroup === c.id
                      ? 'bg-white text-[#1E293B] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {c.hex && <span style={{ backgroundColor: c.hex }} className="w-1.5 h-1.5 rounded-full inline-block" />}
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Clear Filter button */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1 border border-rose-200"
              >
                <X className="w-3 h-3" />
                <span>Xóa lọc ({displayTasks.length}/{tasks.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Week Navigator Bar */}
      {(viewMode === 'Week' || viewMode === 'Agenda') && (
        <div className="flex items-center justify-between bg-[#FAFBFD] border border-[#E2E8F0] p-2 rounded-2xl mb-2.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevWeek}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#334155] flex items-center gap-1 transition-colors shadow-2xs"
              title="Xem tuần trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Tuần trước</span>
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] transition-colors"
            >
              Hiện tại
            </button>
            <button
              onClick={handleNextWeek}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#334155] flex items-center gap-1 transition-colors shadow-2xs"
              title="Lên lịch tuần tới"
            >
              <span>Tuần sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Jump to specific future date */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#64748B] font-bold hidden sm:inline">Nhảy đến ngày:</span>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  const parts = e.target.value.split('-');
                  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                  setSelectedDate(d);
                }
              }}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#CBD5E1] bg-white text-[#1E2433] focus:border-[#2563EB] outline-none shadow-2xs"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: WEEK GRID VIEW (TỐI ƯU 1-TIẾNG, GỌN GÀNG, KÉO THẢ DRAG & DROP)     */}
      {/* ========================================================================= */}
      {viewMode === 'Week' && (
        <div className="border border-[#DCE4F0] rounded-2xl overflow-hidden bg-white shadow-2xs flex-1 flex flex-col">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            <div className="min-w-[840px]">
              {/* Day Headers Row */}
              <div className="grid grid-cols-[64px_repeat(7,1fr)] bg-[#F8FAFD] border-b border-[#DCE4F0] text-center sticky top-0 z-20 shadow-xs">
                <div className="py-2 text-[10px] font-extrabold text-[#8F9CAE] border-r border-[#DCE4F0] flex items-center justify-center bg-[#F8FAFD]">
                  GIỜ
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.dateStr}
                    onClick={() => {
                      setSelectedDate(day.dateObj);
                      setViewMode('Day');
                    }}
                    className={`py-1.5 px-1 border-r border-[#DCE4F0] last:border-r-0 cursor-pointer transition-colors ${
                      day.isToday ? 'bg-[#EBF3FF]/80 font-bold' : 'hover:bg-[#F1F5FB]'
                    }`}
                  >
                    <p
                      className={`text-[11px] font-extrabold ${
                        day.isToday ? 'text-[#2563EB]' : 'text-[#1E2433]'
                      }`}
                    >
                      {day.name}
                    </p>
                    <p className={`text-[9px] mt-0.2 ${day.isToday ? 'text-[#2563EB] font-bold' : 'text-[#8F9CAE]'}`}>
                      {day.shortDate}
                    </p>
                  </div>
                ))}
              </div>

              {/* Time Matrix Rows with Drag & Drop Zones */}
              <div className="relative divide-y divide-[#E2E8F0] pb-20">
                {/* Real-time dynamic needle indicator with live badge */}
                {isCurrentWeek && currentTimeTop !== null && (
                  <div
                    className="absolute left-0 right-0 z-30 flex items-center pointer-events-none transition-all duration-500 ease-linear"
                    style={{ top: `${currentTimeTop}px` }}
                  >
                    <div className="w-[64px] flex justify-end pr-1 shrink-0">
                      <span className="px-1.5 py-0.5 rounded-md bg-[#2563EB] text-white text-[9px] font-black shadow-[0_2px_6px_rgba(37,99,235,0.4)] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        {format(currentTime, settings?.timeFormat === '12h' ? 'hh:mm a' : 'HH:mm')}
                      </span>
                    </div>

                    <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB] border-2 border-white shadow-[0_0_8px_#2563EB] -ml-1 shrink-0" />
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#60A5FA] shadow-[0_0_8px_rgba(37,99,235,0.45)]" />
                  </div>
                )}

                {activeTimeRows.map((timeRow) => {
                  const [rowHour] = timeRow.split(':').map(Number);

                  return (
                    <div
                      key={timeRow}
                      style={{ minHeight: `${rowHeightPx}px` }}
                      className="grid grid-cols-[64px_repeat(7,1fr)] items-stretch group"
                    >
                      {/* Time Column */}
                      <div
                        className="text-right pr-2 pt-1.5 text-[10px] font-bold border-r border-[#DCE4F0] bg-[#FAFCFF] select-none text-[#8F9CAE]"
                      >
                        {formatDisplayTime(timeRow)}
                      </div>

                      {/* 7 Day Slot Drop Cells */}
                      {weekDays.map((day) => {
                        const cellTasks = displayTasks
                          .filter((t) => {
                            if (t.scheduled_date) {
                              if (t.scheduled_date !== day.dateStr) return false;
                            } else {
                              const dIndex = typeof t.day_index === 'number' ? t.day_index : 1;
                              if (dIndex !== day.index) return false;
                            }

                            const start = t.time_box?.start || '09:00';
                            const [tH] = start.split(':').map(Number);
                            return (tH ?? 9) === rowHour;
                          })
                          .sort((a, b) => {
                            const aTime = a.time_box?.start || '00:00';
                            const bTime = b.time_box?.start || '00:00';
                            return aTime.localeCompare(bTime);
                          });

                        const hasTask = cellTasks.length > 0;
                        const isTarget =
                          dropTarget?.dayIndex === day.index &&
                          dropTarget?.timeSlot === timeRow &&
                          dropTarget?.dateStr === day.dateStr;

                        return (
                          <div
                            key={day.dateStr}
                            onDragOver={(e) => handleDragOver(e, day.index, timeRow, day.dateStr)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day.index, timeRow, day.dateStr)}
                            onClick={() => {
                              if (!hasTask) {
                                onAddSlotClick(day.index, timeRow, day.dateStr);
                              }
                            }}
                            className={`border-r border-[#E2E8F0] last:border-r-0 p-1.5 transition-all relative ${
                              isTarget
                                ? 'bg-blue-100/90 ring-2 ring-inset ring-[#2563EB] scale-[1.01]'
                                : day.isToday
                                ? 'bg-[#FAFBFD]'
                                : 'bg-white'
                            } ${
                              !hasTask
                                ? 'hover:bg-[#F8FAFD] cursor-pointer group/cell'
                                : ''
                            } flex flex-col justify-center`}
                          >
                            {hasTask ? (
                              <div className={`w-full ${cellTasks.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-1.5' : 'flex flex-col'}`}>
                                {cellTasks.map((task) => {
                                  const palette = resolvePalette(task.color_theme);
                                  const isCompleted = task.column === 'done';
                                  const isBeingDragged = draggedTaskId === task.id;
                                  const completedChk = task.definition_of_done
                                    ? task.definition_of_done.filter((c) => c.completed).length
                                    : 0;
                                  const totalChk = task.definition_of_done
                                    ? task.definition_of_done.length
                                    : 0;

                                  // Short priority label to prevent awkward wrapping
                                  const priorityShort = task.priority
                                    ? task.priority.includes('1')
                                      ? 'P1'
                                      : task.priority.includes('2')
                                      ? 'P2'
                                      : 'P3'
                                    : null;

                                  const isMulti = cellTasks.length > 1;

                                  return (
                                    <div
                                      key={task.id}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, task.id)}
                                      onDragEnd={handleDragEnd}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onTaskClick(task);
                                      }}
                                      style={{
                                        backgroundColor: isCompleted ? '#94A3B8' : palette.hex,
                                        color: palette.textColor,
                                      }}
                                      className={`group/task relative w-full rounded-xl transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
                                        isMulti ? 'p-1.5' : 'p-2'
                                      } ${
                                        isCompleted
                                          ? 'shadow-2xs opacity-40 saturate-50'
                                          : 'shadow-xs hover:shadow-md hover:-translate-y-0.5'
                                      } flex flex-col justify-between gap-1 border border-white/15 ${
                                        isBeingDragged ? 'opacity-20 scale-95' : ''
                                      }`}
                                      title={`${task.title} (${task.time_box?.start || timeRow}) — Kéo để đổi ngày/giờ`}
                                    >
                                      {/* Top Row: Time Chip + Priority Tag + Action Checkbox */}
                                      <div className="flex items-center justify-between gap-1 w-full">
                                        <div className="flex items-center gap-1 min-w-0">
                                          {/* Time Chip */}
                                          <span
                                            style={{
                                              backgroundColor: isCompleted ? 'rgba(255,255,255,0.2)' : palette.badgeBg,
                                              color: palette.badgeText,
                                            }}
                                            className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black tracking-tight tabular-nums whitespace-nowrap leading-none"
                                          >
                                            {task.time_box?.start || timeRow}
                                          </span>

                                          {/* Priority Tag */}
                                          {priorityShort && (
                                            <span
                                              style={{
                                                backgroundColor: isCompleted ? 'rgba(255,255,255,0.2)' : palette.badgeBg,
                                                color: palette.badgeText,
                                              }}
                                              className="px-1 py-0.5 rounded-md text-[8px] font-black uppercase whitespace-nowrap leading-none tracking-wider"
                                            >
                                              {priorityShort}
                                            </span>
                                          )}

                                          {/* Checklist Counter */}
                                          {totalChk > 0 && !isMulti && (
                                            <span
                                              style={{ color: palette.textColor }}
                                              className="text-[8px] font-bold opacity-80 flex items-center gap-0.5 whitespace-nowrap leading-none"
                                            >
                                              <CheckSquare className="w-2.5 h-2.5" />
                                              {completedChk}/{totalChk}
                                            </span>
                                          )}
                                        </div>

                                        {/* Right Action: Checkbox & Hover Grip */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => handleTaskComplete(e, task)}
                                            title={isCompleted ? 'Mở lại công việc' : 'Đánh dấu hoàn thành'}
                                            className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                                              isCompleted
                                                ? 'bg-white text-emerald-600 shadow-2xs'
                                                : 'border border-white/50 hover:bg-white/20 text-white'
                                            }`}
                                          >
                                            <CheckCircle2
                                              className={`w-3 h-3 ${isCompleted ? 'fill-emerald-600 text-white' : 'stroke-[2]'}`}
                                            />
                                          </button>

                                          <GripVertical className="w-2.5 h-2.5 text-white/60 opacity-0 group-hover/task:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
                                        </div>
                                      </div>

                                      {/* Bottom Row: Title with clean typography */}
                                      <div className="w-full">
                                        <h4
                                          style={{ color: palette.textColor }}
                                          className={`font-extrabold truncate leading-tight tracking-tight ${
                                            isMulti ? 'text-[10px]' : 'text-[11px]'
                                          } ${isCompleted ? 'line-through opacity-70' : ''}`}
                                        >
                                          {task.title}
                                        </h4>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Clean, minimal Atelier hover state (No childish blue dashed box!) */
                              <div className="w-full h-full min-h-[36px] flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150">
                                <span className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1 px-2.5 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 transition-all shadow-2xs">
                                  <Plus className="w-3 h-3 text-slate-600" />
                                  <span>Thêm việc</span>
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: AGENDA VIEW (LỊCH TRÌNH KHÔNG KHOẢNG TRỐNG THỪA - SIÊU TỐI ƯU UX) */}
      {/* ========================================================================= */}
      {viewMode === 'Agenda' && (
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {weekDays.map((day) => {
            const dayTasks = displayTasks
              .filter((t) => {
                if (t.scheduled_date) return t.scheduled_date === day.dateStr;
                const dIndex = typeof t.day_index === 'number' ? t.day_index : 1;
                return dIndex === day.index;
              })
              .sort((a, b) => {
                const aTime = a.time_box?.start || '00:00';
                const bTime = b.time_box?.start || '00:00';
                return aTime.localeCompare(bTime);
              });

            return (
              <div
                key={day.dateStr}
                className={`rounded-2xl border transition-all ${
                  day.isToday
                    ? 'border-[#BFDBFE] bg-[#F8FAFF] shadow-xs'
                    : 'border-[#E2E8F0] bg-white'
                } p-3.5`}
              >
                {/* Day Header Strip */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                        day.isToday
                          ? 'bg-[#2563EB] text-white shadow-2xs'
                          : 'bg-[#F1F5F9] text-[#1E2433]'
                      }`}
                    >
                      {day.name}
                    </span>
                    <span className="text-xs font-bold text-[#64748B]">
                      {day.displayDate}
                    </span>
                    {day.isToday && (
                      <span className="text-[10px] font-extrabold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE]">
                        Hôm nay
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8F9CAE] font-bold">
                      {dayTasks.length} việc
                    </span>
                    <button
                      onClick={() => onAddSlotClick(day.index, '09:00', day.dateStr)}
                      className="px-2 py-1 text-[11px] font-bold text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg border border-transparent hover:border-[#BFDBFE] flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm việc</span>
                    </button>
                  </div>
                </div>

                {/* Day Tasks List */}
                {dayTasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dayTasks.map((task) => {
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
                          className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 ${palette.shadow} hover:-translate-y-0.5 ${
                            isCompleted ? 'opacity-40 saturate-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Time badge */}
                            <span
                              style={{
                                backgroundColor: isCompleted ? 'rgba(255,255,255,0.2)' : palette.badgeBg,
                                color: palette.badgeText,
                              }}
                              className="px-2 py-0.5 rounded-full text-[10px] font-black shrink-0"
                            >
                              {task.time_box?.start || '09:00'}
                            </span>

                            <div className="min-w-0">
                              <h4 className="text-xs font-black truncate drop-shadow-xs">
                                {task.title}
                              </h4>
                              {task.priority && (
                                <span className="text-[9px] font-extrabold opacity-80 uppercase">
                                  {task.priority}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => handleTaskComplete(e, task)}
                            title={isCompleted ? 'Mở lại' : 'Hoàn thành'}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                              isCompleted
                                ? 'bg-white text-emerald-600'
                                : 'border border-white/60 hover:bg-white/20 text-white'
                            }`}
                          >
                            <CheckCircle2
                              className={`w-3.5 h-3.5 ${
                                isCompleted ? 'fill-emerald-600 text-white' : 'stroke-[2.5]'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    onClick={() => onAddSlotClick(day.index, '09:00', day.dateStr)}
                    className="py-2.5 px-3 rounded-xl border border-dashed border-[#E2E8F0] hover:border-[#2563EB] text-center text-xs text-[#8F9CAE] hover:text-[#2563EB] cursor-pointer hover:bg-[#F8FAFD] transition-colors"
                  >
                    + Không có công việc nào. Bấm vào đây để thêm việc nhanh.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: DAY VIEW (CHI TIẾT THEO NGÀY CÓ KHUNG GIỜ TỐI ƯU)                 */}
      {/* ========================================================================= */}
      {viewMode === 'Day' && (
        <div className="space-y-3 flex-1 flex flex-col">
          {/* Day selection tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
            {weekDays.map((day) => (
              <button
                key={day.dateStr}
                onClick={() => {
                  soundEngine.playSoftClick();
                  setSelectedDate(day.dateObj);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  isSameDay(selectedDate, day.dateObj)
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                    : 'bg-white text-[#4B5565] border-[#E2E8F0] hover:bg-[#F8FAFC]'
                }`}
              >
                <span>{day.name}</span>
                <span className="ml-1.5 opacity-80 text-[10px]">
                  ({day.shortDate})
                </span>
                {day.isToday && (
                  <span className="ml-1 text-[8px] bg-white/30 text-white px-1.5 py-0.2 rounded-full font-black">
                    Hôm nay
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Timeline schedule */}
          <div className="bg-white border border-[#DCE4F0] rounded-2xl p-3 shadow-2xs divide-y divide-[#EEF2F8] flex-1 overflow-y-auto max-h-[calc(100vh-320px)]">
            {activeTimeRows.map((timeSlot) => {
              const activeDateStr = format(selectedDate, 'yyyy-MM-dd');
              const [rowHour] = timeSlot.split(':').map(Number);

              const slotTasks = displayTasks.filter((t) => {
                if (t.scheduled_date) {
                  if (t.scheduled_date !== activeDateStr) return false;
                } else {
                  const dIndex = typeof t.day_index === 'number' ? t.day_index : 1;
                  if (dIndex !== selectedDayIndex) return false;
                }
                const start = t.time_box?.start || '09:00';
                const [tH] = start.split(':').map(Number);
                return (tH ?? 9) === rowHour;
              });

              return (
                <div key={timeSlot} className="py-2.5 flex items-start gap-3 group">
                  <div className="w-14 shrink-0 pt-0.5 text-right">
                    <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded-md">
                      {formatDisplayTime(timeSlot)}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    {slotTasks.length > 0 ? (
                      slotTasks.map((task) => {
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
                            className={`rounded-2xl p-3 cursor-pointer transition-all ${palette.shadow} hover:-translate-y-0.5 space-y-1.5 ${
                              isCompleted ? 'opacity-40 saturate-50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  style={{
                                    backgroundColor: isCompleted ? 'rgba(255,255,255,0.2)' : palette.badgeBg,
                                    color: palette.badgeText,
                                  }}
                                  className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                >
                                  {task.time_box?.start || timeSlot}
                                </span>
                                <span className="text-xs font-black truncate drop-shadow-xs">
                                  {task.title}
                                </span>
                              </div>
                              <button
                                onClick={(e) => handleTaskComplete(e, task)}
                                className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                                  isCompleted
                                    ? 'bg-white text-emerald-600'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{task.column === 'done' ? 'Đã xong' : 'Chốt xong'}</span>
                              </button>
                            </div>

                            {task.definition_of_done && task.definition_of_done.length > 0 && (
                              <div className="space-y-1 pt-1 border-t border-white/20">
                                {task.definition_of_done.map((chk) => (
                                  <div
                                    key={chk.id}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (onToggleChecklist) {
                                        soundEngine.playSoftClick();
                                        await onToggleChecklist(task.id, chk.id);
                                      }
                                    }}
                                    className="flex items-center gap-2 text-xs text-white/90 hover:text-white"
                                  >
                                    {chk.completed ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-white/60" />
                                    )}
                                    <span
                                      className={`truncate ${
                                        chk.completed ? 'line-through text-white/60' : ''
                                      }`}
                                    >
                                      {chk.text}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <button
                        onClick={() => onAddSlotClick(selectedDayIndex, timeSlot, activeDateStr)}
                        className="w-full py-1.5 border border-dashed border-[#E2E8F0] hover:border-[#2563EB] rounded-2xl text-[11px] font-semibold text-[#8F9CAE] hover:text-[#2563EB] flex items-center justify-center gap-1 transition-all hover:bg-[#F8FAFD]"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Thêm việc lúc {timeSlot}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: MONTH VIEW (ĐẶT LỊCH THEO THÁNG TƯƠNG LAI DÙNG DATE-FNS)           */}
      {/* ========================================================================= */}
      {viewMode === 'Month' && (
        <div className="bg-white border border-[#DCE4F0] rounded-2xl p-4 shadow-2xs space-y-3">
          {/* Month Navigation Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F8]">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-sm font-extrabold text-[#1E2433]">
                Tháng {format(currentMonth, 'MM / yyyy')}
              </h3>
              <span className="text-[10px] text-[#8F9CAE] font-medium hidden sm:inline">
                (Bấm vào bất kỳ ngày nào để xem & lên lịch cho tuần tương lai đó)
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[#8F9CAE]">
              <button
                onClick={prevMonth}
                className="p-1.5 hover:text-[#1E2433] hover:bg-[#F4F6FA] rounded-lg border border-[#E2E8F0] transition-colors"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToTodayMonth}
                className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-lg border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors"
              >
                Hiện tại
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:text-[#1E2433] hover:bg-[#F4F6FA] rounded-lg border border-[#E2E8F0] transition-colors"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 7 Columns Days of Week */}
          <div className="grid grid-cols-7 text-center text-[11px] font-extrabold text-[#8F9CAE] py-1.5 bg-[#F8FAFD] rounded-xl border border-[#E2E8F0]">
            <div>Thứ 2</div>
            <div>Thứ 3</div>
            <div>Thứ 4</div>
            <div>Thứ 5</div>
            <div>Thứ 6</div>
            <div>Thứ 7</div>
            <div>Chủ Nhật</div>
          </div>

          {/* Month Calendar Grid with Date-Fns */}
          <div className="grid grid-cols-7 gap-1.5">
            {monthDays.map((dayDate) => {
              const isCurrentMonth = isSameMonth(dayDate, currentMonth);
              const isToday = isTodayDate(dayDate);
              const dateStr = format(dayDate, 'yyyy-MM-dd');

              // Match tasks on this exact day
              const dateTasks = displayTasks.filter((t) => {
                if (t.scheduled_date) return t.scheduled_date === dateStr;
                const dIndex = typeof t.day_index === 'number' ? t.day_index : 1;
                const dayOfWeek = (dayDate.getDay() + 6) % 7;
                return dIndex === dayOfWeek && isCurrentMonth;
              });

              return (
                <div
                  key={dayDate.toISOString()}
                  onClick={() => {
                    soundEngine.playSoftClick();
                    setSelectedDate(dayDate);
                    setViewMode('Week');
                  }}
                  className={`min-h-[64px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    !isCurrentMonth
                      ? 'bg-slate-50/50 border-[#F1F4FA] opacity-40'
                      : isToday
                      ? 'border-[#2563EB] bg-[#EFF6FF] shadow-2xs font-bold'
                      : 'border-[#E2E8F0] hover:border-[#2563EB] bg-white hover:bg-[#F8FAFD]'
                  }`}
                  title={`Lên lịch cho ngày ${format(dayDate, 'dd/MM/yyyy')}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px]'
                          : isCurrentMonth
                          ? 'text-[#1E2433]'
                          : 'text-slate-400'
                      }`}
                    >
                      {format(dayDate, 'd')}
                    </span>
                    {dateTasks.length > 0 && (
                      <span className="text-[9px] font-bold px-1.5 rounded-full bg-[#2563EB] text-white">
                        {dateTasks.length}
                      </span>
                    )}
                  </div>

                  {dateTasks.length > 0 && (
                    <div className="space-y-0.5 mt-1">
                      {dateTasks.slice(0, 1).map((t) => (
                        <div
                          key={t.id}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#2563EB] text-white truncate"
                        >
                          {t.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
