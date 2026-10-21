'use client';

import React, { useState } from 'react';
import {
  X,
  Settings,
  Volume2,
  VolumeX,
  Sparkles,
  Calendar,
  Clock,
  Download,
  Upload,
  Database,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sliders,
  Bell,
  PartyPopper,
  Palette,
  Check,
  Image as ImageIcon,
  Mail,
  HelpCircle,
  Keyboard,
  ExternalLink,
} from 'lucide-react';
import {
  AppSettings,
  THEME_OPTIONS,
  CustomThemeConfig,
  DEFAULT_CUSTOM_THEME,
} from '../lib/settingsStorage';
import { TaskItem, UserProfileData } from '../lib/types';
import { soundEngine } from '../lib/audio';
import { authService, AuthUser } from '../lib/authService';
import { PRESET_BACKGROUNDS } from '../lib/profileStorage';
import { notify } from '../lib/notificationService';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  tasks: TaskItem[];
  onImportTasks: (importedTasks: TaskItem[]) => Promise<void>;
  onResetSeedData: () => Promise<void>;
  authUser?: AuthUser | null;
  onOpenAuth?: () => void;
  userProfile?: UserProfileData;
  onUpdateBackground?: (updates: {
    background: string;
    applyAppBackground: boolean;
    backgroundBlur?: number;
    backgroundOpacity?: number;
  }) => void;
  onOpenEmailModal?: () => void;
  onOpenScheduleReminder?: () => void;
  onOpenBackgroundModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  tasks,
  onImportTasks,
  onResetSeedData,
  authUser,
  onOpenAuth,
  userProfile,
  onUpdateBackground,
  onOpenEmailModal,
  onOpenScheduleReminder,
  onOpenBackgroundModal,
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'wallpaper' | 'email' | 'audio' | 'calendar' | 'data' | 'help' | 'account'>('theme');

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Import state
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sound testing
  const handleTestSound = () => {
    soundEngine.playPentatonicChime(4);
  };

  // Export JSON Backup
  const handleExportData = async () => {
    try {
      const backupData = {
        app: 'CBP Atelier OS',
        version: '3.0',
        exportedAt: new Date().toISOString(),
        tasksCount: tasks.length,
        tasks,
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cbp_tasks_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      soundEngine.playPentatonicChime(3);
      await notify.success('Tệp sao lưu cbp_tasks_backup.json đã được tải về máy thành công!');
    } catch (err: any) {
      await notify.error('Lỗi xuất dữ liệu: ' + err.message);
    }
  };

  // Import JSON File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportLoading(true);
      setImportMsg(null);
      const text = await file.text();
      const parsed = JSON.parse(text);

      const tasksToImport: TaskItem[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.tasks)
        ? parsed.tasks
        : null;

      if (!tasksToImport || tasksToImport.length === 0) {
        throw new Error('Tệp JSON không chứa danh sách task hợp lệ.');
      }

      await onImportTasks(tasksToImport);
      soundEngine.playPentatonicChime(4);
      setImportMsg(`Đã nhập thành công ${tasksToImport.length} công việc từ tệp.`);
      await notify.success(`Đã nhập thành công ${tasksToImport.length} công việc từ tệp!`);
    } catch (err: any) {
      await notify.error(err.message || 'Tệp không hợp lệ', 'Lỗi Nhập Dữ Liệu');
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setPwLoading(true);
    const res = await authService.changePassword(oldPassword, newPassword);
    setPwLoading(false);

    if (res.success) {
      soundEngine.playPentatonicChime(4);
      setPwMsg({ type: 'success', text: res.message || 'Đổi mật khẩu thành công!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPwMsg({ type: 'error', text: res.message || 'Đổi mật khẩu thất bại.' });
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] shadow-2xl flex flex-col overflow-hidden border border-[#EEF2F8] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 shrink-0 flex items-center justify-between border-b border-[#EEF2F8] bg-[#FAFBFD]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center shadow-md">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1E2433]">Cài Đặt Hệ Thống</h3>
              <p className="text-[10px] text-[#8F9CAE]">Trung tâm điều khiển & Tùy biến CBP Atelier OS</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main Layout: Left Tabs + Right Content */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          
          {/* Tab Sidebar Navigation */}
          <div className="w-full sm:w-48 bg-[#FAFBFD] border-b sm:border-b-0 sm:border-r border-[#EEF2F8] p-2.5 space-y-1 shrink-0 flex sm:flex-col overflow-x-auto sm:overflow-visible">
            <button
              onClick={() => {
                setActiveTab('theme');
                soundEngine.playSoftClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'theme'
                  ? 'bg-white text-[#2563EB] shadow-xs border border-[#EEF2F8]'
                  : 'text-[#64748B] hover:bg-slate-100/60 hover:text-[#1E2433]'
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0 text-[#2563EB]" />
              <span>Giao Diện & Theme</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('wallpaper');
                soundEngine.playSoftClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'wallpaper'
                  ? 'bg-white text-[#2563EB] shadow-xs border border-[#EEF2F8]'
                  : 'text-[#64748B] hover:bg-slate-100/60 hover:text-[#1E2433]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0 text-[#7C3AED]" />
              <span>Hình Nền Không Gian</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('email');
                soundEngine.playSoftClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'email'
                  ? 'bg-white text-[#2563EB] shadow-xs border border-[#EEF2F8]'
                  : 'text-[#64748B] hover:bg-slate-100/60 hover:text-[#1E2433]'
              }`}
            >
              <Mail className="w-3.5 h-3.5 shrink-0 text-[#0284C7]" />
              <span>Thư Bưu Thiếp</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('audio');
                soundEngine.playSoftClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'audio'
                  ? 'bg-white text-[#2563EB] shadow-xs border border-[#EEF2F8]'
                  : 'text-[#64748B] hover:bg-slate-100/60 hover:text-[#1E2433]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span>Âm Thanh & Hiệu Ứng</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('calendar');
                soundEngine.playSoftClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'calendar'
                  ? 'bg-white text-[#2563EB] shadow-xs border border-[#EEF2F8]'
                  : 'text-[#64748B] hover:bg-slate-100/60 hover:text-[#1E2433]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Lịch Biểu & Giờ</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('data');
                soundEngine.playSoftClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'data'
                  ? 'bg-white text-[#2563EB] shadow-xs border border-[#EEF2F8]'
                  : 'text-[#64748B] hover:bg-slate-100/60 hover:text-[#1E2433]'
              }`}
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>Sao Lưu & Dữ Liệu</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('help');
                soundEngine.playSoftClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'help'
                  ? 'bg-white text-[#2563EB] shadow-xs border border-[#EEF2F8]'
                  : 'text-[#64748B] hover:bg-slate-100/60 hover:text-[#1E2433]'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0 text-[#10B981]" />
              <span>Phím Tắt & Trợ Giúp</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('account');
                soundEngine.playSoftClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'account'
                  ? 'bg-white text-[#2563EB] shadow-xs border border-[#EEF2F8]'
                  : 'text-[#64748B] hover:bg-slate-100/60 hover:text-[#1E2433]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Tài Khoản & Bảo Mật</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-5 overflow-y-auto custom-main-scroll space-y-4">

            {/* TAB: GIAO DIỆN & THEME */}
            {activeTab === 'theme' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-bold text-[#1E2433]">Bảng Màu & Giao Diện Hệ Thống (Theme)</h4>
                  <p className="text-[11px] text-[#8F9CAE]">
                    Tùy chọn tông màu chủ đạo, phân tách màu giữa Sidebar và Canvas chính giúp bảo vệ mắt
                  </p>
                </div>

                {/* Theme Options Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {THEME_OPTIONS.map((opt) => {
                    const isSelected = (settings.theme || 'slate') === opt.id;
                    const swatches =
                      opt.id === 'custom' && settings.customTheme
                        ? [
                            settings.customTheme.sidebarBg || DEFAULT_CUSTOM_THEME.sidebarBg,
                            settings.customTheme.canvasBg || DEFAULT_CUSTOM_THEME.canvasBg,
                            settings.customTheme.accentColor || DEFAULT_CUSTOM_THEME.accentColor,
                          ]
                        : opt.swatches;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          onUpdateSettings({ ...settings, theme: opt.id });
                          soundEngine.playPentatonicChime(4);
                        }}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden group flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#2563EB] bg-[#EFF6FF]/40 shadow-xs ring-1 ring-blue-300'
                            : 'border-[#EEF2F8] bg-white hover:border-slate-300 hover:bg-[#FAFBFD]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center rounded-lg overflow-hidden border border-black/10 shadow-2xs">
                                <span className="w-3.5 h-3.5 block" style={{ backgroundColor: swatches[0] }} title="Màu Sidebar" />
                                <span className="w-4 h-3.5 block" style={{ backgroundColor: swatches[1] }} title="Màu Canvas" />
                                <span className="w-3.5 h-3.5 block" style={{ backgroundColor: swatches[2] }} title="Màu Nhấn" />
                              </div>
                              <span className="text-xs font-black text-[#1E2433]">{opt.name}</span>
                            </div>

                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>

                          <p className="text-[10px] text-[#64748B] leading-relaxed">
                            {opt.subtitle}
                          </p>
                        </div>

                        {/* Interactive miniature preview bar */}
                        <div className="mt-3 pt-2 border-t border-black/5 flex items-center gap-1.5 text-[8px] font-semibold">
                          <div
                            className="w-12 h-5 rounded flex items-center justify-center font-bold border"
                            style={{
                              backgroundColor: swatches[0],
                              borderColor: swatches[0] === '#0E131F' || swatches[0] === '#1E1B4B' ? '#2A3448' : '#CBD5E1',
                              color: swatches[0] === '#0E131F' || swatches[0] === '#1E1B4B' ? '#CBD5E1' : '#475569',
                            }}
                          >
                            Sidebar
                          </div>
                          <div
                            className="flex-1 h-5 rounded flex items-center justify-between px-2 border"
                            style={{
                              backgroundColor: swatches[1],
                              borderColor: '#E2E8F0',
                              color: '#64748B',
                            }}
                          >
                            <span>Canvas</span>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: swatches[2] }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Color Editor when 'custom' is active */}
                {settings.theme === 'custom' && (
                  <div className="p-4 rounded-2xl bg-[#F8FAFD] border-2 border-dashed border-[#2563EB]/40 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-black text-xs">
                          🎨
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-[#1E2433]">Studio Tự Phối Màu (Custom Palette)</h5>
                          <p className="text-[10px] text-[#64748B]">Bấm vào ô màu để chọn hoặc chọn nhanh các mẫu gợi ý</p>
                        </div>
                      </div>

                      {/* Reset button */}
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateSettings({
                            ...settings,
                            customTheme: DEFAULT_CUSTOM_THEME,
                          });
                          soundEngine.playSoftClick();
                        }}
                        className="text-[10px] font-bold text-[#2563EB] hover:underline"
                      >
                        Đặt lại mặc định
                      </button>
                    </div>

                    {/* Quick Presets for Custom Theme */}
                    <div>
                      <span className="text-[10px] font-bold text-[#475569] block mb-1.5">
                        Bộ phối màu gợi ý nhanh:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { name: 'Cyber Violet', sidebar: '#2A1B4E', canvas: '#FAF5FF', accent: '#9333EA', dark: true },
                          { name: 'Coffee Mocha', sidebar: '#3D2619', canvas: '#FDFBF7', accent: '#B45309', dark: true },
                          { name: 'Pastel Dream', sidebar: '#F3E8FF', canvas: '#FAF5FF', accent: '#7C3AED', dark: false },
                          { name: 'Emerald Luxe', sidebar: '#064E3B', canvas: '#F0FDF4', accent: '#059669', dark: true },
                        ].map((combo) => (
                          <button
                            key={combo.name}
                            type="button"
                            onClick={() => {
                              onUpdateSettings({
                                ...settings,
                                customTheme: {
                                  sidebarBg: combo.sidebar,
                                  canvasBg: combo.canvas,
                                  accentColor: combo.accent,
                                  isDark: combo.dark,
                                },
                              });
                              soundEngine.playPentatonicChime(4);
                            }}
                            className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#2563EB] transition-all text-left flex items-center gap-2 group shadow-2xs"
                          >
                            <div className="flex rounded overflow-hidden border border-black/10 shrink-0">
                              <span className="w-2.5 h-5 block" style={{ backgroundColor: combo.sidebar }} />
                              <span className="w-2.5 h-5 block" style={{ backgroundColor: combo.canvas }} />
                              <span className="w-2.5 h-5 block" style={{ backgroundColor: combo.accent }} />
                            </div>
                            <span className="text-[10px] font-bold text-[#1E2433] group-hover:text-[#2563EB] truncate">
                              {combo.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3 Main Color Pickers */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {/* 1. Sidebar Background Color */}
                      <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
                        <label className="text-[11px] font-bold text-[#1E2433] block">
                          Màu Nền Sidebar:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={settings.customTheme?.sidebarBg || DEFAULT_CUSTOM_THEME.sidebarBg}
                            onChange={(e) => {
                              onUpdateSettings({
                                ...settings,
                                customTheme: {
                                  ...(settings.customTheme || DEFAULT_CUSTOM_THEME),
                                  sidebarBg: e.target.value,
                                },
                              });
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                          />
                          <span className="text-xs font-mono font-bold text-[#475569] uppercase">
                            {settings.customTheme?.sidebarBg || DEFAULT_CUSTOM_THEME.sidebarBg}
                          </span>
                        </div>
                        {/* Swatches */}
                        <div className="flex items-center gap-1.5 pt-1">
                          {['#1E1B4B', '#0F172A', '#064E3B', '#382218', '#F3E8FF', '#EDE4D5'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                onUpdateSettings({
                                  ...settings,
                                  customTheme: {
                                    ...(settings.customTheme || DEFAULT_CUSTOM_THEME),
                                    sidebarBg: c,
                                  },
                                });
                              }}
                              className="w-4 h-4 rounded-full border border-black/10 hover:scale-125 transition-transform"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 2. Canvas Background Color */}
                      <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
                        <label className="text-[11px] font-bold text-[#1E2433] block">
                          Màu Nền Workspace:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={settings.customTheme?.canvasBg || DEFAULT_CUSTOM_THEME.canvasBg}
                            onChange={(e) => {
                              onUpdateSettings({
                                ...settings,
                                customTheme: {
                                  ...(settings.customTheme || DEFAULT_CUSTOM_THEME),
                                  canvasBg: e.target.value,
                                },
                              });
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                          />
                          <span className="text-xs font-mono font-bold text-[#475569] uppercase">
                            {settings.customTheme?.canvasBg || DEFAULT_CUSTOM_THEME.canvasBg}
                          </span>
                        </div>
                        {/* Swatches */}
                        <div className="flex items-center gap-1.5 pt-1">
                          {['#F5F3FF', '#F0F9FF', '#FAF7F2', '#F8FAFC', '#141A24', '#0F172A'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                onUpdateSettings({
                                  ...settings,
                                  customTheme: {
                                    ...(settings.customTheme || DEFAULT_CUSTOM_THEME),
                                    canvasBg: c,
                                  },
                                });
                              }}
                              className="w-4 h-4 rounded-full border border-black/10 hover:scale-125 transition-transform"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 3. Accent / Brand Color */}
                      <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
                        <label className="text-[11px] font-bold text-[#1E2433] block">
                          Màu Nút Bấm (Accent):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={settings.customTheme?.accentColor || DEFAULT_CUSTOM_THEME.accentColor}
                            onChange={(e) => {
                              onUpdateSettings({
                                ...settings,
                                customTheme: {
                                  ...(settings.customTheme || DEFAULT_CUSTOM_THEME),
                                  accentColor: e.target.value,
                                },
                              });
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                          />
                          <span className="text-xs font-mono font-bold text-[#475569] uppercase">
                            {settings.customTheme?.accentColor || DEFAULT_CUSTOM_THEME.accentColor}
                          </span>
                        </div>
                        {/* Swatches */}
                        <div className="flex items-center gap-1.5 pt-1">
                          {['#7C3AED', '#2563EB', '#10B981', '#E11D48', '#F59E0B', '#EC4899'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                onUpdateSettings({
                                  ...settings,
                                  customTheme: {
                                    ...(settings.customTheme || DEFAULT_CUSTOM_THEME),
                                    accentColor: c,
                                  },
                                });
                              }}
                              className="w-4 h-4 rounded-full border border-black/10 hover:scale-125 transition-transform"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Dark / Light Sidebar Text Contrast Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div>
                        <span className="text-xs font-bold text-[#1E2433] block">Chữ Sidebar Màu Sáng (Dark Text Contrast)</span>
                        <span className="text-[10px] text-[#8F9CAE]">Bật nếu bạn dùng nền Sidebar tối; tắt nếu bạn dùng nền sáng pastel</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.customTheme?.isDark ?? true}
                          onChange={(e) => {
                            onUpdateSettings({
                              ...settings,
                              customTheme: {
                                ...(settings.customTheme || DEFAULT_CUSTOM_THEME),
                                isDark: e.target.checked,
                              },
                            });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]" />
                      </label>
                    </div>
                  </div>
                )}

                {/* Sidebar Compact Mode Switch */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#1E2433]">Chế Độ Thu Gọn Thanh Bên (Compact Sidebar)</p>
                      <p className="text-[10px] text-[#8F9CAE]">
                        Tự động thu nhỏ thanh bên thành icon (hoặc bấm biểu tượng 3 sọc trên đầu sidebar)
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.sidebarCollapsed)}
                        onChange={(e) => {
                          onUpdateSettings({ ...settings, sidebarCollapsed: e.target.checked });
                          soundEngine.playSoftClick();
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]" />
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* TAB 1: ÂM THANH & HIỆU ỨNG */}
            {activeTab === 'audio' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-bold text-[#1E2433]">Tùy Biến Âm Thanh & Phản Hồi Tương Tác</h4>
                  <p className="text-[11px] text-[#8F9CAE]">Điều chỉnh âm lượng và hiệu ứng chúc mừng khi hoàn thành công việc</p>
                </div>

                {/* Sound master toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center">
                      {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1E2433]">Bật Hiệu Ứng Âm Thanh</p>
                      <p className="text-[10px] text-[#8F9CAE]">Chuông ngũ âm khi xong việc & âm click nút</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => {
                        const updated = { ...settings, soundEnabled: e.target.checked };
                        onUpdateSettings(updated);
                        soundEngine.setMuted(!e.target.checked);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]" />
                  </label>
                </div>

                {/* Volume slider */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#475569]">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#3B82F6]" />
                      <span>Âm Lượng Hệ Thống</span>
                    </span>
                    <span className="text-[#2563EB]">{settings.soundVolume}%</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      disabled={!settings.soundEnabled}
                      value={settings.soundVolume}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const updated = { ...settings, soundVolume: val };
                        onUpdateSettings(updated);
                        soundEngine.setMasterVolume(val);
                      }}
                      className="w-full accent-[#2563EB] disabled:opacity-40"
                    />
                    <button
                      onClick={handleTestSound}
                      disabled={!settings.soundEnabled}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] text-[#2563EB] hover:bg-blue-50 text-[11px] font-bold shrink-0 transition-colors shadow-2xs disabled:opacity-40"
                    >
                      Thử âm
                    </button>
                  </div>
                </div>

                {/* Confetti celebration toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <PartyPopper className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1E2433]">Hiệu Ứng Pháo Hoa (Confetti)</p>
                      <p className="text-[10px] text-[#8F9CAE]">Bắn pháo hoa rực rỡ khi ấn "Chốt xong" một nhiệm vụ</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.confettiEnabled}
                      onChange={(e) => {
                        const updated = { ...settings, confettiEnabled: e.target.checked };
                        onUpdateSettings(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]" />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 2: LỊCH BIỂU & THỜI GIAN */}
            {activeTab === 'calendar' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-bold text-[#1E2433]">Tùy Chỉnh Lưới Lịch Biểu & Định Dạng</h4>
                  <p className="text-[11px] text-[#8F9CAE]">Cá nhân hóa cách hiển thị ngày giờ và các tuần làm việc</p>
                </div>

                {/* Time format selector */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#1E2433]">Định Dạng Hiển Thị Giờ</p>
                      <p className="text-[10px] text-[#8F9CAE]">Chọn kiểu 24 giờ (17:30) hoặc 12 giờ (05:30 PM)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => onUpdateSettings({ ...settings, timeFormat: '24h' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        settings.timeFormat === '24h'
                          ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                          : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50'
                      }`}
                    >
                      24 Giờ (VD: 17:35)
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ ...settings, timeFormat: '12h' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        settings.timeFormat === '12h'
                          ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                          : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50'
                      }`}
                    >
                      12 Giờ (VD: 05:35 PM)
                    </button>
                  </div>
                </div>

                {/* Week starts on */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8] space-y-2">
                  <div>
                    <p className="text-xs font-bold text-[#1E2433]">Ngày Bắt Đầu Tuần</p>
                    <p className="text-[10px] text-[#8F9CAE]">Thứ tự ngày đầu tuần trên lưới thời gian biểu</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => onUpdateSettings({ ...settings, weekStartsOn: 1 })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        settings.weekStartsOn === 1
                          ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                          : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50'
                      }`}
                    >
                      Thứ Hai (Mặc định VN)
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ ...settings, weekStartsOn: 0 })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        settings.weekStartsOn === 0
                          ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                          : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50'
                      }`}
                    >
                      Chủ Nhật (US Standard)
                    </button>
                  </div>
                </div>

                {/* Auto scroll to current time */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-[#4F46E5] flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1E2433]">Tự Động Canh Đến Giờ Hiện Tại</p>
                      <p className="text-[10px] text-[#8F9CAE]">Lưới lịch biểu tự động cuộn đến thanh giờ thực tế</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoScrollToNow}
                      onChange={(e) => onUpdateSettings({ ...settings, autoScrollToNow: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]" />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 3: SAO LƯU & DỮ LIỆU */}
            {activeTab === 'data' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-bold text-[#1E2433]">Quản Lý Dữ Liệu & Sao Lưu An Toàn</h4>
                  <p className="text-[11px] text-[#8F9CAE]">Xuất tệp dự phòng hoặc khôi phục công việc bất cứ lúc nào</p>
                </div>

                {importMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{importMsg}</span>
                  </div>
                )}

                {/* Export Card */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1E2433]">Xuất Bản Sao Lưu (JSON)</p>
                      <p className="text-[10px] text-[#8F9CAE]">Tải toàn bộ {tasks.length} công việc về máy tính</p>
                    </div>
                  </div>

                  <button
                    onClick={handleExportData}
                    className="px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1E2433]">Nhập Dữ Liệu Từ File</p>
                      <p className="text-[10px] text-[#8F9CAE]">Khôi phục dữ liệu từ tệp sao lưu .json đã lưu</p>
                    </div>
                  </div>

                  <label className="px-3.5 py-1.5 rounded-xl bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#1E2433] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer">
                    {importLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{importLoading ? 'Đang nạp...' : 'Chọn file'}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Reset Seed Card */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-rose-900">Khôi Phục Dữ Liệu Mẫu Ban Đầu</p>
                      <p className="text-[10px] text-rose-600">Đặt lại danh sách công việc và lịch biểu mẫu chuẩn ban đầu</p>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      const confirmed = await notify.confirm(
                        'Bạn có chắc chắn muốn đặt lại bộ dữ liệu mẫu ban đầu? Các công việc tự tạo có thể bị thay thế.',
                        { title: 'Khôi Phục Dữ Liệu Mẫu', confirmText: 'Đặt lại', type: 'warning' }
                      );
                      if (confirmed) {
                        await onResetSeedData();
                        soundEngine.playPentatonicChime(4);
                        await notify.success('Đã khôi phục bộ dữ liệu chuẩn khởi tạo thành công!');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Reset mẫu
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: TÀI KHOẢN & BẢO MẬT */}
            {activeTab === 'account' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-bold text-[#1E2433]">Thông Tin Tài Khoản & Bảo Mật Mật Khẩu</h4>
                  <p className="text-[11px] text-[#8F9CAE]">Quản lý phiên đăng nhập và bảo mật tài khoản cá nhân</p>
                </div>

                {/* Cloud Connection Status */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Trạng Thái Lưu Trữ Đám Mây</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Đã Kết Nối Đám Mây ☁️</span>
                    </span>
                  </div>

                  {authUser ? (
                    <div className="pt-2 border-t border-[#E2E8F0] text-xs space-y-1">
                      <p className="text-[#1E2433] font-bold">Tài khoản: <span className="text-[#2563EB]">{authUser.name}</span></p>
                      <p className="text-[#64748B]">Email: {authUser.email}</p>
                      <p className="text-[11px] text-emerald-600 font-semibold">● Phiên đăng nhập được bảo mật và mã hóa an toàn</p>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                      <span className="text-xs text-[#64748B]">Chưa đăng nhập (Khách)</span>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenAuth?.();
                        }}
                        className="px-3 py-1 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8]"
                      >
                        Đăng nhập ngay
                      </button>
                    </div>
                  )}
                </div>

                {/* Change Password Form (only when logged in) */}
                {authUser ? (
                  <form onSubmit={handleChangePassword} className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8] space-y-3">
                    <p className="text-xs font-bold text-[#1E2433] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Đổi Mật Khẩu Tài Khoản</span>
                    </p>

                    {pwMsg && (
                      <div
                        className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                          pwMsg.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {pwMsg.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        )}
                        <span>{pwMsg.text}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#64748B]">Mật khẩu hiện tại</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại"
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#1E2433] focus:border-[#2563EB] outline-none bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#64748B]">Mật khẩu mới</label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Tối thiểu 6 ký tự"
                          className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#1E2433] focus:border-[#2563EB] outline-none bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#64748B]">Xác nhận lại</label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới"
                          className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#1E2433] focus:border-[#2563EB] outline-none bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="w-full py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>Lưu Mật Khẩu Mới</span>
                    </button>
                  </form>
                ) : (
                  <p className="text-[11px] text-[#64748B] italic">
                    💡 Hãy đăng nhập tài khoản của bạn để sử dụng tính năng bảo mật và đổi mật khẩu trên đám mây.
                  </p>
                )}
              </div>
            )}

            {/* TAB: HÌNH NỀN KHÔNG GIAN (WALLPAPER) */}
            {activeTab === 'wallpaper' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#1E2433]">Hình Nền Không Gian (Ambient Canvas)</h4>
                    <p className="text-[11px] text-[#8F9CAE]">
                      Tạo cảm hứng làm việc với ảnh nền phong cảnh, trừu tượng hoặc ảnh tùy chỉnh
                    </p>
                  </div>
                  {onOpenBackgroundModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenBackgroundModal();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Trình Tải & Cắt Ảnh</span>
                    </button>
                  )}
                </div>

                {/* Live Toggle */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#1E2433] block">Kích hoạt hình nền ứng dụng</span>
                    <span className="text-[11px] text-[#64748B]">Hiển thị ảnh nền phía sau bảng việc & thời khóa biểu</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userProfile?.applyAppBackground ?? false}
                      onChange={(e) => {
                        onUpdateBackground?.({
                          background: userProfile?.background || PRESET_BACKGROUNDS[0].url,
                          applyAppBackground: e.target.checked,
                          backgroundBlur: userProfile?.backgroundBlur ?? 10,
                          backgroundOpacity: userProfile?.backgroundOpacity ?? 0.65,
                        });
                        soundEngine.playSoftClick();
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]"></div>
                  </label>
                </div>

                {/* Preset Gallery */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#1E2433] block">Bộ sưu tập hình nền tuyển chọn</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {PRESET_BACKGROUNDS.map((item) => {
                      const isSelected = userProfile?.background === item.url;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            onUpdateBackground?.({
                              background: item.url,
                              applyAppBackground: true,
                              backgroundBlur: userProfile?.backgroundBlur ?? 10,
                              backgroundOpacity: userProfile?.backgroundOpacity ?? 0.65,
                            });
                            soundEngine.playPentatonicChime(4);
                          }}
                          className={`relative h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${
                            isSelected
                              ? 'border-[#2563EB] ring-2 ring-blue-400 shadow-md'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <img
                            src={item.url}
                            alt={item.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-2">
                            <span className="text-white text-[10px] font-bold truncate drop-shadow-xs">
                              {item.label}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Blur & Opacity Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8]">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B]">
                      <span>Độ mờ hậu cảnh (Blur)</span>
                      <span>{userProfile?.backgroundBlur ?? 10}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={userProfile?.backgroundBlur ?? 10}
                      onChange={(e) => {
                        onUpdateBackground?.({
                          background: userProfile?.background || PRESET_BACKGROUNDS[0].url,
                          applyAppBackground: userProfile?.applyAppBackground ?? true,
                          backgroundBlur: Number(e.target.value),
                          backgroundOpacity: userProfile?.backgroundOpacity ?? 0.65,
                        });
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B]">
                      <span>Độ đậm hình nền (Opacity)</span>
                      <span>{Math.round((userProfile?.backgroundOpacity ?? 0.65) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={userProfile?.backgroundOpacity ?? 0.65}
                      onChange={(e) => {
                        onUpdateBackground?.({
                          background: userProfile?.background || PRESET_BACKGROUNDS[0].url,
                          applyAppBackground: userProfile?.applyAppBackground ?? true,
                          backgroundBlur: userProfile?.backgroundBlur ?? 10,
                          backgroundOpacity: Number(e.target.value),
                        });
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                    />
                  </div>
                </div>

                {/* Reset background */}
                {userProfile?.applyAppBackground && (
                  <button
                    onClick={() => {
                      onUpdateBackground?.({
                        background: '',
                        applyAppBackground: false,
                      });
                      soundEngine.playSoftClick();
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Gỡ hình nền (trở về màu theme mặc định)
                  </button>
                )}
              </div>
            )}

            {/* TAB: THƯ BƯU THIẾP & BÁO CÁO (EMAIL) */}
            {activeTab === 'email' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-bold text-[#1E2433]">Thư Bưu Thiếp & Báo Cáo Năng Suất (Postcard)</h4>
                  <p className="text-[11px] text-[#8F9CAE]">
                    Xuất bản báo cáo thành quả công việc trong tuần dưới dạng tấm bưu thiếp nghệ thuật gửi về hộp thư cá nhân
                  </p>
                </div>

                {/* Feature 1: Automated Schedule Reminder & Google Calendar */}
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-blue-50 via-slate-50 to-indigo-50 border border-blue-200 flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-md text-[#2563EB] flex items-center justify-center">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-extrabold text-[#1E2433]">Tự Động Nhắc Lịch & Đồng Bộ Google Calendar</h5>
                    <p className="text-xs text-[#64748B] max-w-md mt-1">
                      Tự động gửi email điểm danh ca việc mỗi sáng 07:00, cảnh báo trước 30 phút, và kết nối với Google Calendar qua chuẩn file .ics.
                    </p>
                  </div>

                  {onOpenScheduleReminder && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenScheduleReminder();
                      }}
                      className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Cấu Hình Tự Động Nhắc Lịch & Calendar</span>
                    </button>
                  )}
                </div>

                {/* Feature 2: Postcard */}
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-sky-50 via-indigo-50 to-purple-50 border border-sky-100 flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-md text-sky-600 flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-extrabold text-[#1E2433]">Bưu Thiếp Tổng Kết Thành Quả</h5>
                    <p className="text-xs text-[#64748B] max-w-md mt-1">
                      Tổng hợp số giờ tập trung, tỷ lệ hoàn thành checklist và danh sách các mục tiêu trọng tâm đã chinh phục.
                    </p>
                  </div>

                  {onOpenEmailModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenEmailModal();
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-sky-500/20 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Mở Trình Soạn & Gửi Bưu Thiếp</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PHÍM TẮT & TRỢ GIÚP */}
            {activeTab === 'help' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-bold text-[#1E2433]">Phím Tắt & Hướng Dẫn Nhanh</h4>
                  <p className="text-[11px] text-[#8F9CAE]">
                    Tăng tốc thao tác làm việc chuyên nghiệp với CBP Atelier OS
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8] space-y-2.5">
                  <p className="text-xs font-bold text-[#1E2433] flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Tổ hợp phím tắt nhanh</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#EEF2F8]">
                      <span className="text-[#64748B]">Bàn Làm Việc & Thời Khóa Biểu</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-mono font-bold border border-slate-300">Alt + 1</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#EEF2F8]">
                      <span className="text-[#64748B]">Nhật Ký & Mục Tiêu (Journal)</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-mono font-bold border border-slate-300">Alt + 2</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#EEF2F8]">
                      <span className="text-[#64748B]">Đồng Hồ Tập Trung Pomodoro</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-mono font-bold border border-slate-300">Alt + P</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#EEF2F8]">
                      <span className="text-[#64748B]">Sổ Ghi Chú Nhanh (Scratchpad)</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-mono font-bold border border-slate-300">Alt + N</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#EEF2F8]">
                      <span className="text-[#64748B]">Theo Dõi Thói Quen Hàng Ngày</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-mono font-bold border border-slate-300">Alt + H</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#EEF2F8]">
                      <span className="text-[#64748B]">Trợ Lý AI Thông Minh</span>
                      <span className="text-[10px] text-indigo-600 font-bold">Nút góc phải màn hình</span>
                    </div>
                  </div>
                </div>

                {/* Reset Data section */}
                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Khôi phục dữ liệu mẫu ban đầu</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Khôi phục lại toàn bộ thời khóa biểu, thẻ kanban và danh mục mẫu thiết kế sẵn của hệ thống.
                  </p>
                  <button
                    onClick={async () => {
                      const confirmed = await notify.confirm('Bạn có chắc chắn muốn đặt lại toàn bộ dữ liệu mẫu ban đầu?', {
                        title: 'Đặt Lại Dữ Liệu',
                        confirmText: 'Đặt lại ngay',
                        type: 'warning',
                      });
                      if (confirmed) {
                        await onResetSeedData();
                        soundEngine.playPentatonicChime(4);
                        await notify.success('Đã khôi phục dữ liệu mẫu thành công!');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Đặt Lại Dữ Liệu Mẫu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 shrink-0 flex items-center justify-between border-t border-[#EEF2F8] bg-white">
          <span className="text-[10px] text-[#8F9CAE]">
            CBP Atelier OS v3.0 • Cài đặt tự động lưu
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-xs"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
