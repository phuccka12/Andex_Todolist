'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock,
  FolderKanban,
  BarChart3,
  Tag,
  CheckCircle,
  Flame,
  Target,
  StickyNote,
  Image as ImageIcon,
  BookOpen,
  Menu,
  Settings,
  Sparkles,
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
  onOpenBackground,
  onOpenSettings,
  completedCount = 0,
  profile,
  authUser,
  onOpenAuth,
  isCollapsed = false,
  onToggleCollapse,
  theme = 'slate',
  customTheme,
}) => {
  const isCustom = theme === 'custom';
  const customIsDark = customTheme?.isDark ?? true;
  const isDark = isCustom ? customIsDark : theme === 'midnight';

  // Theme-specific styles for the sidebar
  const getThemeStyles = () => {
    if (isCustom && customTheme) {
      return {
        aside: '',
        asideStyle: {
          backgroundColor: customTheme.sidebarBg,
          borderColor: customIsDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          color: customIsDark ? '#F1F5F9' : '#1E2433',
        },
        sectionTitle: customIsDark ? 'text-slate-400' : 'text-slate-500',
        btnDefault: customIsDark
          ? 'text-slate-300 hover:bg-white/10 hover:text-white'
          : 'text-slate-700 hover:bg-black/5 hover:text-slate-900',
        btnActive: 'text-white shadow-xs font-bold',
        btnActiveStyle: {
          backgroundColor: customTheme.accentColor,
        },
        iconActive: 'text-white',
        iconDefault: customIsDark ? 'text-slate-400' : 'text-slate-500',
        badgeNew: customIsDark
          ? 'bg-white/15 text-white border-white/20'
          : 'bg-black/10 text-slate-800 border-black/15',
        borderSeparator: customIsDark ? 'border-white/10' : 'border-black/10',
        toggleBtn: customIsDark
          ? 'text-slate-300 hover:text-white hover:bg-white/10'
          : 'text-slate-600 hover:text-slate-900 hover:bg-black/5',
        quickUploadBg: customIsDark
          ? 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-200'
          : 'border-black/10 bg-white hover:bg-black/5 text-slate-700',
      };
    }

    switch (theme) {
      case 'cream':
        return {
          aside: 'bg-[#EDE4D5] border-r border-[#DCCEB9] text-[#2C180C]',
          asideStyle: {},
          sectionTitle: 'text-[#8A715E]',
          btnDefault: 'text-[#5C4535] hover:bg-[#FAF7F2]/80 hover:text-[#2C180C]',
          btnActive: 'bg-[#8C5D35] text-white shadow-xs font-bold',
          btnActiveStyle: {},
          iconActive: 'text-white',
          iconDefault: 'text-[#8A715E]',
          badgeNew: 'bg-[#DFCDB9] text-[#3D2514] border-[#CBB39C]',
          borderSeparator: 'border-[#DCCEB9]',
          toggleBtn: 'text-[#5C4535] hover:text-[#2C180C] hover:bg-[#FAF7F2]/80',
          quickUploadBg: 'border-[#DCCEB9] bg-[#FAF7F2] hover:bg-[#F2EAE0] text-[#5C4535]',
        };
      case 'graphite':
        return {
          aside: 'bg-[#E5E9F0] border-r border-[#CBD5E1] text-[#0F172A]',
          asideStyle: {},
          sectionTitle: 'text-[#64748B]',
          btnDefault: 'text-[#334155] hover:bg-white/90 hover:text-[#0F172A]',
          btnActive: 'bg-[#0F172A] text-white shadow-xs font-bold',
          btnActiveStyle: {},
          iconActive: 'text-white',
          iconDefault: 'text-[#64748B]',
          badgeNew: 'bg-slate-200 text-slate-800 border-slate-300',
          borderSeparator: 'border-[#CBD5E1]',
          toggleBtn: 'text-[#475569] hover:text-[#0F172A] hover:bg-white/80',
          quickUploadBg: 'border-[#CBD5E1] bg-white hover:bg-slate-100 text-[#334155]',
        };
      case 'sage':
        return {
          aside: 'bg-[#E5EEE7] border-r border-[#C9D9CD] text-[#1B3624]',
          asideStyle: {},
          sectionTitle: 'text-[#527961]',
          btnDefault: 'text-[#2C4A34] hover:bg-white/80 hover:text-[#14301C]',
          btnActive: 'bg-[#166534] text-white shadow-xs font-bold',
          btnActiveStyle: {},
          iconActive: 'text-white',
          iconDefault: 'text-[#527961]',
          badgeNew: 'bg-[#D1E2D6] text-[#14301C] border-[#B7CEBE]',
          borderSeparator: 'border-[#C9D9CD]',
          toggleBtn: 'text-[#2C4A34] hover:text-[#14301C] hover:bg-white/80',
          quickUploadBg: 'border-[#C9D9CD] bg-[#F2F7F4] hover:bg-white text-[#2C4A34]',
        };
      case 'midnight':
        return {
          aside: 'bg-[#0E131F] border-r border-[#1E2638] text-[#F1F5F9]',
          asideStyle: {},
          sectionTitle: 'text-[#64748B]',
          btnDefault: 'text-[#94A3B8] hover:bg-[#1A2234] hover:text-white',
          btnActive: 'bg-[#2563EB] text-white shadow-sm font-bold',
          btnActiveStyle: {},
          iconActive: 'text-white',
          iconDefault: 'text-[#64748B]',
          badgeNew: 'bg-blue-900/60 text-blue-200 border-blue-700/50',
          borderSeparator: 'border-[#1E2638]',
          toggleBtn: 'text-[#94A3B8] hover:text-white hover:bg-[#1A2234]',
          quickUploadBg: 'border-[#1E2638] bg-[#141A26] hover:bg-[#1E2638] text-slate-300',
        };
      case 'slate':
      default:
        return {
          aside: 'bg-[#F1F4F9] border-r border-[#E2E8F0] text-[#1E2433]',
          asideStyle: {},
          sectionTitle: 'text-[#64748B]',
          btnDefault: 'text-[#475569] hover:bg-white/80 hover:text-[#1E2433]',
          btnActive: 'bg-[#2563EB] text-white shadow-xs font-bold',
          btnActiveStyle: {},
          iconActive: 'text-white',
          iconDefault: 'text-[#64748B]',
          badgeNew: 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]',
          borderSeparator: 'border-[#E2E8F0]',
          toggleBtn: 'text-[#64748B] hover:text-[#1E2433] hover:bg-white/80',
          quickUploadBg: 'border-[#E2E8F0] bg-white hover:bg-[#EFF6FF] text-[#475569]',
        };
    }
  };

  const themeStyles = getThemeStyles();

  const handleToggle = () => {
    soundEngine.playSoftClick();
    if (onToggleCollapse) onToggleCollapse();
  };

  return (
    <aside
      style={themeStyles.asideStyle}
      className={`${
        isCollapsed ? 'w-[72px] p-2.5' : 'w-60 p-3.5'
      } flex flex-col justify-between select-none h-full shrink-0 border-r transition-all duration-300 ease-in-out ${
        themeStyles.aside
      }`}
    >
      <div className="space-y-4">
        {/* Brand Logo & 3-stripe Toggle Header */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-1.5 pt-0.5 pb-1">
            <div className="flex items-center gap-2 text-left">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2563EB] via-[#4F46E5] to-[#7C3AED] shadow-[0_4px_12px_rgba(37,99,235,0.35)] flex items-center justify-center text-white font-black text-xs tracking-tighter shrink-0">
                CBP
              </div>
              <div className="flex flex-col text-left">
                <span className={`font-black text-base tracking-wider ${isDark ? 'text-white' : 'text-[#1E2433]'}`}>
                  CBP
                </span>
                <span className="text-[8px] font-bold text-[#98A2B3] tracking-widest uppercase -mt-0.5 text-left">
                  Andex OS
                </span>
              </div>
            </div>

            {/* 3-stripe Hamburger Button */}
            <button
              onClick={handleToggle}
              className={`p-1.5 rounded-lg transition-colors ${themeStyles.toggleBtn}`}
              title="Thu gọn menu (3 sọc)"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pt-0.5 pb-1">
            <button
              onClick={handleToggle}
              className={`p-2 rounded-xl transition-all group ${themeStyles.toggleBtn}`}
              title="Mở rộng menu (3 sọc)"
            >
              <Menu className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2563EB] via-[#4F46E5] to-[#7C3AED] shadow-sm flex items-center justify-center text-white font-black text-xs shrink-0">
              CBP
            </div>
          </div>
        )}

        {/* Section 1: Main Workspaces */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className={`text-[10px] font-bold tracking-wider uppercase px-2 text-left block ${themeStyles.sectionTitle}`}>
              Main
            </span>
          )}
          <nav className="space-y-0.5">
            {/* Time Tracker */}
            <button
              onClick={() => setActiveTab('tracker')}
              style={activeTab === 'tracker' ? themeStyles.btnActiveStyle : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2 rounded-xl' : 'gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left'
              } transition-all relative group ${
                activeTab === 'tracker' ? themeStyles.btnActive : themeStyles.btnDefault
              }`}
              title="Time Tracker"
            >
              <Clock
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'tracker' ? themeStyles.iconActive : themeStyles.iconDefault
                }`}
              />
              {!isCollapsed && <span>Time Tracker</span>}
            </button>

            {/* Projects */}
            <button
              onClick={() => setActiveTab('projects')}
              style={activeTab === 'projects' ? themeStyles.btnActiveStyle : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2 rounded-xl' : 'gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left'
              } transition-all relative group ${
                activeTab === 'projects' ? themeStyles.btnActive : themeStyles.btnDefault
              }`}
              title="Projects"
            >
              <FolderKanban
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'projects' ? themeStyles.iconActive : themeStyles.iconDefault
                }`}
              />
              {!isCollapsed && <span>Projects</span>}
            </button>

            {/* Reports */}
            <button
              onClick={() => setActiveTab('reports')}
              style={activeTab === 'reports' ? themeStyles.btnActiveStyle : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2 rounded-xl' : 'gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left'
              } transition-all relative group ${
                activeTab === 'reports' ? themeStyles.btnActive : themeStyles.btnDefault
              }`}
              title="Reports"
            >
              <BarChart3
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'reports' ? themeStyles.iconActive : themeStyles.iconDefault
                }`}
              />
              {!isCollapsed && <span>Reports</span>}
            </button>

            {/* Tags */}
            <button
              onClick={() => setActiveTab('tags')}
              style={activeTab === 'tags' ? themeStyles.btnActiveStyle : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2 rounded-xl' : 'gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left'
              } transition-all relative group ${
                activeTab === 'tags' ? themeStyles.btnActive : themeStyles.btnDefault
              }`}
              title="Tags & Phân Loại"
            >
              <Tag
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'tags' ? themeStyles.iconActive : themeStyles.iconDefault
                }`}
              />
              {!isCollapsed && <span>Tags</span>}
            </button>

            {/* Nhật Ký Ký Ức */}
            <button
              onClick={() => setActiveTab('journal')}
              className={`w-full flex items-center ${
                isCollapsed
                  ? 'justify-center p-2 rounded-xl'
                  : 'justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left'
              } transition-all relative group ${
                activeTab === 'journal'
                  ? 'bg-[#EDE0CE] text-[#2C180C] font-bold shadow-xs border border-[#DECDB8]'
                  : themeStyles.btnDefault
              }`}
              title="Nhật Ký Ký Ức"
            >
              <div className="flex items-center gap-2.5 text-left">
                <BookOpen
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'journal' ? 'text-[#8C5D35]' : themeStyles.iconDefault
                  }`}
                />
                {!isCollapsed && <span>Nhật Ký Ký Ức</span>}
              </div>
              {!isCollapsed ? (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                    activeTab === 'journal'
                      ? 'bg-[#DFCDB9] text-[#3D2514] border-[#CBB39C]'
                      : themeStyles.badgeNew
                  }`}
                >
                  New
                </span>
              ) : (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#8C5D35]" />
              )}
            </button>

            {/* Đã Hoàn Thành */}
            <button
              onClick={() => setActiveTab('archive')}
              className={`w-full flex items-center ${
                isCollapsed
                  ? 'justify-center p-2 rounded-xl'
                  : 'justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left'
              } transition-all relative group ${
                activeTab === 'archive' ? 'bg-[#E6F9F0] text-[#059669] font-bold' : themeStyles.btnDefault
              }`}
              title="Đã Hoàn Thành"
            >
              <div className="flex items-center gap-2.5 text-left">
                <CheckCircle
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'archive' ? 'text-[#059669]' : themeStyles.iconDefault
                  }`}
                />
                {!isCollapsed && <span>Đã Hoàn Thành</span>}
              </div>
              {completedCount > 0 &&
                (!isCollapsed ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#A7F3D0] text-[#065F46] shrink-0">
                    {completedCount}
                  </span>
                ) : (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-3.5 px-1 rounded-full bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center">
                    {completedCount}
                  </span>
                ))}
            </button>
          </nav>
        </div>

        {/* Section 2: Personal Productivity Tools */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className={`text-[10px] font-bold tracking-wider uppercase px-2 text-left block ${themeStyles.sectionTitle}`}>
              Năng Suất Cá Nhân
            </span>
          )}
          <nav className="space-y-0.5">
            {/* Pomodoro */}
            <button
              onClick={onOpenPomodoro}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2 rounded-xl' : 'gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
              } ${themeStyles.btnDefault} transition-colors group relative`}
              title="Đồng Hồ Pomodoro (25m)"
            >
              <Flame className="w-4 h-4 text-[#F43F5E] shrink-0" />
              {!isCollapsed ? (
                <>
                  <span className="flex-1 text-left font-medium text-xs truncate">Đồng Hồ Pomodoro</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 shrink-0 ml-auto">
                    25m
                  </span>
                </>
              ) : (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
              )}
            </button>

            {/* Habit Tracker */}
            <button
              onClick={onOpenHabitTracker}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2 rounded-xl' : 'gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
              } ${themeStyles.btnDefault} transition-colors group relative`}
              title="Thói Quen Hàng Ngày (Streak)"
            >
              <Target className="w-4 h-4 text-[#F59E0B] shrink-0" />
              {!isCollapsed ? (
                <>
                  <span className="flex-1 text-left font-medium text-xs truncate">Thói Quen Hàng Ngày</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 shrink-0 ml-auto">
                    Streak
                  </span>
                </>
              ) : (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              )}
            </button>

            {/* Quick Notes */}
            <button
              onClick={onOpenQuickNotes}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2 rounded-xl' : 'gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
              } ${themeStyles.btnDefault} transition-colors group`}
              title="Ghi Chú Nhanh"
            >
              <StickyNote className="w-4 h-4 text-[#7B61FF] shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left font-medium text-xs truncate">Ghi Chú Nhanh</span>}
            </button>
          </nav>
        </div>

        {/* Quick Wallpaper Upload Trigger */}
        <button
          onClick={onOpenBackground}
          className={`w-full ${
            isCollapsed ? 'p-2 flex justify-center' : 'py-1.5 px-2.5 flex items-center justify-between'
          } rounded-xl border text-[11px] font-bold transition-all shadow-2xs group ${themeStyles.quickUploadBg}`}
          title="Tự tải ảnh nền cá nhân hoặc đổi wallpaper"
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#3B82F6] shrink-0" />
            {!isCollapsed && <span>Đổi Background</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[9px] font-extrabold text-[#3B82F6] bg-blue-50 group-hover:bg-blue-100 px-1.5 py-0.5 rounded-md">
              Upload
            </span>
          )}
        </button>
      </div>

      {/* Bottom Area: Settings + User Profile Card */}
      <div className="space-y-2">
        {/* Landing Page Link */}
        <div className={`pt-2 border-t ${themeStyles.borderSeparator}`}>
          <Link
            href="/"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2 rounded-xl' : 'gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
            } ${themeStyles.btnDefault} transition-all group`}
            title="Xem Trang Giới Thiệu Andex OS"
          >
            <Sparkles className={`w-4 h-4 shrink-0 text-[#2563EB] group-hover:scale-110 transition-transform`} />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>Trang Giới Thiệu</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#2563EB]">
                  Landing
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Settings Navigation Item - Directly in Sidebar */}
        <div className={`pt-1`}>
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              if (onOpenSettings) onOpenSettings();
            }}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2 rounded-xl' : 'gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
            } ${themeStyles.btnDefault} transition-all group`}
            title="Cài Đặt Hệ Thống & Tùy Biến Theme"
          >
            <Settings className={`w-4 h-4 shrink-0 ${themeStyles.iconDefault} group-hover:rotate-90 transition-transform duration-300`} />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>Cài Đặt Hệ Thống</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-white/10 text-slate-300' : 'bg-black/5 text-slate-500'
                }`}>
                  Theme
                </span>
              </div>
            )}
          </button>
        </div>

        {/* User Profile Card */}
        <div className={`pt-2 border-t ${themeStyles.borderSeparator}`}>
          {authUser ? (
            <div
              onClick={onOpenUserProfile}
              className={`flex items-center ${
                isCollapsed ? 'justify-center p-1.5' : 'gap-2.5 p-1.5'
              } hover:bg-black/5 cursor-pointer rounded-xl transition-colors group`}
              title={`${authUser.name} - Hồ sơ cá nhân`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[11px] shadow-xs overflow-hidden shrink-0 border border-white">
                {authUser.avatar || profile?.avatar ? (
                  <img
                    src={authUser.avatar || profile?.avatar}
                    alt={authUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {(authUser.name || 'CBP')
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
                  <h4 className="text-xs font-bold truncate group-hover:text-[#3B82F6] transition-colors text-left">
                    {authUser.name}
                  </h4>
                  <span className="text-[9px] text-emerald-600 font-semibold truncate block text-left flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Cloud Sync 🍃</span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={onOpenAuth}
              className={`flex items-center ${
                isCollapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2'
              } hover:bg-blue-50 cursor-pointer rounded-xl transition-all group`}
              title="Đăng Nhập / Đăng Ký Tài Khoản"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#2563EB] font-black flex items-center justify-center text-xs shrink-0 group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                +
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden flex-1 text-left">
                  <h4 className="text-xs font-bold text-[#2563EB] truncate text-left">
                    Đăng Nhập / Đăng Ký
                  </h4>
                  <span className="text-[9px] text-[#98A2B3] truncate block text-left">
                    Lưu & Đồng bộ dữ liệu ▾
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
