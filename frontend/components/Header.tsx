'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  HelpCircle,
  Bell,
  Plus,
  Sparkles,
  Mail,
  Image as ImageIcon,
  LogIn,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Globe,
} from 'lucide-react';
import { UserProfileData } from '../lib/types';
import { AuthUser } from '../lib/authService';
import { AppTheme } from '../lib/settingsStorage';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenNewTaskModal: () => void;
  onOpenAiDrawer: () => void;
  onOpenEmailModal: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenHelp?: () => void;
  onOpenBackground?: () => void;
  profile?: UserProfileData;
  onOpenProfile?: () => void;
  authUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  theme?: AppTheme;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Time Tracker',
  subtitle = 'CBP V3.0 Personal Operating System',
  onOpenNewTaskModal,
  onOpenAiDrawer,
  onOpenEmailModal,
  onOpenSettings,
  onOpenNotifications,
  onOpenHelp,
  onOpenBackground,
  profile,
  onOpenProfile,
  authUser,
  onOpenAuth,
  onLogout,
  theme = 'slate',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
    <header className={`flex items-center justify-between pb-3.5 border-b select-none shrink-0 ${
      isDark ? 'border-[#1E2638]' : theme === 'cream' ? 'border-[#DCCEB9]' : theme === 'sage' ? 'border-[#C9D9CD]' : 'border-[#EEF2F8]'
    }`}>
      <div>
        <h1 className={`text-lg font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#1E2433]'}`}>{title}</h1>
        <p className="text-[11px] text-[#8F9CAE]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Landing Page link */}
        <Link
          href="/"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200/80 bg-blue-50/70 hover:bg-blue-100 text-[#2563EB] text-xs font-bold transition-all shadow-2xs hover:scale-[1.02]"
          title="Xem trang giới thiệu Andex OS"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Giới thiệu</span>
        </Link>

        {/* Create Task button */}
        <button
          onClick={onOpenNewTaskModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1E2433] hover:bg-[#2B3448] text-white rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Tạo công việc</span>
        </button>

        {/* User Account / Auth Section */}
        {authUser ? (
          <div className="relative ml-1" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full border border-[#CBD5E1] hover:border-[#3B82F6] bg-white transition-all shadow-2xs group"
              title={`Đã đăng nhập: ${authUser.name}`}
            >
              <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 border border-white">
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
              <span className="text-xs font-bold text-[#1E2433] max-w-[100px] truncate hidden sm:inline">
                {authUser.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-[#64748B] group-hover:text-[#1E2433]" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#EEF2F8] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                <div className="px-3 py-2 border-b border-[#F1F5F9]">
                  <p className="text-xs font-bold text-[#1E2433] truncate">{authUser.name}</p>
                  <p className="text-[10px] text-[#64748B] truncate">{authUser.email}</p>
                </div>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenProfile?.();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#334155] hover:bg-[#F8FAFD] hover:text-[#2563EB] flex items-center gap-2 transition-colors text-left"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#3B82F6]" />
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#2563EB] to-[#4F46E5] hover:from-[#1D4ED8] hover:to-[#4338CA] text-white rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 ml-1"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng Nhập</span>
          </button>
        )}
      </div>
    </header>
  );
};
