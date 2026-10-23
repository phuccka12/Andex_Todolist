'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { FloatingAiWidget } from '@/components/FloatingAiWidget';
import { JournalView } from '@/components/JournalView';
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
          return [normalized, ...prev];
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
          title: 'Projects Workspace',
          subtitle: 'Không gian điều phối và theo dõi tiến độ các dự án trọng tâm',
        };
      case 'reports':
        return {
          title: 'Productivity Reports',
          subtitle: 'Báo cáo năng suất, nhịp làm việc và phân tích thói quen Deep Work',
        };
      case 'tags':
        return {
          title: 'Tags & Categories',
          subtitle: 'Lọc và quản lý công việc theo các nhãn phân loại',
        };
      case 'archive':
        return {
          title: 'Completed Archive',
          subtitle: 'Kho lưu trữ và khôi phục các công việc đã chốt hoàn thành',
        };
      case 'journal':
        return {
          title: 'Nhật Ký Ký Ức',
          subtitle: 'Bảng lưu giữ khoảnh khắc, ảnh polaroid và những dòng suy ngẫm theo từng tháng',
        };
      default:
        return {
          title: 'Time Tracker',
          subtitle: 'CBP V3.0 Personal Operating System',
        };
    }
  };

  const headerMeta = getHeaderMeta();

  // Dynamic Theme Styling for Frame and Canvas
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
        return 'bg-[#141A24] text-[#F1F5F9]';
      case 'custom':
        return '';
      case 'slate':
      default:
        return 'bg-[#FAFBFD] text-[#1E2433]';
    }
  };

  const getFrameThemeClass = () => {
    switch (settings.theme) {
      case 'cream':
        return 'border-[#DCCEB9] bg-[#FAF7F2]';
      case 'graphite':
        return 'border-[#CBD5E1] bg-[#F8FAFC]';
      case 'sage':
        return 'border-[#C9D9CD] bg-[#F4F8F5]';
      case 'midnight':
        return 'border-[#1E2638] bg-[#141A24]';
      case 'custom':
        return 'border-black/10';
      case 'slate':
      default:
        return 'border-[#E2E8F0] bg-[#FAFBFD]';
    }
  };

  if (!isMounted) {
    return (
      <div className="w-full max-w-[1760px] 2xl:max-w-[1880px] h-[98vh] jiron-app-frame flex items-center justify-center bg-[#FAFBFD] border border-[#E2E8F0] shadow-app">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E11D48] to-[#F43F5E] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-rose-500/25 animate-pulse">
            A
          </div>
          <p className="text-xs font-bold text-slate-500 tracking-wider">Đang tải Andex OS...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Dynamic App Background Wallpaper */}
      {userProfile.background && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${userProfile.background})`,
            filter: `blur(${userProfile.backgroundBlur || 0}px)`,
            opacity: userProfile.backgroundOpacity ?? 0.75,
          }}
        />
      )}

      <div
        style={!userProfile.background && isCustomTheme ? customCanvasStyle : undefined}
        className={`w-full max-w-[1760px] 2xl:max-w-[1880px] h-[98vh] jiron-app-frame flex overflow-hidden shadow-app relative z-10 transition-all ${
          userProfile.background ? 'bg-white/92 backdrop-blur-xl' : getFrameThemeClass()
        }`}
      >
        {/* Left Sidebar - Personal Productivity Suite */}
        <Sidebar
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

        {/* Main Studio Area - INNER SCROLLABLE CONTENT */}
        <main
          id="main-content-scroll"
          style={activeTab !== 'journal' ? customCanvasStyle : undefined}
          className={`flex-1 h-full overflow-y-auto overflow-x-hidden ${
            activeTab === 'journal'
              ? 'p-0 bg-[#F3EBDD]'
              : `p-6 pb-12 space-y-6 ${getCanvasThemeClass()}`
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
            />
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

          {activeTab === 'projects' && (
            <ProjectsView
              tasks={tasks}
              onBackToTracker={() => setActiveTab('tracker')}
              onOpenTaskModal={handleOpenNewTask}
              onTaskClick={handleEditTask}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              tasks={tasks}
              onBackToTracker={() => setActiveTab('tracker')}
            />
          )}

          {activeTab === 'tags' && (
            <TagsView
              tasks={tasks}
              onTaskClick={handleEditTask}
              onOpenTaskModal={handleOpenNewTask}
            />
          )}

          {activeTab === 'journal' && (
            <JournalView
              authUser={authUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          )}

          {activeTab === 'tracker' && (
            <>
              {/* Section 1: Dynamic Bento Tracker Cards */}
              <BentoTrackerCards tasks={tasks} />

              {/* Section 2: Real Interactive Kanban Boards with Drag & Drop */}
              <KanbanSection
                tasks={tasks}
                onTaskClick={handleEditTask}
                onToggleChecklist={handleToggleChecklist}
                onMoveColumn={handleMoveColumn}
                onAddTaskToColumn={handleAddTaskToColumn}
                onDeleteTask={handleDeleteTask}
              />

              {/* Section 3: Hero Timetable with Drag & Drop and date-fns Month Calendar */}
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
            </>
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

        {/* Floating AI Assistant Widget (Corner trigger) */}
        <FloatingAiWidget
          isOpen={isAiOpen}
          onOpen={() => setIsAiOpen(true)}
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
      </div>
    </>
  );
}
