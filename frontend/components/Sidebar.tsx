'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock,
  FolderKanban,
  BarChart3,
  Flame,
  Target,
  StickyNote,
  BookOpen,
  Menu,
  Settings,
  Languages,
} from 'lucide-react';
import { soundEngine } from '../lib/audio';
import { UserProfileData } from '../lib/types';
import { AuthUser } from '../lib/authService';
import { AppTheme, CustomThemeConfig } from '../lib/settingsStorage';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenPomodoro: () => void;
  onOpenHabitTracker: () => void;
  onOpenQuickNotes: () => void;
  onOpenUserProfile: () => void;
  onOpenBackground?: () => void;
  onOpenSettings?: () => void;
  completedCount?: number;
  profile?: UserProfileData;
  authUser?: AuthUser | null;
  onOpenAuth?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
  className?: string;
  theme?: AppTheme;
  customTheme?: CustomThemeConfig;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenPomodoro,
  onOpenHabitTracker,
  onOpenQuickNotes,
  onOpenUserProfile,
  onOpenSettings,
  profile,
  authUser,
  onOpenAuth,
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobile,
  className = '',
  theme = 'slate',
  customTheme,
}) => {
  const isCustom = theme === 'custom';
  const customIsDark = customTheme?.isDark ?? true;
  const isDark = isCustom ? customIsDark : theme === 'midnight';

  const getThemeStyles = () => {
    if (isCustom && customTheme) {
      return {
        aside: '',
        asideStyle: {
          backgroundColor: customTheme.sidebarBg,
          borderColor: customIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          color: customIsDark ? '#F1F5F9' : '#1E2433',
        },
        sectionTitle: customIsDark ? 'text-slate-400' : 'text-slate-500',
        btnDefault: customIsDark
          ? 'text-slate-300 hover:bg-white/10 hover:text-white'
          : 'text-slate-700 hover:bg-black/5 hover:text-slate-900',
        btnActive: 'text-white shadow-xs font-bold',
        btnActiveStyle: { backgroundColor: customTheme.accentColor },
        iconActive: 'text-white',
        iconDefault: customIsDark ? 'text-slate-400' : 'text-slate-500',
        badgeNew: customIsDark
          ? 'bg-white/15 text-white border-white/20'
          : 'bg-black/10 text-slate-800 border-black/15',
        borderSeparator: customIsDark ? 'border-white/10' : 'border-black/10',
        toggleBtn: customIsDark
          ? 'text-slate-300 hover:text-white hover:bg-white/10'
          : 'text-slate-600 hover:text-slate-900 hover:bg-black/5',
      };
    }

    switch (theme) {
      case 'cream':
        return {
          aside: 'bg-[#FAF5EC] border-r-2 border-[#0F172A] text-[#0F172A]',
          asideStyle: {},
          sectionTitle: 'text-[#6E5641] font-black',
          btnDefault: 'text-[#2C180C]/85 hover:bg-[#FEF9C3] hover:text-[#0F172A] font-bold',
          btnActive: 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-black',
          btnActiveStyle: {},
          iconActive: 'text-white',
          iconDefault: 'text-[#5C4535]',
          badgeNew: 'bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]',
          borderSeparator: 'border-[#0F172A]/15',
          toggleBtn: 'text-[#0F172A] bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]',
        };
      case 'graphite':
        return {
          aside: 'bg-[#F1F5F9] border-r-2 border-[#0F172A] text-[#0F172A]',
          asideStyle: {},
          sectionTitle: 'text-[#475569] font-black',
          btnDefault: 'text-[#0F172A]/80 hover:bg-white hover:text-[#0F172A] font-bold',
          btnActive: 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-black',
          btnActiveStyle: {},
          iconActive: 'text-white',
          iconDefault: 'text-[#334155]',
          badgeNew: 'bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]',
          borderSeparator: 'border-[#0F172A]/15',
          toggleBtn: 'text-[#0F172A] bg-white hover:bg-[#FFE4E6] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]',
        };
      case 'sage':
        return {
          aside: 'bg-[#ECFDF5] border-r-2 border-[#0F172A] text-[#0F172A]',
          asideStyle: {},
          sectionTitle: 'text-[#166534] font-black',
          btnDefault: 'text-[#14532D] hover:bg-white hover:text-[#0F172A] font-bold',
          btnActive: 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-black',
          btnActiveStyle: {},
          iconActive: 'text-white',
          iconDefault: 'text-[#166534]',
          badgeNew: 'bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]',
          borderSeparator: 'border-[#0F172A]/15',
          toggleBtn: 'text-[#0F172A] bg-white hover:bg-[#DCFCE7] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]',
        };
      case 'midnight':
        return {
          aside: 'bg-[#090A0F] border-r border-white/[0.08] text-[#F1F5F9]',
          asideStyle: {},
          sectionTitle: 'text-slate-500',
          btnDefault: 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
          btnActive: 'bg-[#1DB954] text-[#090A0F] shadow-sm font-bold',
          btnActiveStyle: {},
          iconActive: 'text-[#090A0F]',
          iconDefault: 'text-slate-500',
          badgeNew: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          borderSeparator: 'border-white/[0.08]',
          toggleBtn: 'text-slate-400 hover:text-white hover:bg-white/[0.08]',
        };
      case 'slate':
      default:
        return {
          aside: 'bg-[#FFFDF7] border-r-2 border-[#0F172A] text-[#0F172A]',
          asideStyle: {},
          sectionTitle: 'text-slate-500 font-black',
          btnDefault: 'text-[#0F172A]/80 hover:bg-[#FFE4E6]/75 hover:text-[#0F172A] font-bold',
          btnActive: 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-black',
          btnActiveStyle: {},
          iconActive: 'text-white',
          iconDefault: 'text-[#0F172A]/70',
          badgeNew: 'bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]',
          borderSeparator: 'border-[#0F172A]/15',
          toggleBtn: 'text-[#0F172A] hover:bg-[#FFE4E6] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]',
        };
    }
  };

  const themeStyles = getThemeStyles();

  const handleToggle = () => {
    soundEngine.playSoftClick();
    if (onCloseMobile) {
      onCloseMobile();
      return;
    }
    if (onToggleCollapse) onToggleCollapse();
  };

  const isProjectsGroup = activeTab === 'projects' || activeTab === 'tags';

  return (
    <aside
      style={themeStyles.asideStyle}
      className={`${
        isCollapsed ? 'w-[68px] p-2.5' : 'w-56 p-3.5'
      } flex flex-col justify-between select-none h-full shrink-0 transition-all duration-200 ease-in-out overflow-y-auto ${
        themeStyles.aside
      } ${className}`}
    >
      <div className="space-y-5">
        {/* Brand Header */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
            <Link
              href="/"
              className="flex flex-col items-start group min-w-0"
              title="Về trang giới thiệu Genncore"
            >
              <div className="px-2.5 py-1.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] group-hover:shadow-[1px_1px_0px_#0F172A] group-hover:translate-x-[1px] group-hover:translate-y-[1px] transition-all">
                <img
                  src="/images/logo-wordmark.png"
                  alt="Genncore"
                  className="block h-5 w-auto max-w-[128px] object-contain object-left"
                />
              </div>
            </Link>

            <button
              onClick={handleToggle}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${themeStyles.toggleBtn}`}
              title={onCloseMobile ? 'Đóng menu' : 'Thu gọn menu'}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pt-0.5">
            <Link
              href="/"
              title="Genncore Workspace"
              className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center p-1.5 shrink-0 hover:scale-105 transition-transform ${
                isDark
                  ? 'bg-white/[0.08] border-white/15'
                  : 'bg-white border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
              }`}
            >
              <img
                src="/images/logo-mark.png"
                alt="G"
                className={`block w-full h-full object-contain ${isDark ? 'brightness-0 invert' : ''}`}
              />
            </Link>
            <button
              onClick={handleToggle}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${themeStyles.toggleBtn}`}
              title="Mở rộng menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Group 1: Workspace (4 Core Tabs) */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 block mb-1.5 ${themeStyles.sectionTitle}`}>
              Không Gian
            </span>
          )}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('tracker')}
              style={activeTab === 'tracker' ? themeStyles.btnActiveStyle : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5 rounded-xl' : 'gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
              } transition-all cursor-pointer ${
                activeTab === 'tracker' ? themeStyles.btnActive : themeStyles.btnDefault
              }`}
              title="Lịch Biểu & Công Việc"
            >
              <Clock className={`w-4 h-4 shrink-0 ${activeTab === 'tracker' ? themeStyles.iconActive : themeStyles.iconDefault}`} />
              {!isCollapsed && <span>Lịch Biểu</span>}
            </button>

            <button
              onClick={() => setActiveTab('vocab')}
              style={activeTab === 'vocab' ? themeStyles.btnActiveStyle : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5 rounded-xl' : 'gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
              } transition-all cursor-pointer ${
                activeTab === 'vocab' ? themeStyles.btnActive : themeStyles.btnDefault
              }`}
              title="Học & Review Từ Vựng Tiếng Anh"
            >
              <Languages className={`w-4 h-4 shrink-0 ${activeTab === 'vocab' ? themeStyles.iconActive : themeStyles.iconDefault}`} />
              {!isCollapsed && <span>Từ Vựng</span>}
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              style={isProjectsGroup ? themeStyles.btnActiveStyle : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5 rounded-xl' : 'gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
              } transition-all cursor-pointer ${
                isProjectsGroup ? themeStyles.btnActive : themeStyles.btnDefault
              }`}
              title="Dự Án & Nhãn"
            >
              <FolderKanban className={`w-4 h-4 shrink-0 ${isProjectsGroup ? themeStyles.iconActive : themeStyles.iconDefault}`} />
              {!isCollapsed && <span>Dự Án & Nhãn</span>}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              style={activeTab === 'reports' ? themeStyles.btnActiveStyle : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5 rounded-xl' : 'gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
              } transition-all cursor-pointer ${
                activeTab === 'reports' ? themeStyles.btnActive : themeStyles.btnDefault
              }`}
              title="Báo Cáo Năng Suất"
            >
              <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'reports' ? themeStyles.iconActive : themeStyles.iconDefault}`} />
              {!isCollapsed && <span>Thống Kê</span>}
            </button>

            <button
              onClick={() => setActiveTab('journal')}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5 rounded-xl' : 'justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
              } transition-all relative cursor-pointer ${
                activeTab === 'journal'
                  ? themeStyles.btnActive
                  : themeStyles.btnDefault
              }`}
              title="Nhật Ký Ký Ức"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className={`w-4 h-4 shrink-0 ${activeTab === 'journal' ? themeStyles.iconActive : themeStyles.iconDefault}`} />
                {!isCollapsed && <span>Nhật Ký</span>}
              </div>
              {!isCollapsed && (
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${
                    activeTab === 'journal'
                      ? 'bg-[#FEF08A] text-[#0F172A] border-[#0F172A]'
                      : themeStyles.badgeNew
                  }`}
                >
                  Chill
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Group 2: Tools (3 Compact Items) */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 block mb-1.5 ${themeStyles.sectionTitle}`}>
              Công Cụ
            </span>
          )}
          <nav className="space-y-1">
            <button
              onClick={onOpenPomodoro}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5 rounded-xl' : 'gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
              } ${themeStyles.btnDefault} transition-colors cursor-pointer`}
              title="Đồng Hồ Pomodoro (25m)"
            >
              <Flame className="w-4 h-4 text-[#E11D48] shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate">Pomodoro</span>
                  <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md ${isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-[#FFE4E6] text-[#E11D48] border border-[#0F172A]'}`}>
                    25m
                  </span>
                </>
              )}
            </button>

            <button
              onClick={onOpenHabitTracker}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5 rounded-xl' : 'gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
              } ${themeStyles.btnDefault} transition-colors cursor-pointer`}
              title="Thói Quen Hàng Ngày (Streak)"
            >
              <Target className="w-4 h-4 text-amber-500 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate">Thói Quen</span>
                  <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]'}`}>
                    Streak
                  </span>
                </>
              )}
            </button>

            <button
              onClick={onOpenQuickNotes}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5 rounded-xl' : 'gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
              } ${themeStyles.btnDefault} transition-colors cursor-pointer`}
              title="Ghi Chú Nhanh"
            >
              <StickyNote className="w-4 h-4 text-[#E11D48] shrink-0" />
              {!isCollapsed && <span className="flex-1 truncate">Ghi Chú</span>}
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom Area: Settings + Account */}
      <div className="space-y-2 pt-3">
        <div className={`pt-2.5 border-t-2 ${themeStyles.borderSeparator}`}>
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              onOpenSettings?.();
            }}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5 rounded-xl' : 'gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
            } ${themeStyles.btnDefault} transition-all group cursor-pointer`}
            title="Cài Đặt, Giao Diện & Hình Nền"
          >
            <Settings className={`w-4 h-4 shrink-0 ${themeStyles.iconDefault} group-hover:rotate-45 transition-transform duration-300`} />
            {!isCollapsed && <span className="flex-1">Cài Đặt</span>}
          </button>
        </div>

        <div className={`pt-2 border-t-2 ${themeStyles.borderSeparator}`}>
          {authUser ? (
            <div
              onClick={onOpenUserProfile}
              className={`flex items-center ${
                isCollapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2'
              } ${isDark ? 'hover:bg-white/10' : 'bg-white hover:bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'} cursor-pointer rounded-xl transition-all group`}
              title={`${authUser.name} - Hồ sơ cá nhân`}
            >
              <div className="w-8 h-8 rounded-lg bg-[#E11D48] border border-[#0F172A] text-white font-black flex items-center justify-center text-[11px] overflow-hidden shrink-0">
                {authUser.avatar || profile?.avatar ? (
                  <img
                    src={authUser.avatar || profile?.avatar}
                    alt={authUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {(authUser.name || 'GC')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden flex-1 text-left">
                  <h4 className="text-xs font-black truncate">{authUser.name}</h4>
                  <span className="text-[9.5px] text-emerald-600 font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Cloud Sync</span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={onOpenAuth}
              className={`flex items-center ${
                isCollapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2'
              } ${isDark ? 'hover:bg-white/[0.06]' : 'bg-[#FEF9C3] hover:bg-[#FDE047] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'} cursor-pointer rounded-xl transition-all group`}
              title="Đăng Nhập / Đăng Ký Tài Khoản"
            >
              <div className="w-8 h-8 rounded-lg bg-[#E11D48] border border-[#0F172A] text-white font-black flex items-center justify-center text-sm shrink-0">
                +
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden flex-1 text-left">
                  <h4 className="text-xs font-black text-[#0F172A] truncate">Đăng Nhập</h4>
                  <span className="text-[9.5px] text-slate-600 font-bold truncate block">Đồng bộ Cloud</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
