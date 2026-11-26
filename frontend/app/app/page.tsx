'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, BookOpen, Bot, Menu, Calendar, Kanban, LayoutGrid, FolderKanban, Tag, Languages } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { BentoTrackerCards } from '@/components/BentoTrackerCards';
import { KanbanSection } from '@/components/KanbanSection';
import { CenterStageTimetable } from '@/components/CenterStageTimetable';
import { CompletedTasksArchive } from '@/components/CompletedTasksArchive';
import { ProjectsView } from '@/components/ProjectsView';
import { ReportsView } from '@/components/ReportsView';
import { TagsView } from '@/components/TagsView';
import { UserProfileModal } from '@/components/UserProfileModal';
import { BackgroundModal } from '@/components/BackgroundModal';
import { QuickDialogs } from '@/components/QuickDialogs';
import { PomodoroFocusModal } from '@/components/PomodoroFocusModal';
import { HabitTrackerModal } from '@/components/HabitTrackerModal';
import { QuickNotesModal } from '@/components/QuickNotesModal';
import { AIAssistantDrawer } from '@/components/AIAssistantDrawer';
import { JournalView } from '@/components/JournalView';
import { VocabView } from '@/components/VocabView';
import { EmailPostcardModal } from '@/components/EmailPostcardModal';
import { ScheduleReminderModal } from '@/components/ScheduleReminderModal';
import { TaskModal } from '@/components/TaskModal';
import { AuthModal } from '@/components/AuthModal';
import { SettingsModal } from '@/components/SettingsModal';
import { GlobalNotificationModal } from '@/components/GlobalNotificationModal';
import { TaskItem, UserProfileData } from '@/lib/types';
import { authService, AuthUser } from '@/lib/authService';
import { soundEngine } from '@/lib/audio';
import { useDragAutoScroll } from '@/lib/useDragAutoScroll';
import {
  getStoredSettings,
  saveStoredSettings,
  AppSettings,
  DEFAULT_SETTINGS,
} from '@/lib/settingsStorage';
import {
  getStoredUserProfile,
  saveStoredUserProfile,
  DEFAULT_USER_PROFILE,
} from '@/lib/profileStorage';
import { recordStreakActivity } from '@/lib/streakService';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  deleteAllTasks,
  completeTask,
  toggleChecklistItem,
} from '@/lib/api';

