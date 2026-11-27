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
  const [showFilters, setShowFilters] = useState(false);

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

  // Load preferences from localStorage; default to Day view on narrow mobile screens
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TIMETABLE_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.density) setDensity(parsed.density);
        if (parsed.timeSpanMode) setTimeSpanMode(parsed.timeSpanMode);
        if (parsed.viewMode) {
          setViewMode(parsed.viewMode);
          return;
        }
      }
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setViewMode('Day');
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

  const isDark = settings?.theme === 'midnight';

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Row 1: Title, Week Navigation & View Mode Switchers */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
            Thời Khóa Biểu
          </h2>
          <span className={`text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full border ${
            isDark
              ? 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30'
              : 'bg-[#FEF08A] text-[#0F172A] border-[#0F172A]/40'
          }`}>
            {viewMode === 'Week'
              ? `${weekDays[0].shortDate} — ${weekDays[6].shortDate}`
              : viewMode === 'Agenda'
              ? `Tuần ${weekDays[0].shortDate} — ${weekDays[6].shortDate}`
              : viewMode === 'Day'
              ? `${weekDays[selectedDayIndex]?.name} (${weekDays[selectedDayIndex]?.displayDate})`
              : `Tháng ${format(currentMonth, 'MM/yyyy')}`}
          </span>

          {(viewMode === 'Week' || viewMode === 'Agenda') && (
            <div className="inline-flex items-center bg-white border border-[#0F172A]/20 rounded-xl p-0.5 text-[11px] font-bold text-[#0F172A]">
              <button
                onClick={handlePrevWeek}
                className="p-1 rounded-lg hover:bg-[#FFF1F2] text-slate-600 hover:text-[#E11D48] transition-colors cursor-pointer"
                title="Tuần trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleToday}
                className="px-2 py-0.5 rounded-lg hover:bg-[#FFE4E6] text-[#E11D48] font-extrabold transition-colors cursor-pointer"
                title="Quay về tuần hiện tại"
              >
                Hôm nay
              </button>
              <button
                onClick={handleNextWeek}
                className="p-1 rounded-lg hover:bg-[#FFF1F2] text-slate-600 hover:text-[#E11D48] transition-colors cursor-pointer"
                title="Tuần sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Main View Switcher Pills */}
          <div className="flex items-center bg-white p-0.5 rounded-xl text-[11px] font-bold text-[#0F172A] border border-[#0F172A]/20">
            <button
              onClick={() => handleSetViewMode('Week')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'Week' ? 'bg-[#E11D48] text-white font-extrabold' : 'hover:bg-[#FFF1F2]'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Tuần</span>
            </button>
            <button
              onClick={() => handleSetViewMode('Agenda')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'Agenda' ? 'bg-[#E11D48] text-white font-extrabold' : 'hover:bg-[#FFF1F2]'
              }`}
            >
              <List className="w-3 h-3" />
              <span>Lịch trình</span>
            </button>
            <button
              onClick={() => handleSetViewMode('Day')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'Day' ? 'bg-[#E11D48] text-white font-extrabold' : 'hover:bg-[#FFF1F2]'
              }`}
            >
              Ngày
            </button>
            <button
              onClick={() => handleSetViewMode('Month')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'Month' ? 'bg-[#E11D48] text-white font-extrabold' : 'hover:bg-[#FFF1F2]'
              }`}
            >
              <CalendarDays className="w-3 h-3" />
              <span>Tháng</span>
            </button>
          </div>

          {/* Completed Archive */}
          <button
            onClick={onOpenArchive}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#DCFCE7]/85 hover:bg-[#DCFCE7] text-[#15803D] text-[11px] font-extrabold border border-emerald-300 transition-colors cursor-pointer"
            title="Xem kho lưu trữ các task đã hoàn thành"
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đã xong</span>
            <span className="px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
              {completedCount}
            </span>
          </button>

          {/* Schedule Reminder */}
          {onOpenScheduleReminder && (
            <button
              onClick={() => {
                soundEngine.playSoftClick();
                onOpenScheduleReminder();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border border-[#0F172A]/30 rounded-xl text-[11px] font-extrabold transition-colors cursor-pointer"
              title="Nhắc việc tự động qua email & Đồng bộ Google Calendar"
            >
              <Bell className="w-3.5 h-3.5 text-[#E11D48]" />
              <span className="hidden sm:inline">Nhắc lịch</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Calm Unified Search, Date Jump, Display Controls & Collapsible Filter Trigger */}
      <div className="bg-white/95 border border-[#0F172A]/20 px-2.5 py-1.5 rounded-2xl mb-2.5 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm công việc, ghi chú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1 bg-[#FFFDF7] border border-slate-200 rounded-xl text-xs font-medium text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-[#E11D48] rounded-full cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playSoftClick();
                setShowFilters((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer shrink-0 ${
                showFilters || filterPriority !== 'all' || filterThemeGroup !== 'all'
                  ? 'bg-[#FFE4E6] text-[#E11D48] border-[#E11D48]/40'
                  : 'bg-[#FFFDF7] text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>Bộ lọc</span>
              {(filterPriority !== 'all' || filterThemeGroup !== 'all') && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-2 py-1 text-[11px] font-bold text-[#E11D48] hover:bg-[#FFE4E6] rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
                <span>Xóa ({displayTasks.length})</span>
              </button>
            )}
          </div>

          {/* Compact Display Controls (Time Span, Density, Date Jump) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(viewMode === 'Week' || viewMode === 'Day') && (
              <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl text-[11px] font-semibold text-slate-600 border border-slate-200/80">
                <button
                  onClick={() => handleSetTimeSpanMode('work')}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    timeSpanMode === 'work' ? 'bg-white text-[#E11D48] font-bold shadow-2xs' : 'hover:text-slate-900'
                  }`}
                  title="08:00 - 18:00"
                >
                  Hành chính
                </button>
                <button
                  onClick={() => handleSetTimeSpanMode('autofit')}
                  className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    timeSpanMode === 'autofit' ? 'bg-white text-emerald-600 font-bold shadow-2xs' : 'hover:text-slate-900'
                  }`}
                  title="Tự động co giãn theo việc"
                >
                  <Sparkle className="w-2.5 h-2.5" />
                  Tự co
                </button>
                <button
                  onClick={() => handleSetTimeSpanMode('full')}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    timeSpanMode === 'full' ? 'bg-white text-[#E11D48] font-bold shadow-2xs' : 'hover:text-slate-900'
                  }`}
                  title="06:00 - 22:00"
                >
                  Toàn ngày
                </button>
              </div>
            )}

            {viewMode === 'Week' && (
              <div className="hidden sm:flex items-center bg-slate-100/80 p-0.5 rounded-xl text-[10.5px] font-semibold text-slate-600 border border-slate-200/80" title="Độ cao dòng">
                <button
                  onClick={() => handleSetDensity('compact')}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    density === 'compact' ? 'bg-white text-[#E11D48] font-bold shadow-2xs' : 'hover:text-slate-900'
                  }`}
                >
                  Gọn
                </button>
                <button
                  onClick={() => handleSetDensity('normal')}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    density === 'normal' ? 'bg-white text-[#E11D48] font-bold shadow-2xs' : 'hover:text-slate-900'
                  }`}
                >
                  Vừa
                </button>
                <button
                  onClick={() => handleSetDensity('detailed')}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    density === 'detailed' ? 'bg-white text-[#E11D48] font-bold shadow-2xs' : 'hover:text-slate-900'
                  }`}
                >
                  Rộng
                </button>
              </div>
            )}

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
              title="Nhảy đến ngày"
              className="px-2 py-0.5 text-[11px] font-bold rounded-xl border border-slate-200 bg-[#FFFDF7] text-[#0F172A] focus:border-[#E11D48] outline-none cursor-pointer transition-colors"
            />
          </div>
        </div>

        {/* Collapsible Priority & Color Palette Filters */}
        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-1.5 border-t border-slate-100 animate-in fade-in duration-150">
            <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl text-[11px] font-semibold">
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
                  className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                    filterPriority === p.id
                      ? 'bg-[#E11D48] text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl text-[11px] font-semibold">
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
                  className={`px-2.5 py-0.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterThemeGroup === c.id
                      ? 'bg-white text-[#0F172A] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c.hex && <span style={{ backgroundColor: c.hex }} className="w-1.5 h-1.5 rounded-full inline-block" />}
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: WEEK GRID VIEW (TỐI ƯU 1-TIẾNG, GỌN GÀNG, KÉO THẢ DRAG & DROP)     */}
      {/* ========================================================================= */}
      {viewMode === 'Week' && (
        <div className="border-2 border-[#0F172A] rounded-2xl overflow-hidden bg-white shadow-[4px_4px_0px_#0F172A] flex-1 min-h-[420px] flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <div className="min-w-[840px]">
              {/* Day Headers Row */}
              <div className="grid grid-cols-[64px_repeat(7,1fr)] bg-[#FFF1F2] border-b-2 border-[#0F172A] text-center sticky top-0 z-20">
                <div className="py-2 text-[10px] font-black text-[#0F172A] border-r border-[#0F172A]/20 flex items-center justify-center bg-[#FFF1F2]">
                  GIỜ
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.dateStr}
                    onClick={() => {
                      setSelectedDate(day.dateObj);
                      setViewMode('Day');
                    }}
                    className={`py-1.5 px-1 border-r border-[#0F172A]/15 last:border-r-0 cursor-pointer transition-colors ${
                      day.isToday ? 'bg-[#FFE4E6] font-black' : 'hover:bg-white/70'
                    }`}
                  >
                    <p
                      className={`text-[11px] font-black ${
                        day.isToday ? 'text-[#E11D48]' : 'text-[#0F172A]'
                      }`}
                    >
                      {day.name}
                    </p>
                    <p className={`text-[9px] mt-0.2 ${day.isToday ? 'text-[#E11D48] font-black' : 'text-slate-500 font-bold'}`}>
                      {day.shortDate}
                    </p>
                  </div>
                ))}
              </div>

              {/* Time Matrix Rows with Drag & Drop Zones */}
              <div className="relative divide-y divide-[#0F172A]/15 pb-20">
                {/* Real-time dynamic needle indicator with live badge */}
                {isCurrentWeek && currentTimeTop !== null && (
                  <div
                    className="absolute left-0 right-0 z-30 flex items-center pointer-events-none transition-all duration-500 ease-linear"
                    style={{ top: `${currentTimeTop}px` }}
                  >
                    <div className="w-[64px] flex justify-end pr-1 shrink-0">
                      <span className="px-1.5 py-0.5 rounded-md bg-[#E11D48] text-white border border-[#0F172A] text-[9px] font-black shadow-[1px_1px_0px_#0F172A] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        {format(currentTime, settings?.timeFormat === '12h' ? 'hh:mm a' : 'HH:mm')}
                      </span>
                    </div>

                    <div className="w-2.5 h-2.5 rounded-full bg-[#E11D48] border-2 border-[#0F172A] -ml-1 shrink-0" />
                    <div className="flex-1 h-[2px] bg-[#E11D48]" />
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
                        className="text-right pr-2 pt-1.5 text-[10px] font-black border-r border-[#0F172A]/20 bg-[#FFFDF7] select-none text-[#0F172A]/70"
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
                            className={`border-r border-[#0F172A]/15 last:border-r-0 p-1.5 transition-all relative ${
                              isTarget
                                ? 'bg-[#FFE4E6] ring-2 ring-inset ring-[#E11D48] scale-[1.01]'
                                : day.isToday
                                ? 'bg-[#FFF1F2]/55'
                                : 'bg-white'
                            } ${
                              !hasTask
                                ? 'hover:bg-[#FEF9C3]/55 cursor-pointer group/cell'
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
                                      } border-2 border-[#0F172A] ${
                                        isCompleted
                                          ? 'shadow-[1px_1px_0px_#0F172A] opacity-45 saturate-50'
                                          : 'shadow-[2px_2px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A]'
                                      } flex flex-col justify-between gap-1 ${
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
                                            className={`w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                              isCompleted
                                                ? 'bg-white text-emerald-600 border border-[#0F172A]'
                                                : 'border border-white/60 hover:bg-white/20 text-white'
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
                              <div className="w-full h-full min-h-[36px] flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150">
                                <span className="text-[10px] font-black text-[#0F172A] flex items-center gap-1 py-1 px-2.5 rounded-xl bg-[#FEF9C3] hover:bg-[#FDE047] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all">
                                  <Plus className="w-3 h-3 text-[#E11D48]" />
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
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 pb-2">
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
                className={`rounded-2xl border-2 border-[#0F172A] transition-all ${
                  day.isToday
                    ? 'bg-[#FFF1F2] shadow-[4px_4px_0px_#0F172A]'
                    : 'bg-white shadow-[3px_3px_0px_#0F172A]'
                } p-3.5`}
              >
                {/* Day Header Strip */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b-2 border-[#0F172A]/15">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] ${
                        day.isToday
                          ? 'bg-[#E11D48] text-white'
                          : 'bg-[#FEF9C3] text-[#0F172A]'
                      }`}
                    >
                      {day.name}
                    </span>
                    <span className="text-xs font-extrabold text-[#0F172A]/75">
                      {day.displayDate}
                    </span>
                    {day.isToday && (
                      <span className="text-[10px] font-black text-[#E11D48] bg-white px-2 py-0.5 rounded-full border-2 border-[#0F172A]">
                        Hôm nay
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#0F172A]/70 font-black">
                      {dayTasks.length} việc
                    </span>
                    <button
                      onClick={() => onAddSlotClick(day.index, '09:00', day.dateStr)}
                      className="px-2.5 py-1 text-[11px] font-black text-[#0F172A] bg-[#FEF9C3] hover:bg-[#FDE047] rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-[#E11D48]" />
                      <span>Thêm việc</span>
                    </button>
                  </div>
                </div>

                {/* Day Tasks List */}
                {dayTasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                          className={`p-3 rounded-2xl border-2 border-[#0F172A] transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isCompleted
                              ? 'opacity-45 saturate-50 shadow-[1px_1px_0px_#0F172A]'
                              : 'shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_#0F172A]'
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
                              <h4 className="text-xs font-black truncate">
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
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                              isCompleted
                                ? 'bg-white text-emerald-600 border border-[#0F172A]'
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
                    className="py-2.5 px-3 rounded-xl border-2 border-dashed border-[#0F172A]/25 hover:border-[#0F172A] text-center text-xs font-extrabold text-[#0F172A]/70 hover:text-[#E11D48] cursor-pointer hover:bg-[#FEF9C3]/60 transition-colors"
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
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 shrink-0">
            {weekDays.map((day) => {
              const activeDay = isSameDay(selectedDate, day.dateObj);
              return (
                <button
                  key={day.dateStr}
                  onClick={() => {
                    soundEngine.playSoftClick();
                    setSelectedDate(day.dateObj);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 border-2 border-[#0F172A] cursor-pointer ${
                    activeDay
                      ? 'bg-[#E11D48] text-white shadow-[3px_3px_0px_#0F172A]'
                      : 'bg-white text-[#0F172A] hover:bg-[#FEF9C3] shadow-[2px_2px_0px_#0F172A]'
                  }`}
                >
                  <span>{day.name}</span>
                  <span className="ml-1.5 opacity-85 text-[10px]">
                    ({day.shortDate})
                  </span>
                  {day.isToday && (
                    <span
                      className={`ml-1.5 text-[8.5px] px-1.5 py-0.2 rounded-full font-black border border-[#0F172A] ${
                        activeDay ? 'bg-[#FEF08A] text-[#0F172A]' : 'bg-[#FFE4E6] text-[#E11D48]'
                      }`}
                    >
                      Hôm nay
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Timeline schedule */}
          <div className="bg-white border-2 border-[#0F172A] rounded-2xl p-3.5 shadow-[4px_4px_0px_#0F172A] divide-y-2 divide-[#0F172A]/10 flex-1 overflow-y-auto max-h-[calc(100vh-320px)]">
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
                  <div className="w-16 shrink-0 pt-0.5 text-right">
                    <span className="text-[11px] font-black text-[#E11D48] bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[1.5px_1.5px_0px_#0F172A] px-1.5 py-0.5 rounded-lg inline-block">
                      {formatDisplayTime(timeSlot)}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2">
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
                            className={`rounded-2xl p-3 border-2 border-[#0F172A] cursor-pointer transition-all space-y-1.5 ${
                              isCompleted
                                ? 'opacity-45 saturate-50 shadow-[1px_1px_0px_#0F172A]'
                                : 'shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_#0F172A]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  style={{
                                    backgroundColor: isCompleted ? 'rgba(255,255,255,0.2)' : palette.badgeBg,
                                    color: palette.badgeText,
                                  }}
                                  className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                                >
                                  {task.time_box?.start || timeSlot}
                                </span>
                                <span className="text-xs font-black truncate">
                                  {task.title}
                                </span>
                              </div>
                              <button
                                onClick={(e) => handleTaskComplete(e, task)}
                                className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-colors shrink-0 cursor-pointer ${
                                  isCompleted
                                    ? 'bg-white text-emerald-600 border border-[#0F172A]'
                                    : 'bg-white/20 text-white hover:bg-white/30 border border-white/40'
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
                        className="w-full py-1.5 border-2 border-dashed border-[#0F172A]/25 hover:border-[#0F172A] rounded-2xl text-[11px] font-extrabold text-[#0F172A]/70 hover:text-[#E11D48] flex items-center justify-center gap-1 transition-all hover:bg-[#FEF9C3]/60 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-[#E11D48]" />
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
        <div className="bg-white border-2 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] space-y-3">
          {/* Month Navigation Bar */}
          <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#0F172A]/15">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#E11D48]" />
              <h3 className="text-sm font-black text-[#0F172A]">
                Tháng {format(currentMonth, 'MM / yyyy')}
              </h3>
              <span className="text-[10px] text-slate-600 font-bold hidden sm:inline">
                (Bấm vào bất kỳ ngày nào để xem & lên lịch cho tuần tương lai đó)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-1.5 text-[#0F172A] bg-white hover:bg-[#FEF9C3] rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToTodayMonth}
                className="text-xs font-black text-[#E11D48] bg-[#FFE4E6] hover:bg-[#E11D48] hover:text-white px-3 py-1 rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer"
              >
                Hiện tại
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 text-[#0F172A] bg-white hover:bg-[#FEF9C3] rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 7 Columns Days of Week */}
          <div className="grid grid-cols-7 text-center text-[11px] font-black text-[#0F172A] py-2 bg-[#FFF1F2] rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]">
            <div>Thứ 2</div>
            <div>Thứ 3</div>
            <div>Thứ 4</div>
            <div>Thứ 5</div>
            <div>Thứ 6</div>
            <div>Thứ 7</div>
            <div>Chủ Nhật</div>
          </div>

          {/* Month Calendar Grid with Date-Fns */}
          <div className="grid grid-cols-7 gap-2">
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
                  className={`min-h-[68px] p-2 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    !isCurrentMonth
                      ? 'bg-[#FFFDF7] border-[#0F172A]/25 opacity-45'
                      : isToday
                      ? 'border-[#0F172A] bg-[#FFF1F2] shadow-[3px_3px_0px_#0F172A] font-black'
                      : 'border-[#0F172A] bg-white hover:bg-[#FEF9C3]/65 shadow-[2px_2px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A]'
                  }`}
                  title={`Lên lịch cho ngày ${format(dayDate, 'dd/MM/yyyy')}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-[#E11D48] text-white border border-[#0F172A] flex items-center justify-center text-[10px]'
                          : isCurrentMonth
                          ? 'text-[#0F172A]'
                          : 'text-slate-400'
                      }`}
                    >
                      {format(dayDate, 'd')}
                    </span>
                    {dateTasks.length > 0 && (
                      <span className="text-[9px] font-black px-1.5 rounded-full bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]">
                        {dateTasks.length}
                      </span>
                    )}
                  </div>

                  {dateTasks.length > 0 && (
                    <div className="space-y-0.5 mt-1">
                      {dateTasks.slice(0, 1).map((t) => (
                        <div
                          key={t.id}
                          className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#E11D48] text-white border border-[#0F172A] truncate"
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
