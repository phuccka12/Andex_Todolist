'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Calendar,
  Bell,
  Send,
  Check,
  ExternalLink,
  Clock,
  Download,
  ShieldCheck,
  Loader2,
  CalendarCheck2,
  CalendarRange,
  Zap,
  Smartphone,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { TaskItem } from '../lib/types';
import { authService, AuthUser } from '../lib/authService';
import { soundEngine } from '../lib/audio';
import {
  sendScheduleReminderEmail,
  getReminderSettings,
  saveReminderSettings,
  testTelegramConnection,
  sendTelegramSchedule,
  getTelegramSettings,
  saveTelegramSettings,
} from '../lib/api';
import {
  generateIcsContent,
  downloadIcsFile,
  openGoogleCalendarImportPage,
} from '../lib/calendarSync';
import { notify } from '../lib/notificationService';

interface ScheduleReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  authUser?: AuthUser | null;
}

export const ScheduleReminderModal: React.FC<ScheduleReminderModalProps> = ({
  isOpen,
  onClose,
  tasks,
  authUser,
}) => {
  const [activeTab, setActiveTab] = useState<'telegram' | 'email' | 'calendar'>('telegram');

  // Telegram state
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramAutoMorning, setTelegramAutoMorning] = useState(true);
  const [telegramAutoUpcoming, setTelegramAutoUpcoming] = useState(true);
  const [telegramUpcomingMinutes, setTelegramUpcomingMinutes] = useState(30);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isSendingTelegramSchedule, setIsSendingTelegramSchedule] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [telegramSavedNotice, setTelegramSavedNotice] = useState(false);

  // Email form state
  const [recipient, setRecipient] = useState<string>('');
  const [filterScope, setFilterScope] = useState<'today' | 'p1' | 'all'>('today');
  const [customNote, setCustomNote] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Automation settings
  const [autoMorning, setAutoMorning] = useState(true);
  const [morningTime, setMorningTime] = useState('07:00');
  const [autoUpcoming, setAutoUpcoming] = useState(true);
  const [upcomingMinutes, setUpcomingMinutes] = useState(30);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);

  // Initialize recipient from authUser or fallback
  useEffect(() => {
    if (authUser?.email) {
      setRecipient(authUser.email);
    } else if (!recipient) {
      setRecipient('phuccao03838@gmail.com');
    }
  }, [authUser]);

  // Load saved settings from backend (Email & Telegram)
  useEffect(() => {
    if (!isOpen) return;
    const fetchSettings = async () => {
      try {
        const emailToQuery = authUser?.email || recipient;
        if (emailToQuery) {
          // 1. Email settings
          const res = await getReminderSettings(emailToQuery);
          if (res?.setting) {
            setAutoMorning(res.setting.autoMorningBriefing ?? true);
            setMorningTime(res.setting.morningBriefingTime || '07:00');
            setAutoUpcoming(res.setting.autoUpcomingReminder ?? true);
            setUpcomingMinutes(res.setting.upcomingMinutesBefore || 30);
          }

          // 2. Telegram settings
          const tgRes = await getTelegramSettings(emailToQuery);
          if (tgRes?.telegram) {
            setTelegramChatId(tgRes.telegram.chatId || '');
            setTelegramBotToken(tgRes.telegram.botToken || '');
            setTelegramEnabled(tgRes.telegram.enabled ?? true);
            setTelegramAutoMorning(tgRes.telegram.autoMorningBriefing ?? true);
            setTelegramAutoUpcoming(tgRes.telegram.autoUpcomingReminder ?? true);
            setTelegramUpcomingMinutes(tgRes.telegram.upcomingMinutesBefore || 30);
          }
        }
      } catch (err) {
        console.warn('Could not load reminder settings from backend', err);
      }
    };
    fetchSettings();
  }, [isOpen, authUser?.email]);

  if (!isOpen) return null;

  // Filter tasks based on scope
  const getFilteredTasks = () => {
    if (filterScope === 'p1') {
      return tasks.filter((t) => t.priority?.includes('Cốt Lõi') || t.priority?.includes('P1'));
    }
    if (filterScope === 'today') {
      const todayYmd = new Date().toISOString().slice(0, 10);
      return tasks.filter((t) => !t.scheduled_date || t.scheduled_date === todayYmd);
    }
    return tasks;
  };

  // --- TELEGRAM ACTIONS ---
  const handleTestTelegram = async () => {
    if (!telegramChatId.trim()) {
      await notify.warning('Vui lòng nhập Telegram Chat ID của bạn (Ví dụ: 123456789).', 'Chưa Nhập Chat ID');
      return;
    }

    try {
      setIsTestingTelegram(true);
      const res = await testTelegramConnection({
        chatId: telegramChatId.trim(),
        botToken: telegramBotToken.trim() || undefined,
      });

      soundEngine.playPentatonicChime(4);
      await notify.success(res.message || 'Đã gửi thông báo thử nghiệm thành công! Vui lòng kiểm tra ứng dụng Telegram.', 'Rung Chuông Thành Công');
    } catch (err: any) {
      await notify.error(err.message || 'Lỗi gửi tin nhắn Telegram', 'Thử Nghiệm Thất Bại');
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSendTelegramScheduleNow = async () => {
    if (!telegramChatId.trim()) {
      await notify.warning('Vui lòng nhập Telegram Chat ID trước khi bắn lịch.');
      return;
    }

    try {
      setIsSendingTelegramSchedule(true);
      const targetTasks = getFilteredTasks();
      const payloadTasks = targetTasks.map((t) => ({
        title: t.title,
        time: `${t.time_box.start} - ${t.time_box.end}`,
        priority: t.priority,
        category: t.category,
        note: t.note,
        column: t.column,
      }));

      const res = await sendTelegramSchedule({
        chatId: telegramChatId.trim(),
        botToken: telegramBotToken.trim() || undefined,
        customNote: customNote.trim() || undefined,
        tasks: payloadTasks,
      });

      soundEngine.playPentatonicChime(4);
      await notify.success(res.message || 'Đã bắn toàn bộ lịch trình công việc lên Telegram!');
    } catch (err: any) {
      await notify.error(err.message || 'Lỗi gửi lịch sang Telegram');
    } finally {
      setIsSendingTelegramSchedule(false);
    }
  };

  const handleSaveTelegram = async () => {
    if (!telegramChatId.trim()) {
      await notify.warning('Vui lòng nhập Telegram Chat ID để lưu cấu hình.');
      return;
    }

    try {
      setIsSavingTelegram(true);
      await saveTelegramSettings({
        targetEmail: authUser?.email || recipient,
        chatId: telegramChatId.trim(),
        botToken: telegramBotToken.trim() || undefined,
        enabled: telegramEnabled,
        autoMorningBriefing: telegramAutoMorning,
        autoUpcomingReminder: telegramAutoUpcoming,
        upcomingMinutesBefore: telegramUpcomingMinutes,
      });

      soundEngine.playPentatonicChime(4);
      setTelegramSavedNotice(true);
      setTimeout(() => setTelegramSavedNotice(false), 3000);
      await notify.success('Cấu hình thông báo Telegram tự động đã được lưu và kích hoạt!');
    } catch (err: any) {
      await notify.error(err.message || 'Lỗi lưu cấu hình Telegram');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  // --- EMAIL ACTIONS ---
  const handleSendReminderNow = async () => {
    if (!recipient || !recipient.includes('@')) {
      await notify.warning('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    try {
      setIsSending(true);
      setSendSuccessMsg(null);
      setPreviewUrl(null);

      const targetTasks = getFilteredTasks();
      const payloadTasks = targetTasks.map((t) => ({
        title: t.title,
        time: `${t.time_box.start} - ${t.time_box.end}`,
        priority: t.priority,
        category: t.category,
        note: t.note,
        column: t.column,
        scheduled_date: t.scheduled_date,
      }));

      const res = await sendScheduleReminderEmail({
        recipient,
        customMessage: customNote.trim() || undefined,
        tasks: payloadTasks,
      });

      soundEngine.playPentatonicChime(4);
      setSendSuccessMsg(res.message || 'Đã gửi thông báo nhắc việc thành công!');
      if (res.previewUrl) {
        setPreviewUrl(res.previewUrl);
      }
    } catch (err: any) {
      console.error(err);
      await notify.error(err.message || 'Không thể kết nối máy chủ', 'Lỗi Gửi Email');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveAutomation = async () => {
    if (!recipient) {
      await notify.warning('Vui lòng nhập email người nhận để kích hoạt nhắc lịch tự động.');
      return;
    }
    try {
      setIsSavingSettings(true);
      await saveReminderSettings({
        targetEmail: recipient,
        autoMorningBriefing: autoMorning,
        morningBriefingTime: morningTime,
        autoUpcomingReminder: autoUpcoming,
        upcomingMinutesBefore: upcomingMinutes,
      });

      soundEngine.playPentatonicChime(4);
      setSettingsSavedNotice(true);
      setTimeout(() => setSettingsSavedNotice(false), 3000);
    } catch (err: any) {
      await notify.error(err.message || 'Thử lại sau', 'Lỗi Lưu Cài Đặt');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // --- CALENDAR EXPORT ---
  const handleExportIcs = () => {
    soundEngine.playSoftClick();
    const icsContent = generateIcsContent(tasks, 'CBP Atelier Schedule');
    const todayStr = new Date().toISOString().slice(0, 10);
    downloadIcsFile(`cbp-atelier-schedule-${todayStr}.ics`, icsContent);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[88vh] shadow-2xl flex flex-col overflow-hidden border border-[#EEF2F8] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4.5 shrink-0 flex items-center justify-between border-b border-[#EEF2F8] bg-[#FAFBFD]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0284C7] to-[#2563EB] text-white flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-[#1E2433]">Nhắc Lịch Thông Minh & Đồng Bộ</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]">
                  Multi-Channel OS
                </span>
              </div>
              <p className="text-[11px] text-[#8F9CAE]">Rung điện thoại qua Telegram, email báo cáo & đồng bộ Google Calendar</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 3 Main Tab Pills */}
            <div className="flex items-center bg-[#F1F4F9] p-1 rounded-2xl border border-[#E2E8F0]">
              <button
                onClick={() => {
                  setActiveTab('telegram');
                  soundEngine.playSoftClick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                  activeTab === 'telegram'
                    ? 'bg-white text-[#0284C7] shadow-xs'
                    : 'text-[#64748B] hover:text-[#1E2433]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Telegram Bot</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('email');
                  soundEngine.playSoftClick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'email'
                    ? 'bg-white text-[#1E293B] shadow-xs'
                    : 'text-[#64748B] hover:text-[#1E2433]'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Email Điểm Danh</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('calendar');
                  soundEngine.playSoftClick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-white text-[#1E293B] shadow-xs'
                    : 'text-[#64748B] hover:text-[#1E2433]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Google Calendar</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (Spacious 2-column studio layout) */}
        <div className="flex-1 p-6 overflow-y-auto custom-main-scroll">
          
          {/* TAB 1: TELEGRAM BOT (CHỦ ĐỘNG & RUNG MÁY TỨC THÌ) */}
          {activeTab === 'telegram' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: TELEGRAM CONFIG & DISPATCH (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-[#EEF2F8]">
                  <h4 className="text-xs font-extrabold text-[#1E2433] uppercase tracking-wide flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#0284C7]" />
                    <span>1. Kết Nối Nhận Tin Nhắn Telegram</span>
                  </h4>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Chủ động 100%
                  </span>
                </div>

                {/* Chat ID Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1E2433]">
                    <label>Telegram Chat ID của bạn</label>
                    <a
                      href="https://t.me/userinfobot"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[#0284C7] hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      Lấy Chat ID từ @userinfobot <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="Ví dụ: 987654321"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-mono font-bold text-[#1E2433] focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] outline-none bg-white shadow-2xs"
                    />
                  </div>
                  <p className="text-[10px] text-[#64748B]">
                    Chỉ cần gõ <code>/start</code> cho bot <strong>@userinfobot</strong> hoặc <strong>@RawDataBot</strong> trên Telegram, bot sẽ hiển thị dãy số ID của bạn.
                  </p>
                </div>

                {/* Bot Token */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1E2433]">
                    <label>Telegram Bot Token</label>
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[#0284C7] hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      Tạo bot trong 15s tại @BotFather <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    placeholder="Dán mã Token từ @BotFather (VD: 7123456789:AAFx...)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-mono text-[#1E2433] focus:border-[#0284C7] outline-none bg-white shadow-2xs"
                  />
                  <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-100 text-[11px] text-slate-600 space-y-1">
                    <p className="font-semibold text-sky-950 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-sky-600" /> Hướng dẫn kết nối Telegram trong 30 giây:
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[10.5px] text-slate-600 pl-1">
                      <li>Mở <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[#0284C7] underline font-medium">@BotFather</a> trên Telegram, gõ <code>/newbot</code> đặt tên để lấy <strong>Bot Token</strong>.</li>
                      <li>Nhấn vào link bot bạn vừa tạo và bấm <strong>START</strong> để kích hoạt.</li>
                      <li>Mở <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-[#0284C7] underline font-medium">@userinfobot</a> bấm <code>/start</code> để lấy <strong>Chat ID</strong> của bạn rồi điền vào trên.</li>
                    </ol>
                  </div>
                </div>

                {/* 2 Big Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={isTestingTelegram}
                    className="py-3 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isTestingTelegram ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    <span>Bắn Tin Nhắn Thử Nghiệm</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendTelegramScheduleNow}
                    disabled={isSendingTelegramSchedule}
                    className="py-3 px-4 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-bold transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSendingTelegramSchedule ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-[#38BDF8]" />
                    )}
                    <span>Bắn Lịch Hôm Nay Lên Telegram</span>
                  </button>
                </div>

                {/* Scope selector for on-demand schedule */}
                <div className="p-3 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8] space-y-1.5">
                  <span className="text-[10px] font-bold text-[#64748B] block uppercase tracking-wider">
                    Phạm vi khi bấm "Bắn Lịch Lên Telegram":
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterScope('today')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                        filterScope === 'today'
                          ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0284C7]'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      Lịch Hôm Nay
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterScope('p1')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                        filterScope === 'p1'
                          ? 'border-[#AE445A] bg-[#FFF1F2] text-[#AE445A]'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      P1 Cốt Lõi
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterScope('all')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                        filterScope === 'all'
                          ? 'border-slate-800 bg-slate-100 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      Toàn Bộ Tuần
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: TELEGRAM AUTOMATION WORKER (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-[#FAFBFD] p-5 rounded-3xl border border-[#EEF2F8] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-extrabold text-[#1E2433] uppercase tracking-wide">
                        2. Tự Động Định Kỳ Telegram
                      </h4>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramEnabled}
                        onChange={(e) => setTelegramEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0284C7]" />
                    </label>
                  </div>

                  {/* Option 1: Daily morning telegram briefing */}
                  <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1E2433]">Điểm danh sáng qua Telegram</p>
                          <p className="text-[10px] text-[#8F9CAE]">Báo cáo tổng kết ca việc lúc 07:00</p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={telegramAutoMorning}
                          onChange={(e) => setTelegramAutoMorning(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0284C7]" />
                      </label>
                    </div>
                  </div>

                  {/* Option 2: Pre-task telegram reminder */}
                  <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-[#4F46E5] flex items-center justify-center shrink-0">
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1E2433]">Rung chuông trước ca việc</p>
                          <p className="text-[10px] text-[#8F9CAE]">Báo động trước giờ bắt đầu</p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={telegramAutoUpcoming}
                          onChange={(e) => setTelegramAutoUpcoming(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0284C7]" />
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-[#64748B] font-medium">Khoảng cách thời gian:</span>
                      <select
                        value={telegramUpcomingMinutes}
                        onChange={(e) => setTelegramUpcomingMinutes(Number(e.target.value))}
                        className="px-2 py-0.5 rounded-lg border border-[#CBD5E1] text-[11px] font-bold bg-[#FAFBFD] text-[#1E2433]"
                      >
                        <option value={15}>Trước 15 phút</option>
                        <option value={30}>Trước 30 phút</option>
                        <option value={60}>Trước 60 phút</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Save settings action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveTelegram}
                    disabled={isSavingTelegram}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#1E2433] text-xs font-bold transition-all border border-[#CBD5E1] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSavingTelegram ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : telegramSavedNotice ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0284C7]" />
                    )}
                    <span>{telegramSavedNotice ? 'Đã Lưu & Kích Hoạt' : 'Lưu Cấu Hình Nhắc Việc Telegram'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EMAIL DISPATCHER */}
          {activeTab === 'email' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: ON-DEMAND DISPATCH (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-[#EEF2F8]">
                  <h4 className="text-xs font-extrabold text-[#1E2433] uppercase tracking-wide">
                    Gửi Email Điểm Danh
                  </h4>
                  <span className="text-[10px] text-[#64748B]">HTML Atelier Template</span>
                </div>

                {/* Recipient Email Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1E2433]">
                    <label>Hộp Thư Nhận Lịch</label>
                    {authUser?.email && (
                      <button
                        type="button"
                        onClick={() => setRecipient(authUser.email)}
                        className="text-[10px] text-[#2563EB] hover:underline font-semibold"
                      >
                        Email tài khoản ({authUser.email})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="ten-ban@congty.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#1E2433] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none bg-white shadow-2xs"
                    />
                  </div>
                </div>

                {/* Action: Send Now */}
                <button
                  type="button"
                  onClick={handleSendReminderNow}
                  disabled={isSending}
                  className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tổng hợp và gửi email nhắc việc...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Gửi Lịch Nhắc Nhở Ngay Về Email</span>
                    </>
                  )}
                </button>

                {/* Success Notification & Preview Link */}
                {sendSuccessMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col gap-1.5 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{sendSuccessMsg}</span>
                    </div>
                    {previewUrl && (
                      <div className="pl-6 text-[11px] text-emerald-700">
                        <span>Xem thử email đã kết xuất: </span>
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline font-bold text-[#2563EB] hover:text-[#1D4ED8] inline-flex items-center gap-1"
                        >
                          Mở bản xem trước Ethereal <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: EMAIL AUTOMATION WORKER (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-[#FAFBFD] p-5 rounded-3xl border border-[#EEF2F8] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-extrabold text-[#1E2433] uppercase tracking-wide">
                        Tự Động Qua Email
                      </h4>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1E2433]">Điểm danh sáng (07:00)</span>
                      <input
                        type="checkbox"
                        checked={autoMorning}
                        onChange={(e) => setAutoMorning(e.target.checked)}
                        className="accent-[#2563EB]"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-[#64748B]">Cảnh báo trước 30p</span>
                      <input
                        type="checkbox"
                        checked={autoUpcoming}
                        onChange={(e) => setAutoUpcoming(e.target.checked)}
                        className="accent-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAutomation}
                  disabled={isSavingSettings}
                  className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#1E2433] text-xs font-bold transition-all border border-[#CBD5E1] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>{settingsSavedNotice ? 'Đã Lưu Cấu Hình' : 'Lưu Cài Đặt Email'}</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: GOOGLE CALENDAR & .ICS SYNC */}
          {activeTab === 'calendar' && (
            <div className="space-y-5">
              
              {/* Highlight Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-tr from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-xs text-emerald-600 flex items-center justify-center shrink-0">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#064E3B]">Tương Thích Chuẩn Quốc Tế iCalendar (RFC 5545)</h4>
                  <p className="text-xs text-[#047857] mt-0.5">
                    Đồng bộ tức thì với Google Calendar, Apple Calendar (iPhone/Mac), và Microsoft Outlook
                  </p>
                  <p className="text-xs text-[#334155] leading-relaxed pt-2">
                    Toàn bộ thời khóa biểu công việc của bạn được đóng gói thành tệp tin <strong>.ics</strong> tiêu chuẩn, tự động map đúng ngày, khung giờ bắt đầu và ghi chú chi tiết.
                  </p>
                </div>
              </div>

              {/* Action Buttons (2 Generous Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleExportIcs}
                  className="p-5 rounded-3xl bg-[#1E293B] hover:bg-[#0F172A] text-white transition-all shadow-md flex flex-col justify-between text-left group cursor-pointer border border-slate-700"
                >
                  <div>
                    <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center mb-3 text-[#38BDF8] group-hover:scale-110 transition-transform">
                      <Download className="w-4.5 h-4.5" />
                    </div>
                    <h5 className="text-sm font-black">Xuất Tệp Lịch .ics Chuẩn</h5>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Tải về máy tệp lịch của {tasks.length} ca việc đã được lập lịch trong hệ thống.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#38BDF8] mt-4 inline-flex items-center gap-1.5">
                    Bấm để tải tệp .ics về máy &rarr;
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openGoogleCalendarImportPage}
                  className="p-5 rounded-3xl bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#1E2433] transition-all shadow-xs flex flex-col justify-between text-left group cursor-pointer"
                >
                  <div>
                    <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 text-[#2563EB] group-hover:scale-110 transition-transform">
                      <ExternalLink className="w-4.5 h-4.5" />
                    </div>
                    <h5 className="text-sm font-black">Mở Nhập Google Calendar</h5>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                      Mở trực tiếp trang Cài đặt & Nhập lịch của Google Calendar trên trình duyệt.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#2563EB] mt-4 inline-flex items-center gap-1.5">
                    Mở tab Google Calendar &rarr;
                  </span>
                </button>
              </div>

              {/* 3 Step Guide */}
              <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8] space-y-2">
                <h5 className="text-xs font-bold text-[#1E2433]">Quy trình 3 bước đồng bộ:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#64748B] pt-1">
                  <div className="p-3 bg-white rounded-xl border border-[#EEF2F8]">
                    <span className="font-mono font-bold text-[#2563EB] block mb-1">Bước 1</span>
                    Bấm <strong>"Xuất Tệp Lịch .ics"</strong> để tải tệp lịch về máy.
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#EEF2F8]">
                    <span className="font-mono font-bold text-[#2563EB] block mb-1">Bước 2</span>
                    Bấm <strong>"Mở Nhập Google Calendar"</strong> để chuyển sang màn hình nhập file.
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#EEF2F8]">
                    <span className="font-mono font-bold text-[#2563EB] block mb-1">Bước 3</span>
                    Chọn tệp <strong>.ics</strong> vừa tải và ấn <strong>Nhập (Import)</strong>. Lịch sẽ đồng bộ lên điện thoại của bạn.
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 shrink-0 flex items-center justify-between border-t border-[#EEF2F8] bg-white">
          <span className="text-[11px] text-[#8F9CAE]">
            CBP Atelier Synchronizer • Tiêu chuẩn bảo mật ISO 27001 • Đồng bộ đám mây MongoDB Atlas
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