export default function WorkspaceApp() {
  // Global drag-to-autoscroll activation
  useDragAutoScroll();

  const [isMounted, setIsMounted] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tracker');
  const [trackerLayout, setTrackerLayout] = useState<'schedule' | 'kanban' | 'split'>('schedule');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Application Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Multi-user Authentication State
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Modals & Drawers
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isScheduleReminderOpen, setIsScheduleReminderOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData>(DEFAULT_USER_PROFILE);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    soundEngine.setMuted(!newSettings.soundEnabled);
    soundEngine.setMasterVolume(newSettings.soundVolume);
  };

  const handleImportTasks = async (importedTasks: TaskItem[]) => {
    for (const t of importedTasks) {
      try {
        const { id, ...data } = t;
        await createTask(data);
      } catch (err) {
        console.error('Import task error:', err);
      }
    }
    await loadTasks();
  };

  const handleSaveProfile = async (newProfile: UserProfileData) => {
    setUserProfile(newProfile);
    saveStoredUserProfile(newProfile);
    if (authUser) {
      try {
        const updated = await authService.updateProfile({
          name: newProfile.name,
          avatar: newProfile.avatar,
          title: newProfile.title,
          bio: newProfile.bio,
          coverImage: newProfile.cover,
          wallpaper: newProfile.background,
        });
        if (updated) {
          setAuthUser(updated);
        }
      } catch (err) {
        console.error('Failed to sync profile to cloud:', err);
      }
    }
  };

  const handleUpdateBackground = (updates: {
    background: string;
    applyAppBackground: boolean;
    backgroundBlur?: number;
    backgroundOpacity?: number;
  }) => {
    const updated = {
      ...userProfile,
      ...updates,
    };
    setUserProfile(updated);
    saveStoredUserProfile(updated);
    if (authUser && updates.background) {
      authService.updateProfile({
        wallpaper: updates.background,
      });
    }
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setUserProfile((prev) => ({
      ...prev,
      name: user.name || prev.name,
      avatar: user.avatar || prev.avatar,
      title: user.title || prev.title,
      bio: user.bio || prev.bio,
      background: user.wallpaper || prev.background,
      cover: user.coverImage || prev.cover,
    }));
    loadTasks();
  };

  const handleLogout = () => {
    authService.logout();
    setAuthUser(null);
    setUserProfile(DEFAULT_USER_PROFILE);
    loadTasks();
  };

  // Personal Productivity Suite Modals
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [isHabitTrackerOpen, setIsHabitTrackerOpen] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);

  // Quick Header Dialogs
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<TaskItem | null>(null);
  const [defaultDayIndex, setDefaultDayIndex] = useState(1);
  const [defaultTimeSlot, setDefaultTimeSlot] = useState('09:00');
  const [defaultScheduledDate, setDefaultScheduledDate] = useState('');
  const [defaultColumn, setDefaultColumn] = useState<'draft' | 'in_progress' | 'editing' | 'done'>('draft');

  // Load tasks from real backend MongoDB Atlas
  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchTasks();
      setTasks(data);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load: check auth session, settings, and fetch tasks
  useEffect(() => {
    setIsMounted(true);
    const initialSettings = getStoredSettings();
    setSettings(initialSettings);
    soundEngine.setMuted(!initialSettings.soundEnabled);
    soundEngine.setMasterVolume(initialSettings.soundVolume);

    setUserProfile(getStoredUserProfile());

    authService.getMe().then((cloudUser) => {
      if (cloudUser) {
        setAuthUser(cloudUser);
        setUserProfile((prev) => {
          const merged = {
            ...prev,
            name: cloudUser.name || prev.name,
            avatar: cloudUser.avatar || prev.avatar,
            title: cloudUser.title || prev.title,
            bio: cloudUser.bio || prev.bio,
            background: cloudUser.wallpaper || prev.background,
            cover: cloudUser.coverImage || prev.cover,
          };
          saveStoredUserProfile(merged);
          return merged;
        });
      }
      loadTasks();
    });
  }, [loadTasks]);

  // Event Bus: Instant Zero-Reload sync when AI Concierge creates or reschedules tasks
  useEffect(() => {
    const handleTaskMutated = (e: any) => {
      const detail = e.detail;
      if (detail?.task) {
        soundEngine.playPentatonicChime(4);
        setTasks((prev) => {
          const raw = detail.task;
          const taskId = raw._id || raw.id;
          if (prev.some((t) => t.id === taskId)) return prev;
          const normalized: TaskItem = {
            id: taskId,
            title: raw.title,
            priority: raw.priority || '#1 Cốt Lõi',
            category: raw.category || 'deep_work',
            color_theme: raw.color_theme || 'twilight',
            column: raw.column || 'in_progress',
            day_index: raw.day_index ?? 1,
            scheduled_date: raw.scheduled_date || new Date().toISOString().slice(0, 10),
            time_box: raw.time_box || { start: '14:00', end: '15:00', duration_minutes: 60 },
            definition_of_done: raw.definition_of_done || [],
            note: raw.note,
            progress_percentage: raw.progress_percentage ?? 0,
            collaborators: raw.collaborators || [],
            stats: raw.stats || { comments_count: 0, attachments_count: 0 },
            punctuality_status: raw.punctuality_status || 'on_track',
          };
          const nextList = [normalized, ...prev];
          if (!authService.getToken() && typeof window !== 'undefined') {
            try {
              localStorage.setItem('andex_cached_tasks_v2', JSON.stringify(nextList));
            } catch {}
          }
          return nextList;
        });
      }
    };

    window.addEventListener('atelier:task-mutated', handleTaskMutated);
    return () => window.removeEventListener('atelier:task-mutated', handleTaskMutated);
  }, []);

  // Create or Update task handler
  const handleSaveTask = async (taskData: Partial<TaskItem>) => {
    if (selectedTaskForEdit) {
      const updated = await updateTask(selectedTaskForEdit.id, taskData);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await createTask(taskData);
      setTasks((prev) => [created, ...prev]);
    }
    setIsTaskModalOpen(false);
    setSelectedTaskForEdit(null);
  };

  // Delete task handler
  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setIsTaskModalOpen(false);
    setSelectedTaskForEdit(null);
  };

  // Toggle checklist item
  const handleToggleChecklist = async (taskId: string, checklistId: string) => {
    const updated = await toggleChecklistItem(taskId, checklistId);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  // Move task to another Kanban column
  const handleMoveColumn = async (
    taskId: string,
    newColumn: 'draft' | 'in_progress' | 'editing' | 'done'
  ) => {
    const updated = await updateTask(taskId, { column: newColumn });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  // Drag and drop reschedule handler
  const handleRescheduleTask = async (
    taskId: string,
    newDayIndex: number,
    newTimeSlot: string,
    newDate?: string
  ) => {
    const startParts = newTimeSlot.split(':');
    let endHour = parseInt(startParts[0] || '9', 10) + 1;
    let endMin = parseInt(startParts[1] || '0', 10) + 30;
    if (endMin >= 60) {
      endHour += 1;
      endMin -= 60;
    }
    const endFormatted = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    const updatePayload: Partial<TaskItem> = {
      day_index: newDayIndex,
      time_box: {
        start: newTimeSlot,
        end: endFormatted,
        duration_minutes: 90,
      },
    };
    if (newDate) {
      updatePayload.scheduled_date = newDate;
    }

    const updated = await updateTask(taskId, updatePayload);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  // Complete / Uncomplete task
  const handleToggleComplete = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.column === 'done') {
      const updated = await updateTask(taskId, { column: 'in_progress', progress_percentage: 50 });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const completed = await completeTask(taskId);
      setTasks((prev) => prev.map((t) => (t.id === completed.id ? completed : t)));
      recordStreakActivity();
    }
  };

  // Restore task from completed archive
  const handleRestoreTask = async (taskId: string) => {
    const updated = await updateTask(taskId, { column: 'in_progress', progress_percentage: 50 });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  // AI Assistant task scheduler
  const handleAiScheduleTask = async (aiTaskData: Partial<TaskItem>) => {
    try {
      const created = await createTask({
        ...aiTaskData,
        column: 'in_progress',
        day_index: 1, // Tuesday
        time_box: aiTaskData.time_box || { start: '14:00', end: '16:00', duration_minutes: 120 },
      });
      setTasks((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to schedule AI task:', err);
    }
  };

  // Reset clean data - clears all tasks to empty clean state
  const handleResetSeedData = async () => {
    try {
      await deleteAllTasks();
      setTasks([]);
      soundEngine.playSoftClick();
    } catch (err) {
      console.error('Failed to reset tasks:', err);
    }
  };

  // Open modal to add new task
  const handleOpenNewTask = () => {
    setSelectedTaskForEdit(null);
    setDefaultColumn('draft');
    setDefaultDayIndex(1); // Tuesday
    setDefaultTimeSlot('09:00');
    setIsTaskModalOpen(true);
  };

  // Open modal from Kanban column "+ Thêm việc"
  const handleAddTaskToColumn = (column: 'draft' | 'in_progress' | 'editing' | 'done') => {
    setSelectedTaskForEdit(null);
    setDefaultColumn(column);
    setDefaultDayIndex(1);
    setDefaultTimeSlot('09:00');
    setIsTaskModalOpen(true);
  };

  // Open modal from Timetable slot click
  const handleAddSlotClick = (dayIndex: number, timeSlot: string, scheduledDate?: string) => {
    setSelectedTaskForEdit(null);
    setDefaultColumn('draft');
    setDefaultDayIndex(dayIndex);
    setDefaultTimeSlot(timeSlot);
    setDefaultScheduledDate(scheduledDate || '');
    setIsTaskModalOpen(true);
  };

  // Open modal to edit existing task
  const handleEditTask = (task: TaskItem) => {
    setSelectedTaskForEdit(task);
    setIsTaskModalOpen(true);
  };

  // Convert Scratchpad Note to Task
  const handleConvertNoteToTask = (noteTitle: string) => {
    setSelectedTaskForEdit(null);
    setDefaultColumn('draft');
    setDefaultDayIndex(1);
    setDefaultTimeSlot('09:00');
    setIsTaskModalOpen(true);
  };

  const completedCount = tasks.filter((t) => t.column === 'done').length;

  // Header dynamic titles
  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'projects':
        return {
          title: 'Dự Án & Nhãn',
          subtitle: 'Điều phối dự án trọng tâm và phân loại công việc',
        };
      case 'reports':
        return {
          title: 'Thống Kê Năng Suất',
          subtitle: 'Theo dõi nhịp làm việc Deep Work và tỷ lệ hoàn thành',
        };
      case 'tags':
        return {
          title: 'Dự Án & Nhãn',
          subtitle: 'Lọc và quản lý công việc theo các nhãn phân loại',
        };
      case 'archive':
        return {
          title: 'Kho Đã Hoàn Thành',
          subtitle: 'Lưu trữ và khôi phục các công việc đã chốt xong',
        };
      case 'journal':
        return {
          title: 'Nhật Ký Ký Ức',
          subtitle: 'Lưu giữ khoảnh khắc và những dòng suy ngẫm theo tháng',
        };
      case 'vocab':
        return {
          title: 'Học & Review Từ Vựng',
          subtitle: 'Flashcard tiếng Anh, phát âm, ôn tập giãn cách SRS & Import tự động bằng AI',
        };
      default:
        return {
          title: 'Lịch Biểu',
          subtitle: 'Gencoore • Không gian làm việc cá nhân',
        };
    }
  };

  const headerMeta = getHeaderMeta();

  // Dynamic Theme Styling for Full-Bleed Canvas
  const isCustomTheme = settings.theme === 'custom';
  const customCanvasStyle =
    isCustomTheme && settings.customTheme
      ? {
          backgroundColor: settings.customTheme.canvasBg,
        }
      : undefined;

  const getCanvasThemeClass = () => {
    switch (settings.theme) {
      case 'cream':
        return 'bg-[#FAF7F2] text-[#2C180C]';
      case 'graphite':
        return 'bg-[#F8FAFC] text-[#0F172A]';
      case 'sage':
        return 'bg-[#F4F8F5] text-[#1B3624]';
      case 'midnight':
        return 'bg-[#090A0F] text-[#F1F5F9]';
      case 'custom':
        return '';
      case 'slate':
      default:
        return 'bg-gradient-to-b from-[#FFF8F1] via-[#FFF1F2] to-[#FEFCE8] text-[#0F172A]';
    }
  };

  if (!isMounted) {
    return (
      <div className="w-full h-dvh flex items-center justify-center bg-[#FFF8F1]">
        <div className="flex flex-col items-center gap-3.5 animate-pulse">
          <div className="px-4 py-2 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A]">
            <img src="/images/logo-wordmark.png" alt="GENNCORE" className="block h-8 w-auto object-contain" />
          </div>
          <div className="w-24 h-1.5 rounded-full bg-[#FFE4E6] border border-[#0F172A] overflow-hidden">
            <div className="w-1/2 h-full bg-[#E11D48] rounded-full animate-pulse" />
          </div>
          <p className="text-[11px] font-black text-[#0F172A] tracking-wide">Đang mở Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Dynamic App Background Wallpaper or Cartoon Polka-Dot Texture */}
      {userProfile.background ? (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${userProfile.background})`,
            filter: `blur(${userProfile.backgroundBlur || 0}px)`,
            opacity: userProfile.backgroundOpacity ?? 0.75,
          }}
        />
      ) : (
        settings.theme !== 'midnight' && (
          <div
            className="fixed inset-0 pointer-events-none z-10 opacity-[0.22]"
            style={{
              backgroundImage: 'radial-gradient(#94A3B8 1.2px, transparent 1.2px)',
              backgroundSize: '22px 22px',
            }}
          />
        )
      )}

      <div
        style={!userProfile.background && isCustomTheme ? customCanvasStyle : undefined}
        className={`w-full h-dvh flex overflow-hidden relative z-10 transition-colors ${
          userProfile.background ? 'bg-white/90 backdrop-blur-xl' : getCanvasThemeClass()
        }`}
      >
        {/* Desktop Sidebar */}
        <Sidebar
          className="hidden md:flex"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenPomodoro={() => setIsPomodoroOpen(true)}
          onOpenHabitTracker={() => setIsHabitTrackerOpen(true)}
          onOpenQuickNotes={() => setIsQuickNotesOpen(true)}
          onOpenUserProfile={() => setIsUserProfileOpen(true)}
          onOpenBackground={() => setIsBackgroundModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          completedCount={completedCount}
          profile={userProfile}
          authUser={authUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          isCollapsed={Boolean(settings.sidebarCollapsed)}
          onToggleCollapse={() => {
            const next = !settings.sidebarCollapsed;
            handleUpdateSettings({ ...settings, sidebarCollapsed: next });
          }}
          theme={settings.theme || 'slate'}
          customTheme={settings.customTheme}
        />

        {/* Mobile Slide-Over Sidebar Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-[70] flex md:hidden">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative z-10 h-full animate-in slide-in-from-left duration-200">
              <Sidebar
                className="flex w-64 shadow-2xl"
                activeTab={activeTab}
                setActiveTab={(tab) => {
                  setActiveTab(tab);
                  setIsMobileSidebarOpen(false);
                }}
                onOpenPomodoro={() => {
                  setIsMobileSidebarOpen(false);
                  setIsPomodoroOpen(true);
                }}
                onOpenHabitTracker={() => {
                  setIsMobileSidebarOpen(false);
                  setIsHabitTrackerOpen(true);
                }}
                onOpenQuickNotes={() => {
                  setIsMobileSidebarOpen(false);
                  setIsQuickNotesOpen(true);
                }}
                onOpenUserProfile={() => {
                  setIsMobileSidebarOpen(false);
                  setIsUserProfileOpen(true);
                }}
                onOpenBackground={() => {
                  setIsMobileSidebarOpen(false);
                  setIsBackgroundModalOpen(true);
                }}
                onOpenSettings={() => {
                  setIsMobileSidebarOpen(false);
                  setIsSettingsOpen(true);
                }}
                completedCount={completedCount}
                profile={userProfile}
                authUser={authUser}
                onOpenAuth={() => {
                  setIsMobileSidebarOpen(false);
                  setIsAuthModalOpen(true);
                }}
                isCollapsed={false}
                onCloseMobile={() => setIsMobileSidebarOpen(false)}
                theme={settings.theme || 'slate'}
                customTheme={settings.customTheme}
              />
            </div>
          </div>
        )}

        {/* Main Studio Area - INNER SCROLLABLE CONTENT */}
        <main
          id="main-content-scroll"
          style={activeTab !== 'journal' ? customCanvasStyle : undefined}
          className={`flex-1 h-full overflow-y-auto overflow-x-hidden flex flex-col ${
            activeTab === 'journal'
              ? 'p-0 pb-20 md:pb-0 bg-[#FFF8F1]'
              : `p-3.5 sm:p-5 md:px-6 md:py-4 pb-24 md:pb-6 space-y-4 ${getCanvasThemeClass()}`
          } custom-main-scroll scroll-smooth transition-colors duration-200`}
        >
          {/* Top Header - Rendered for standard workspace tabs */}
          {activeTab !== 'journal' && (
            <Header
              title={headerMeta.title}
              subtitle={headerMeta.subtitle}
              theme={settings.theme || 'slate'}
              onOpenNewTaskModal={handleOpenNewTask}
              onOpenAiDrawer={() => setIsAiOpen(true)}
              onOpenEmailModal={() => setIsEmailOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenHelp={() => setIsHelpOpen(true)}
              onOpenBackground={() => setIsBackgroundModalOpen(true)}
              profile={userProfile}
              onOpenProfile={() => setIsUserProfileOpen(true)}
              authUser={authUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onLogout={handleLogout}
              onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            />
          )}

          {/* Guest Mode Notice Banner (Isolated local storage, encourages Cloud Sync login) */}
          {!isLoading && !authUser && activeTab !== 'journal' && (
            <div
              className={`px-3.5 py-2 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 ${
                settings.theme === 'midnight'
                  ? 'bg-indigo-500/10 border-indigo-400/25 text-indigo-200'
                  : 'bg-[#FEF9C3] border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A]'
              }`}
            >
              <span className="font-bold">
                Bạn đang ở <strong>Chế độ Khách</strong> (dữ liệu chỉ lưu trên trình duyệt này). Đăng nhập để đồng bộ Cloud trên mọi thiết bị.
              </span>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black text-[11px] cursor-pointer shrink-0 transition-colors"
              >
                Đăng nhập / Đăng ký
              </button>
            </div>
          )}

          {/* Dynamic Sidebar View Tabs */}
          {activeTab === 'archive' && (
            <CompletedTasksArchive
              tasks={tasks}
              onRestoreTask={handleRestoreTask}
              onDeleteTask={handleDeleteTask}
              onBackToTracker={() => setActiveTab('tracker')}
            />
          )}

          {(activeTab === 'projects' || activeTab === 'tags') && (
            <div className="space-y-4">
              <div className="inline-flex items-center p-1 rounded-2xl bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] gap-1">
                <button
                  onClick={() => {
                    soundEngine.playSoftClick();
                    setActiveTab('projects');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activeTab === 'projects'
                      ? 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                      : 'text-[#0F172A] hover:bg-white/70'
                  }`}
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>Dự Án</span>
                </button>
                <button
                  onClick={() => {
                    soundEngine.playSoftClick();
                    setActiveTab('tags');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activeTab === 'tags'
                      ? 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                      : 'text-[#0F172A] hover:bg-white/70'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Nhãn & Phân Loại</span>
                </button>
              </div>

              {activeTab === 'projects' ? (
                <ProjectsView
                  tasks={tasks}
                  onBackToTracker={() => setActiveTab('tracker')}
                  onOpenTaskModal={handleOpenNewTask}
                  onTaskClick={handleEditTask}
                />
              ) : (
                <TagsView
                  tasks={tasks}
                  onTaskClick={handleEditTask}
                  onOpenTaskModal={handleOpenNewTask}
                />
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <ReportsView
              tasks={tasks}
              onBackToTracker={() => setActiveTab('tracker')}
            />
          )}

          {activeTab === 'journal' && (
            <JournalView
              authUser={authUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          )}

          {activeTab === 'vocab' && (
            <VocabView
              theme={settings.theme || 'slate'}
              authUserId={authUser?.id}
            />
          )}

          {activeTab === 'tracker' && (
            <div className="flex-1 min-h-0 flex flex-col space-y-3.5">
              {/* Compact Architectural KPI Strip */}
              <BentoTrackerCards tasks={tasks} theme={settings.theme || 'slate'} />

              {/* Workspace Focus Switcher: Timetable dominates by default */}
              <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div
                  className={`inline-flex items-center p-1 rounded-2xl border-2 text-xs font-extrabold ${
                    settings.theme === 'midnight'
                      ? 'bg-[#12151E] border-white/[0.08] text-slate-400'
                      : 'bg-[#FFF1F2] border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A]'
                  }`}
                >
                  <button
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setTrackerLayout('schedule');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      trackerLayout === 'schedule'
                        ? settings.theme === 'midnight'
                          ? 'bg-[#181C28] text-white shadow-xs'
                          : 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        : 'hover:bg-white/70'
                    }`}
                  >
                    <Calendar className={`w-3.5 h-3.5 ${trackerLayout === 'schedule' ? 'text-white' : 'text-[#E11D48]'}`} />
                    <span>Thời Khóa Biểu</span>
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setTrackerLayout('kanban');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      trackerLayout === 'kanban'
                        ? settings.theme === 'midnight'
                          ? 'bg-[#181C28] text-white shadow-xs'
                          : 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        : 'hover:bg-white/70'
                    }`}
                  >
                    <Kanban className={`w-3.5 h-3.5 ${trackerLayout === 'kanban' ? 'text-white' : 'text-emerald-600'}`} />
                    <span>Bảng Kanban ({tasks.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setTrackerLayout('split');
                    }}
                    className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      trackerLayout === 'split'
                        ? settings.theme === 'midnight'
                          ? 'bg-[#181C28] text-white shadow-xs'
                          : 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        : 'hover:bg-white/70'
                    }`}
                  >
                    <LayoutGrid className={`w-3.5 h-3.5 ${trackerLayout === 'split' ? 'text-white' : 'text-amber-600'}`} />
                    <span>Kết Hợp</span>
                  </button>
                </div>
              </div>

              {/* Kanban View */}
              {(trackerLayout === 'kanban' || trackerLayout === 'split') && (
                <KanbanSection
                  tasks={tasks}
                  onTaskClick={handleEditTask}
                  onToggleChecklist={handleToggleChecklist}
                  onMoveColumn={handleMoveColumn}
                  onAddTaskToColumn={handleAddTaskToColumn}
                  onDeleteTask={handleDeleteTask}
                />
              )}

              {/* Hero Center-Stage Timetable */}
              {(trackerLayout === 'schedule' || trackerLayout === 'split') && (
                <CenterStageTimetable
                  tasks={tasks}
                  onTaskClick={handleEditTask}
                  onAddSlotClick={handleAddSlotClick}
                  onToggleComplete={handleToggleComplete}
                  onToggleChecklist={handleToggleChecklist}
                  onRescheduleTask={handleRescheduleTask}
                  onOpenArchive={() => setActiveTab('archive')}
                  onOpenScheduleReminder={() => setIsScheduleReminderOpen(true)}
                  settings={settings}
                />
              )}
            </div>
          )}
        </main>

        {/* Real Task Modal for Create / Edit / Delete */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTaskForEdit(null);
          }}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          initialTask={selectedTaskForEdit}
          defaultDayIndex={defaultDayIndex}
          defaultTimeSlot={defaultTimeSlot}
          defaultColumn={defaultColumn}
          defaultScheduledDate={defaultScheduledDate}
        />

        {/* Pomodoro Focus Modal */}
        <PomodoroFocusModal
          isOpen={isPomodoroOpen}
          onClose={() => setIsPomodoroOpen(false)}
          tasks={tasks}
        />

        {/* Habit Tracker Modal */}
        <HabitTrackerModal
          isOpen={isHabitTrackerOpen}
          onClose={() => setIsHabitTrackerOpen(false)}
        />

        {/* Quick Notes Scratchpad Modal */}
        <QuickNotesModal
          isOpen={isQuickNotesOpen}
          onClose={() => setIsQuickNotesOpen(false)}
          onConvertToTask={handleConvertNoteToTask}
        />

        {/* User Profile Modal */}
        <UserProfileModal
          isOpen={isUserProfileOpen}
          onClose={() => setIsUserProfileOpen(false)}
          tasks={tasks}
          profile={userProfile}
          onSaveProfile={handleSaveProfile}
        />

        {/* Quick Header Dialogs (Notifications, Help) */}
        <QuickDialogs
          settingsOpen={false}
          notificationsOpen={isNotificationsOpen}
          helpOpen={isHelpOpen}
          onCloseAll={() => {
            setIsNotificationsOpen(false);
            setIsHelpOpen(false);
          }}
          onResetSeedData={handleResetSeedData}
        />

        {/* Advanced Full Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          tasks={tasks}
          onImportTasks={handleImportTasks}
          onResetSeedData={handleResetSeedData}
          authUser={authUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          userProfile={userProfile}
          onUpdateBackground={handleUpdateBackground}
          onOpenEmailModal={() => setIsEmailOpen(true)}
          onOpenScheduleReminder={() => setIsScheduleReminderOpen(true)}
          onOpenBackgroundModal={() => setIsBackgroundModalOpen(true)}
        />

        {/* AI Assistant Drawer with Real Task Scheduling */}
        <AIAssistantDrawer
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
          onAutoScheduleTask={handleAiScheduleTask}
        />

        {/* Background Wallpaper Modal */}
        <BackgroundModal
          isOpen={isBackgroundModalOpen}
          onClose={() => setIsBackgroundModalOpen(false)}
          profile={userProfile}
          onUpdateBackground={handleUpdateBackground}
        />

        {/* Email Postcard Modal */}
        <EmailPostcardModal
          isOpen={isEmailOpen}
          onClose={() => setIsEmailOpen(false)}
        />

        {/* Schedule Reminder & Google Calendar Sync Modal */}
        <ScheduleReminderModal
          isOpen={isScheduleReminderOpen}
          onClose={() => setIsScheduleReminderOpen(false)}
          tasks={tasks}
          authUser={authUser}
        />

        {/* Auth Modal for Register & Login */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* Global Luxury Atelier Notification & Confirm Modal */}
        <GlobalNotificationModal />

        {/* Mobile Bottom Navigation Bar */}
        <nav
          aria-label="Điều hướng di động"
          className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t-2 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around ${
            settings.theme === 'midnight'
              ? 'bg-[#0E131F]/95 border-[#1E2638] text-slate-300'
              : 'bg-[#FFFDF7]/95 border-[#0F172A] text-[#0F172A]'
          }`}
          style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setActiveTab('tracker');
            }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-black transition-colors ${
              activeTab === 'tracker' ? 'text-[#E11D48] bg-[#FFE4E6]' : ''
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Lịch biểu</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setActiveTab('vocab');
            }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-black transition-colors ${
              activeTab === 'vocab' ? 'text-[#E11D48] bg-[#FFE4E6]' : ''
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>Từ vựng</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setActiveTab('journal');
            }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-black transition-colors ${
              activeTab === 'journal' ? 'text-[#E11D48] bg-[#FFE4E6]' : ''
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Nhật ký</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playPentatonicChime(4);
              setIsAiOpen(true);
            }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-black text-[#E11D48]"
          >
            <Bot className="w-4 h-4" />
            <span>AI</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setIsMobileSidebarOpen(true);
            }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-black"
          >
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </nav>
      </div>
    </>
  );
}
