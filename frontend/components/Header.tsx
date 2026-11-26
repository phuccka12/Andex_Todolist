'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Sparkles,
  LogIn,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Menu,
  Bot,
} from 'lucide-react';
import { UserProfileData } from '../lib/types';
import { AuthUser } from '../lib/authService';
import { AppTheme } from '../lib/settingsStorage';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenNewTaskModal: () => void;
  onOpenAiDrawer: () => void;
  onOpenEmailModal?: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenHelp?: () => void;
  onOpenBackground?: () => void;
  profile?: UserProfileData;
  onOpenProfile?: () => void;
  authUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenMobileMenu?: () => void;
  theme?: AppTheme;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Lịch Biểu',
  subtitle = 'Gencoore • Không gian làm việc cá nhân',
  onOpenNewTaskModal,
  onOpenAiDrawer,
  profile,
  onOpenProfile,
  authUser,
  onOpenAuth,
  onLogout,
  onOpenMobileMenu,
  theme = 'slate',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = theme === 'midnight';

  return (
    <header
      className={`flex items-center justify-between gap-3 pb-3 border-b select-none shrink-0 ${
        isDark
          ? 'border-white/[0.08]'
          : theme === 'cream'
          ? 'border-[#DCCEB9]'
          : theme === 'sage'
          ? 'border-[#C9D9CD]'
          : 'border-slate-200/80'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className={`md:hidden p-2 -ml-1 rounded-xl border transition-colors shrink-0 ${
              isDark
                ? 'border-white/10 text-slate-200 hover:bg-white/10'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
            }`}
            aria-label="Mở menu điều hướng"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div
          className={`md:hidden w-8 h-8 rounded-xl border p-1.5 shadow-2xs shrink-0 flex items-center justify-center ${
            isDark ? 'bg-white/[0.08] border-white/15' : 'bg-white border-slate-200/80'
          }`}
        >
          <img
            src="/images/logo-mark.png"
            alt="Genncore"
            className={`block w-full h-full object-contain ${isDark ? 'brightness-0 invert' : ''}`}
          />
        </div>
        <div className="min-w-0">
          <h1
            className={`text-base sm:text-lg font-extrabold tracking-tight truncate ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {title}
          </h1>
          <p className={`text-[11px] hidden sm:block truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Gencoore AI Trigger (Moved cleanly into Header so it never blocks bottom-right UI) */}
        <button
          onClick={onOpenAiDrawer}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
            isDark
              ? 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-400/30 text-indigo-300'
              : 'bg-indigo-50/80 hover:bg-indigo-100 border-indigo-200/80 text-indigo-700'
          }`}
          title="Mở Trợ lý Gencoore AI"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Gencoore AI</span>
          <Sparkles className="w-3 h-3 text-pink-500" />
        </button>

        {/* Create Task button */}
        <button
          onClick={onOpenNewTaskModal}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-[#1DB954] hover:bg-[#1ed760] text-[#090A0F]'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Tạo công việc</span>
          <span className="sm:hidden">Mới</span>
        </button>

        {/* User Account / Auth Section */}
        {authUser ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-xl border transition-all group cursor-pointer ${
                isDark
                  ? 'border-white/10 bg-[#12151E] hover:border-white/25 text-slate-100'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
              }`}
              title={`Đã đăng nhập: ${authUser.name}`}
            >
              <div className="w-6 h-6 rounded-lg overflow-hidden bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
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
              <span className="text-xs font-bold max-w-[90px] truncate hidden sm:inline">
                {authUser.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{authUser.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{authUser.email}</p>
                </div>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenProfile?.();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors text-left"
                >
                  <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Hồ sơ cá nhân</span>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onLogout?.();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng Nhập</span>
          </button>
        )}
      </div>
    </header>
  );
};
