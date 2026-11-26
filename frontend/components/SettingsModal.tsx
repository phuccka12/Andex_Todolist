'use client';

import React, { useState } from 'react';
import {
  X,
  Settings,
  Volume2,
  VolumeX,
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
  DEFAULT_CUSTOM_THEME,
  VOCAB_VOICE_OPTIONS,
} from '../lib/settingsStorage';
import { speakEnglishWord } from '../lib/vocabApi';
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
        app: 'Gencoore',
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

  const navItems: Array<{
    id: 'theme' | 'wallpaper' | 'email' | 'audio' | 'calendar' | 'data' | 'help' | 'account';
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'theme', label: 'Giao Diện & Theme', icon: Palette },
    { id: 'wallpaper', label: 'Hình Nền Không Gian', icon: ImageIcon },
    { id: 'email', label: 'Thư Bưu Thiếp', icon: Mail },
    { id: 'audio', label: 'Âm Thanh & Hiệu Ứng', icon: Volume2 },
    { id: 'calendar', label: 'Lịch Biểu & Giờ', icon: Calendar },
    { id: 'data', label: 'Sao Lưu & Dữ Liệu', icon: Database },
    { id: 'help', label: 'Phím Tắt & Trợ Giúp', icon: HelpCircle },
    { id: 'account', label: 'Tài Khoản & Bảo Mật', icon: ShieldCheck },
  ];

  return (
    <div className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-[#FFFDF7] rounded-3xl max-w-2xl w-full max-h-[88vh] shadow-[6px_6px_0px_#0F172A] flex flex-col overflow-hidden border-2 border-[#0F172A] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 shrink-0 flex items-center justify-between border-b-2 border-[#0F172A] bg-[#FFF1F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E11D48] border-2 border-[#0F172A] text-white flex items-center justify-center shadow-[2px_2px_0px_#0F172A]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#0F172A]">Cài Đặt Hệ Thống</h3>
              <p className="text-[10px] text-slate-600 font-bold">Trung tâm điều khiển & Tùy biến Genncore</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FEF9C3] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main Layout: Left Tabs + Right Content */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          
          {/* Cartoon Tab Sidebar Navigation */}
          <div className="w-full sm:w-52 bg-[#FFF1F2]/65 border-b-2 sm:border-b-0 sm:border-r-2 border-[#0F172A] p-2.5 gap-1.5 shrink-0 flex sm:flex-col overflow-x-auto sm:overflow-visible">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    soundEngine.playSoftClick();
                  }}
                  className={`w-full shrink-0 sm:shrink flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer whitespace-nowrap sm:whitespace-normal ${
                    isActive
                      ? 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black'
                      : 'text-[#0F172A] hover:bg-[#FFE4E6]/70 font-bold border-2 border-transparent'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#E11D48]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-5 overflow-y-auto custom-main-scroll space-y-4">

            {/* TAB: GIAO DIỆN & THEME */}
            {activeTab === 'theme' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-black text-[#0F172A]">Bảng Màu & Giao Diện Hệ Thống (Theme)</h4>
                  <p className="text-[11px] font-semibold text-slate-600">
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
                        className={`p-3.5 rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] cursor-pointer transition-all relative overflow-hidden group flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#FFF1F2] ring-2 ring-[#E11D48]'
                            : 'bg-white hover:bg-[#FEF9C3]/45'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center rounded-lg overflow-hidden border-2 border-[#0F172A]">
                                <span className="w-3.5 h-3.5 block" style={{ backgroundColor: swatches[0] }} title="Màu Sidebar" />
                                <span className="w-4 h-3.5 block" style={{ backgroundColor: swatches[1] }} title="Màu Canvas" />
                                <span className="w-3.5 h-3.5 block" style={{ backgroundColor: swatches[2] }} title="Màu Nhấn" />
                              </div>
                              <span className="text-xs font-black text-[#0F172A]">{opt.name}</span>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#E11D48] border-2 border-[#0F172A] text-white flex items-center justify-center">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>

                          <p className="text-[10px] font-semibold text-slate-600 leading-relaxed">
                            {opt.subtitle}
                          </p>
                        </div>

                        {/* Interactive miniature preview bar */}
                        <div className="mt-3 pt-2 border-t-2 border-[#0F172A]/10 flex items-center gap-1.5 text-[8px] font-bold">
                          <div
                            className="w-12 h-5 rounded-md flex items-center justify-center font-black border border-[#0F172A]"
                            style={{
                              backgroundColor: swatches[0],
                              color: swatches[0] === '#0E131F' || swatches[0] === '#1E1B4B' ? '#F8FAFC' : '#0F172A',
                            }}
                          >
                            Sidebar
                          </div>
                          <div
                            className="flex-1 h-5 rounded-md flex items-center justify-between px-2 border border-[#0F172A]"
                            style={{
                              backgroundColor: swatches[1],
                              color: '#334155',
                            }}
                          >
                            <span>Canvas</span>
                            <span className="w-2.5 h-2.5 rounded-full border border-[#0F172A]" style={{ backgroundColor: swatches[2] }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Color Editor when 'custom' is active */}
                {settings.theme === 'custom' && (
                  <div className="p-4 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-[#E11D48] border-2 border-[#0F172A] text-white flex items-center justify-center font-black text-xs shadow-[2px_2px_0px_#0F172A]">
                          🎨
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-[#0F172A]">Studio Tự Phối Màu (Custom Palette)</h5>
                          <p className="text-[10px] font-bold text-slate-700">Bấm vào ô màu để chọn hoặc chọn nhanh các mẫu gợi ý</p>
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
                        className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#FFF1F2] text-[#E11D48] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[10px] font-black cursor-pointer"
                      >
                        Đặt lại mặc định
                      </button>
                    </div>

                    {/* Quick Presets for Custom Theme */}
                    <div>
                      <span className="text-[10px] font-black text-[#0F172A] block mb-1.5">
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
                            className="p-2 rounded-xl bg-white hover:bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all text-left flex items-center gap-2 group cursor-pointer"
                          >
                            <div className="flex rounded overflow-hidden border border-[#0F172A] shrink-0">
                              <span className="w-2.5 h-5 block" style={{ backgroundColor: combo.sidebar }} />
                              <span className="w-2.5 h-5 block" style={{ backgroundColor: combo.canvas }} />
                              <span className="w-2.5 h-5 block" style={{ backgroundColor: combo.accent }} />
                            </div>
                            <span className="text-[10px] font-black text-[#0F172A] group-hover:text-[#E11D48] truncate">
                              {combo.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3 Main Color Pickers */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {/* 1. Sidebar Background Color */}
                      <div className="p-3 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] space-y-2">
                        <label className="text-[11px] font-black text-[#0F172A] block">
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
                            className="w-8 h-8 rounded-xl border-2 border-[#0F172A] cursor-pointer p-0.5 bg-white"
                          />
                          <span className="text-xs font-mono font-black text-[#0F172A] uppercase">
                            {settings.customTheme?.sidebarBg || DEFAULT_CUSTOM_THEME.sidebarBg}
                          </span>
                        </div>
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
                              className="w-4 h-4 rounded-full border border-[#0F172A] hover:scale-125 transition-transform cursor-pointer"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 2. Canvas Background Color */}
                      <div className="p-3 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] space-y-2">
                        <label className="text-[11px] font-black text-[#0F172A] block">
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
                            className="w-8 h-8 rounded-xl border-2 border-[#0F172A] cursor-pointer p-0.5 bg-white"
                          />
                          <span className="text-xs font-mono font-black text-[#0F172A] uppercase">
                            {settings.customTheme?.canvasBg || DEFAULT_CUSTOM_THEME.canvasBg}
                          </span>
                        </div>
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
                              className="w-4 h-4 rounded-full border border-[#0F172A] hover:scale-125 transition-transform cursor-pointer"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 3. Accent / Brand Color */}
                      <div className="p-3 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] space-y-2">
                        <label className="text-[11px] font-black text-[#0F172A] block">
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
                            className="w-8 h-8 rounded-xl border-2 border-[#0F172A] cursor-pointer p-0.5 bg-white"
                          />
                          <span className="text-xs font-mono font-black text-[#0F172A] uppercase">
                            {settings.customTheme?.accentColor || DEFAULT_CUSTOM_THEME.accentColor}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          {['#E11D48', '#7C3AED', '#2563EB', '#10B981', '#F59E0B', '#EC4899'].map((c) => (
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
                              className="w-4 h-4 rounded-full border border-[#0F172A] hover:scale-125 transition-transform cursor-pointer"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Dark / Light Sidebar Text Contrast Toggle */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t-2 border-[#0F172A]/20">
                      <div>
                        <span className="text-xs font-black text-[#0F172A] block">Chữ Sidebar Màu Sáng (Dark Text Contrast)</span>
                        <span className="text-[10px] font-bold text-slate-700">Bật nếu bạn dùng nền Sidebar tối; tắt nếu bạn dùng nền sáng pastel</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
                        <div className="w-11 h-6 bg-white border-2 border-[#0F172A] rounded-full peer peer-checked:bg-[#E11D48] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[#0F172A] peer-checked:after:bg-white after:border-2 after:border-[#0F172A] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                      </label>
                    </div>
                  </div>
                )}

                {/* Sidebar Compact Mode Switch */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-[#0F172A]">Chế Độ Thu Gọn Thanh Bên (Compact Sidebar)</p>
                      <p className="text-[10px] font-semibold text-slate-600">
                        Tự động thu nhỏ thanh bên thành icon (hoặc bấm biểu tượng 3 sọc trên đầu sidebar)
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.sidebarCollapsed)}
                        onChange={(e) => {
                          onUpdateSettings({ ...settings, sidebarCollapsed: e.target.checked });
                          soundEngine.playSoftClick();
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white border-2 border-[#0F172A] rounded-full peer peer-checked:bg-[#E11D48] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[#0F172A] peer-checked:after:bg-white after:border-2 after:border-[#0F172A] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* TAB: ÂM THANH & HIỆU ỨNG */}
            {activeTab === 'audio' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-black text-[#0F172A]">Tùy Biến Âm Thanh & Phản Hồi Tương Tác</h4>
                  <p className="text-[11px] font-semibold text-slate-600">Điều chỉnh âm lượng và hiệu ứng chúc mừng khi hoàn thành công việc</p>
                </div>

                {/* Sound master toggle */}
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FFE4E6] border-2 border-[#0F172A] text-[#E11D48] flex items-center justify-center shrink-0">
                      {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#0F172A]">Bật Hiệu Ứng Âm Thanh</p>
                      <p className="text-[10px] font-semibold text-slate-600">Chuông ngũ âm khi xong việc & âm click nút</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
                    <div className="w-11 h-6 bg-white border-2 border-[#0F172A] rounded-full peer peer-checked:bg-[#E11D48] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[#0F172A] peer-checked:after:bg-white after:border-2 after:border-[#0F172A] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                {/* Volume slider */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-[#0F172A]">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#E11D48]" />
                      <span>Âm Lượng Hệ Thống</span>
                    </span>
                    <span className="text-[#E11D48]">{settings.soundVolume}%</span>
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
                      className="w-full accent-[#E11D48] cursor-pointer disabled:opacity-40"
                    />
                    <button
                      type="button"
                      onClick={handleTestSound}
                      disabled={!settings.soundEnabled}
                      className="px-3 py-1.5 rounded-xl bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[11px] font-black shrink-0 transition-all cursor-pointer disabled:opacity-40"
                    >
                      Thử âm
                    </button>
                  </div>
                </div>

                {/* Confetti celebration toggle */}
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FEF9C3] border-2 border-[#0F172A] text-[#0F172A] flex items-center justify-center shrink-0">
                      <PartyPopper className="w-4 h-4 text-[#E11D48]" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#0F172A]">Hiệu Ứng Pháo Hoa (Confetti)</p>
                      <p className="text-[10px] font-semibold text-slate-600">Bắn pháo hoa rực rỡ khi ấn &ldquo;Chốt xong&rdquo; một nhiệm vụ</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.confettiEnabled}
                      onChange={(e) => {
                        const updated = { ...settings, confettiEnabled: e.target.checked };
                        onUpdateSettings(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white border-2 border-[#0F172A] rounded-full peer peer-checked:bg-[#E11D48] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[#0F172A] peer-checked:after:bg-white after:border-2 after:border-[#0F172A] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                {/* English Vocabulary Neural Voice Selection */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-xs font-black text-[#0F172A]">Giọng Đọc Từ Vựng Tiếng Anh (Neural TTS)</p>
                      <p className="text-[10px] font-semibold text-slate-600">
                        Chọn giọng Mỹ, Anh (UK), Úc, Canada từ Edge Neural Voices để luyện nghe phát âm chuẩn
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        speakEnglishWord(
                          'She remained resilient despite setbacks.',
                          false,
                          settings.vocabVoice || 'en-US-AriaNeural'
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[11px] font-black inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#E11D48]" />
                      <span>Nghe thử giọng này</span>
                    </button>
                  </div>

                  <select
                    value={settings.vocabVoice || 'en-US-AriaNeural'}
                    onChange={(e) => {
                      const nextVoice = e.target.value;
                      onUpdateSettings({ ...settings, vocabVoice: nextVoice });
                      speakEnglishWord('Hello, welcome to Genncore vocabulary studio.', false, nextVoice);
                    }}
                    className="w-full px-3 py-2 bg-white border-2 border-[#0F172A] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none cursor-pointer"
                  >
                    {VOCAB_VOICE_OPTIONS.map((v) => (
                      <option key={v.id} value={v.id}>
                        [{v.sampleTag}] {v.label} — {v.gender}
                      </option>
                    ))}
                  </select>

                  {/* Speech Rate Slider */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-black text-[#0F172A]">
                      <span>Tốc độ đọc tiếng Anh</span>
                      <span className="text-[#E11D48]">{(settings.vocabSpeechRate || 1).toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.25"
                      step="0.05"
                      value={settings.vocabSpeechRate || 1.0}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value);
                        onUpdateSettings({ ...settings, vocabSpeechRate: rate });
                      }}
                      className="w-full accent-[#E11D48] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LỊCH BIỂU & THỜI GIAN */}
            {activeTab === 'calendar' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-black text-[#0F172A]">Tùy Chỉnh Lưới Lịch Biểu & Định Dạng</h4>
                  <p className="text-[11px] font-semibold text-slate-600">Cá nhân hóa cách hiển thị ngày giờ và các tuần làm việc</p>
                </div>

                {/* Time format selector */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2.5">
                  <div>
                    <p className="text-xs font-black text-[#0F172A]">Định Dạng Hiển Thị Giờ</p>
                    <p className="text-[10px] font-semibold text-slate-600">Chọn kiểu 24 giờ (17:30) hoặc 12 giờ (05:30 PM)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, timeFormat: '24h' })}
                      className={`py-2 px-3 rounded-xl text-xs transition-all cursor-pointer ${
                        settings.timeFormat === '24h'
                          ? 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black'
                          : 'bg-white hover:bg-[#FFF1F2] text-[#0F172A] border-2 border-[#0F172A] font-bold'
                      }`}
                    >
                      24 Giờ (VD: 17:35)
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, timeFormat: '12h' })}
                      className={`py-2 px-3 rounded-xl text-xs transition-all cursor-pointer ${
                        settings.timeFormat === '12h'
                          ? 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black'
                          : 'bg-white hover:bg-[#FFF1F2] text-[#0F172A] border-2 border-[#0F172A] font-bold'
                      }`}
                    >
                      12 Giờ (VD: 05:35 PM)
                    </button>
                  </div>
                </div>

                {/* Week starts on */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2.5">
                  <div>
                    <p className="text-xs font-black text-[#0F172A]">Ngày Bắt Đầu Tuần</p>
                    <p className="text-[10px] font-semibold text-slate-600">Thứ tự ngày đầu tuần trên lưới thời gian biểu</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, weekStartsOn: 1 })}
                      className={`py-2 px-3 rounded-xl text-xs transition-all cursor-pointer ${
                        settings.weekStartsOn === 1
                          ? 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black'
                          : 'bg-white hover:bg-[#FFF1F2] text-[#0F172A] border-2 border-[#0F172A] font-bold'
                      }`}
                    >
                      Thứ Hai (Mặc định VN)
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, weekStartsOn: 0 })}
                      className={`py-2 px-3 rounded-xl text-xs transition-all cursor-pointer ${
                        settings.weekStartsOn === 0
                          ? 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black'
                          : 'bg-white hover:bg-[#FFF1F2] text-[#0F172A] border-2 border-[#0F172A] font-bold'
                      }`}
                    >
                      Chủ Nhật (US Standard)
                    </button>
                  </div>
                </div>

                {/* Auto scroll to current time */}
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FEF9C3] border-2 border-[#0F172A] text-[#E11D48] flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#0F172A]">Tự Động Canh Đến Giờ Hiện Tại</p>
                      <p className="text-[10px] font-semibold text-slate-600">Lưới lịch biểu tự động cuộn đến thanh giờ thực tế</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.autoScrollToNow}
                      onChange={(e) => onUpdateSettings({ ...settings, autoScrollToNow: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white border-2 border-[#0F172A] rounded-full peer peer-checked:bg-[#E11D48] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[#0F172A] peer-checked:after:bg-white after:border-2 after:border-[#0F172A] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
              </div>
            )}

            {/* TAB: SAO LƯU & DỮ LIỆU */}
            {activeTab === 'data' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-black text-[#0F172A]">Quản Lý Dữ Liệu & Sao Lưu An Toàn</h4>
                  <p className="text-[11px] font-semibold text-slate-600">Xuất tệp dự phòng hoặc khôi phục công việc bất cứ lúc nào</p>
                </div>

                {importMsg && (
                  <div className="p-3 rounded-2xl bg-[#DCFCE7] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A] text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{importMsg}</span>
                  </div>
                )}

                {/* Export Card */}
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FFE4E6] border-2 border-[#0F172A] text-[#E11D48] flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#0F172A]">Xuất Bản Sao Lưu (JSON)</p>
                      <p className="text-[10px] font-semibold text-slate-600">Tải toàn bộ {tasks.length} công việc về máy tính</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportData}
                    className="px-3.5 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-xs font-black flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] border-2 border-[#0F172A] text-emerald-700 flex items-center justify-center shrink-0">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#0F172A]">Nhập Dữ Liệu Từ File</p>
                      <p className="text-[10px] font-semibold text-slate-600">Khôi phục dữ liệu từ tệp sao lưu .json đã lưu</p>
                    </div>
                  </div>

                  <label className="px-3.5 py-2 rounded-xl bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black flex items-center gap-1.5 transition-all shrink-0 cursor-pointer">
                    {importLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E11D48]" /> : <Upload className="w-3.5 h-3.5 text-[#E11D48]" />}
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
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#0F172A] text-[#E11D48] flex items-center justify-center shrink-0">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#0F172A]">Khôi Phục Dữ Liệu Mẫu Ban Đầu</p>
                      <p className="text-[10px] font-semibold text-slate-700">Đặt lại danh sách công việc và lịch biểu mẫu chuẩn ban đầu</p>
                    </div>
                  </div>

                  <button
                    type="button"
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
                    className="px-3.5 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-xs font-black transition-all shrink-0 cursor-pointer"
                  >
                    Reset mẫu
                  </button>
                </div>
              </div>
            )}

            {/* TAB: TÀI KHOẢN & BẢO MẬT */}
            {activeTab === 'account' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs font-black text-[#0F172A]">Thông Tin Tài Khoản & Bảo Mật Mật Khẩu</h4>
                  <p className="text-[11px] font-semibold text-slate-600">Quản lý phiên đăng nhập và bảo mật tài khoản cá nhân</p>
                </div>

                {/* Cloud Connection Status */}
                <div className="p-3.5 rounded-2xl bg-[#DCFCE7] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Trạng Thái Lưu Trữ Đám Mây</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border-2 border-[#0F172A] text-[#0F172A] text-[10px] font-black flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      <span>Đã Kết Nối Đám Mây ☁️</span>
                    </span>
                  </div>

                  {authUser ? (
                    <div className="pt-2 border-t-2 border-[#0F172A]/15 text-xs space-y-1">
                      <p className="text-[#0F172A] font-black">Tài khoản: <span className="text-[#E11D48]">{authUser.name}</span></p>
                      <p className="font-semibold text-slate-700">Email: {authUser.email}</p>
                      <p className="text-[11px] text-emerald-800 font-extrabold">● Phiên đăng nhập được bảo mật và mã hóa an toàn</p>
                    </div>
                  ) : (
                    <div className="pt-2 border-t-2 border-[#0F172A]/15 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">Chưa đăng nhập (Khách)</span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAuth?.();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black cursor-pointer"
                      >
                        Đăng nhập ngay
                      </button>
                    </div>
                  )}
                </div>

                {/* Change Password Form (only when logged in) */}
                {authUser ? (
                  <form onSubmit={handleChangePassword} className="p-4 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-3">
                    <p className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#E11D48]" />
                      <span>Đổi Mật Khẩu Tài Khoản</span>
                    </p>

                    {pwMsg && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border-2 border-[#0F172A] ${
                          pwMsg.type === 'success'
                            ? 'bg-[#DCFCE7] text-[#0F172A]'
                            : 'bg-[#FFF1F2] text-[#BE123C]'
                        }`}
                      >
                        {pwMsg.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48]" />
                        )}
                        <span>{pwMsg.text}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0F172A]">Mật khẩu hiện tại</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại"
                        className="w-full px-3 py-2 bg-white border-2 border-[#0F172A] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-[#0F172A]">Mật khẩu mới</label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Tối thiểu 6 ký tự"
                          className="w-full px-3 py-2 bg-white border-2 border-[#0F172A] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-[#0F172A]">Xác nhận lại</label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới"
                          className="w-full px-3 py-2 bg-white border-2 border-[#0F172A] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="w-full py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>Lưu Mật Khẩu Mới</span>
                    </button>
                  </form>
                ) : (
                  <div className="p-3 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]">
                    <p className="text-[11px] font-bold text-[#0F172A]">
                      💡 Hãy đăng nhập tài khoản của bạn để sử dụng tính năng bảo mật và đổi mật khẩu trên đám mây.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: HÌNH NỀN KHÔNG GIAN (WALLPAPER) */}
            {activeTab === 'wallpaper' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="text-xs font-black text-[#0F172A]">Hình Nền Không Gian (Ambient Canvas)</h4>
                    <p className="text-[11px] font-semibold text-slate-600">
                      Tạo cảm hứng làm việc với ảnh nền phong cảnh, trừu tượng hoặc ảnh tùy chỉnh
                    </p>
                  </div>
                  {onOpenBackgroundModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenBackgroundModal();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#E11D48]" />
                      <span>Trình Tải & Cắt Ảnh</span>
                    </button>
                  )}
                </div>

                {/* Live Toggle */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-[#0F172A] block">Kích hoạt hình nền ứng dụng</span>
                    <span className="text-[11px] font-semibold text-slate-600">Hiển thị ảnh nền phía sau bảng việc & thời khóa biểu</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
                    <div className="w-11 h-6 bg-white border-2 border-[#0F172A] rounded-full peer peer-checked:bg-[#E11D48] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[#0F172A] peer-checked:after:bg-white after:border-2 after:border-[#0F172A] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                {/* Preset Gallery */}
                <div className="p-4 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2.5">
                  <span className="text-xs font-black text-[#0F172A] block">Bộ sưu tập hình nền tuyển chọn</span>
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
                          className={`relative h-20 rounded-xl overflow-hidden cursor-pointer border-2 border-[#0F172A] transition-all group ${
                            isSelected
                              ? 'ring-2 ring-[#E11D48] shadow-[3px_3px_0px_#0F172A]'
                              : 'hover:shadow-[2px_2px_0px_#0F172A]'
                          }`}
                        >
                          <img
                            src={item.url}
                            alt={item.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-2">
                            <span className="text-white text-[10px] font-black truncate drop-shadow-xs">
                              {item.label}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#E11D48] border border-[#0F172A] text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Blur & Opacity Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black text-[#0F172A]">
                      <span>Độ mờ hậu cảnh (Blur)</span>
                      <span className="text-[#E11D48]">{userProfile?.backgroundBlur ?? 10}px</span>
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
                      className="w-full cursor-pointer accent-[#E11D48]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black text-[#0F172A]">
                      <span>Độ đậm hình nền (Opacity)</span>
                      <span className="text-[#E11D48]">{Math.round((userProfile?.backgroundOpacity ?? 0.65) * 100)}%</span>
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
                      className="w-full cursor-pointer accent-[#E11D48]"
                    />
                  </div>
                </div>

                {/* Reset background */}
                {userProfile?.applyAppBackground && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateBackground?.({
                        background: '',
                        applyAppBackground: false,
                      });
                      soundEngine.playSoftClick();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF1F2] text-[#E11D48] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black cursor-pointer"
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
                  <h4 className="text-xs font-black text-[#0F172A]">Thư Bưu Thiếp & Báo Cáo Năng Suất (Postcard)</h4>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Xuất bản báo cáo thành quả công việc trong tuần dưới dạng tấm bưu thiếp nghệ thuật gửi về hộp thư cá nhân
                  </p>
                </div>

                {/* Feature 1: Automated Schedule Reminder & Google Calendar */}
                <div className="p-4 rounded-2xl bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#E11D48] flex items-center justify-center">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-[#0F172A]">Tự Động Nhắc Lịch & Đồng Bộ Google Calendar</h5>
                    <p className="text-xs font-semibold text-slate-700 max-w-md mt-1">
                      Tự động gửi email điểm danh ca việc mỗi sáng 07:00, cảnh báo trước 30 phút, và kết nối với Google Calendar qua chuẩn file .ics.
                    </p>
                  </div>

                  {onOpenScheduleReminder && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenScheduleReminder();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-xs font-black flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#FDE047]" />
                      <span>Cấu Hình Tự Động Nhắc Lịch & Calendar</span>
                    </button>
                  )}
                </div>

                {/* Feature 2: Postcard */}
                <div className="p-4 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#E11D48] flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-[#0F172A]">Bưu Thiếp Tổng Kết Thành Quả</h5>
                    <p className="text-xs font-semibold text-slate-700 max-w-md mt-1">
                      Tổng hợp số giờ tập trung, tỷ lệ hoàn thành checklist và danh sách các mục tiêu trọng tâm đã chinh phục.
                    </p>
                  </div>

                  {onOpenEmailModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenEmailModal();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF1F2] text-[#0F172A] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-xs font-black flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#E11D48]" />
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
                  <h4 className="text-xs font-black text-[#0F172A]">Phím Tắt & Hướng Dẫn Nhanh</h4>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Tăng tốc thao tác làm việc chuyên nghiệp với Genncore
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2.5">
                  <p className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                    <Keyboard className="w-4 h-4 text-[#E11D48]" />
                    <span>Tổ hợp phím tắt nhanh</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF7] border-2 border-[#0F172A]">
                      <span className="font-bold text-[#0F172A]">Bàn Làm Việc & Thời Khóa Biểu</span>
                      <kbd className="px-2 py-0.5 rounded-lg bg-[#FEF9C3] text-[#0F172A] text-[10px] font-mono font-black border-2 border-[#0F172A]">Alt + 1</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF7] border-2 border-[#0F172A]">
                      <span className="font-bold text-[#0F172A]">Nhật Ký & Mục Tiêu (Journal)</span>
                      <kbd className="px-2 py-0.5 rounded-lg bg-[#FEF9C3] text-[#0F172A] text-[10px] font-mono font-black border-2 border-[#0F172A]">Alt + 2</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF7] border-2 border-[#0F172A]">
                      <span className="font-bold text-[#0F172A]">Đồng Hồ Tập Trung Pomodoro</span>
                      <kbd className="px-2 py-0.5 rounded-lg bg-[#FEF9C3] text-[#0F172A] text-[10px] font-mono font-black border-2 border-[#0F172A]">Alt + P</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF7] border-2 border-[#0F172A]">
                      <span className="font-bold text-[#0F172A]">Sổ Ghi Chú Nhanh (Scratchpad)</span>
                      <kbd className="px-2 py-0.5 rounded-lg bg-[#FEF9C3] text-[#0F172A] text-[10px] font-mono font-black border-2 border-[#0F172A]">Alt + N</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF7] border-2 border-[#0F172A]">
                      <span className="font-bold text-[#0F172A]">Theo Dõi Thói Quen Hàng Ngày</span>
                      <kbd className="px-2 py-0.5 rounded-lg bg-[#FEF9C3] text-[#0F172A] text-[10px] font-mono font-black border-2 border-[#0F172A]">Alt + H</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFF1F2] border-2 border-[#0F172A]">
                      <span className="font-bold text-[#0F172A]">Trợ Lý AI Thông Minh</span>
                      <span className="text-[10px] text-[#E11D48] font-black">Nút góc phải màn hình</span>
                    </div>
                  </div>
                </div>

                {/* Reset Data section */}
                <div className="p-4 rounded-2xl bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2.5">
                  <div className="flex items-center gap-2 text-[#0F172A] font-black text-xs">
                    <RefreshCw className="w-3.5 h-3.5 text-[#E11D48]" />
                    <span>Khôi phục dữ liệu mẫu ban đầu</span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 leading-relaxed">
                    Khôi phục lại toàn bộ thời khóa biểu, thẻ kanban và danh mục mẫu thiết kế sẵn của hệ thống.
                  </p>
                  <button
                    type="button"
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
                    className="px-3.5 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-xs font-black transition-all cursor-pointer"
                  >
                    Đặt Lại Dữ Liệu Mẫu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 shrink-0 flex items-center justify-between border-t-2 border-[#0F172A] bg-[#FFF1F2]">
          <span className="text-[10px] font-bold text-slate-700">
            Genncore v3.0 • Cài đặt tự động lưu
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-xs font-black transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
