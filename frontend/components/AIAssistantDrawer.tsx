'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  Check,
  Zap,
  Clock,
  Target,
  Coffee,
  Calendar,
  Lightbulb,
  Loader2,
  RotateCcw,
  Maximize2,
  Minimize2,
  GripVertical,
} from 'lucide-react';
import { TaskItem } from '../lib/types';
import { soundEngine } from '../lib/audio';
import { streamAiChat, getAiStatus } from '../lib/api';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAutoScheduleTask: (task: Partial<TaskItem>) => void;
}

interface ChatMsg {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  statusText?: string;
  createdTask?: any;
  isStreaming?: boolean;
}

const INITIAL_WELCOME_MSG: ChatMsg = {
  id: 'init-1',
  sender: 'ai',
  text: 'Chào bạn nha! Mình là **Gencoore AI** ✨\n\nMình có thể tìm giúp bạn khung giờ rảnh đẹp nhất, ghim nhanh việc quan trọng lên lịch hoặc gửi nhắc nhở qua Telegram. Hôm nay mình phụ bạn việc gì trước nào? 😊',
};

const QUICK_SUGGESTIONS = [
  {
    icon: Target,
    label: 'Tìm 2h Deep Work chiều nay',
    prompt: 'Tìm giúp mình một khoảng trống 2 tiếng chiều nay từ 14:00 để tập trung làm việc P1',
  },
  {
    icon: Zap,
    label: 'Hôm nay cần ưu tiên gì?',
    prompt: 'Hôm nay mình có những việc nào quan trọng cần ưu tiên nhất?',
  },
  {
    icon: Clock,
    label: 'Xếp lịch họp sáng mai',
    prompt: 'Xem giúp mình khoảng trống 1 tiếng sáng mai để xếp lịch họp review tiến độ',
  },
  {
    icon: Coffee,
    label: 'Nhắc lịch qua Telegram',
    prompt: 'Gửi tóm tắt lịch trình quan trọng sang Telegram giúp mình nhé',
  },
];

function getPriorityStyle(priority: string): string {
  const lower = priority.toLowerCase();
  if (lower.includes('1') || lower.includes('cốt lõi')) {
    return 'bg-[#FFE4E6] text-[#E11D48] border-[#0F172A]';
  }
  if (lower.includes('2') || lower.includes('quan trọng')) {
    return 'bg-[#FEF9C3] text-[#0F172A] border-[#0F172A]';
  }
  return 'bg-[#DCFCE7] text-[#0F172A] border-[#0F172A]';
}

function renderInlineTokens(str: string): React.ReactNode {
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2).trim();

      if (/^\[?(P[1-4](\s*-\s*[^\]]+)?|#\d\s*[^\]]+)\]?$/i.test(inner)) {
        const cleanPriority = inner.replace(/[\[\]]/g, '');
        return (
          <span
            key={idx}
            className={`inline-flex items-center text-[10.5px] font-black px-2 py-0.5 rounded-full border mx-1 align-baseline ${getPriorityStyle(cleanPriority)}`}
          >
            {cleanPriority}
          </span>
        );
      }

      if (/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(inner)) {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg bg-[#FEF9C3] text-[#0F172A] border border-[#0F172A] mx-1 align-baseline"
          >
            <Clock className="w-3 h-3 text-[#E11D48]" />
            {inner.replace(/[\[\]]/g, '')}
          </span>
        );
      }

      return (
        <strong key={idx} className="font-bold text-[#0F172A]">
          {inner}
        </strong>
      );
    }

    return part;
  });
}

const GencooreFormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const normalized = text
    .replace(/:\s*-\s*\[/g, ':\n\n- [')
    .replace(/:\s*-\s*\*\*/g, ':\n\n- **')
    .replace(/([^\n])\s*-\s*(\[\d{1,2}:\d{2}|\*\*)/g, (m, p1, p2) => p1 + '\n- ' + p2)
    .replace(/([^\n])\s*(>|\*+)?\s*(Lưu ý:|Note:|Chú ý:|Gợi ý:|Mẹo nhỏ:)/gi, (m, p1, _p2, label) => p1 + '\n\n> ' + label + ' ')
    .replace(/(\.)\s*(Bạn có muốn|Mình có thể|Hãy cho mình biết|Bạn có cần)/gi, (m, p1, p2) => p1 + '\n\n' + p2);

  const blocks = normalized.split(/\n\n+/);

  return (
    <div className="space-y-2.5 text-[13.5px] leading-[1.65] text-[#0F172A] font-medium">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const isNoteBlock =
          trimmed.startsWith('>') ||
          trimmed.startsWith('**Lưu ý:**') ||
          trimmed.startsWith('Lưu ý:') ||
          trimmed.startsWith('**Chú ý:**') ||
          trimmed.startsWith('Chú ý:') ||
          trimmed.startsWith('**Mẹo nhỏ:**') ||
          trimmed.startsWith('Mẹo nhỏ:');

        if (isNoteBlock) {
          const cleanNote = trimmed
            .replace(/^>\s*/, '')
            .replace(/^\*\*(Lưu ý|Chú ý|Mẹo nhỏ|Gợi ý):\*\*\s*/i, '')
            .replace(/^(Lưu ý|Chú ý|Mẹo nhỏ|Gợi ý):\s*/i, '')
            .replace(/\*+/g, '')
            .trim();

          return (
            <div
              key={bIdx}
              className="p-3 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] text-xs flex items-start gap-2.5 my-2"
            >
              <div className="w-6 h-6 rounded-xl bg-white border border-[#0F172A] text-[#E11D48] flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 leading-relaxed">
                <span className="font-black text-[#0F172A] block mb-0.5">Mẹo nhỏ cho bạn</span>
                <span className="text-[#0F172A]/85 font-semibold">{cleanNote}</span>
              </div>
            </div>
          );
        }

        const lines = trimmed.split('\n');
        const hasListItems = lines.some((l) => l.trim().startsWith('- ') || l.trim().startsWith('* '));

        if (hasListItems) {
          return (
            <div key={bIdx} className="space-y-2 my-2">
              {lines.map((line, lIdx) => {
                const lineTrim = line.trim();
                if (lineTrim.startsWith('- ') || lineTrim.startsWith('* ')) {
                  const content = lineTrim.replace(/^[-*]\s*/, '');
                  const timeMatch = content.match(/\[?(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})\]?/);
                  const timeStr = timeMatch ? timeMatch[1] : null;

                  const priorityMatch = content.match(/(P[1-4](\s*-\s*[^\]|\n]+)?|#[1-4]\s*[^\]|\n]+)/i);
                  const priorityStr = priorityMatch ? priorityMatch[0].replace(/[\[\]]/g, '').trim() : null;

                  let cleanTitle = content
                    .replace(/\[?\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\]?/g, '')
                    .replace(/\*\*/g, '');

                  if (priorityStr) {
                    cleanTitle = cleanTitle.replace(priorityStr, '');
                  }

                  cleanTitle = cleanTitle.replace(/^[|\s-]+|[|\s-]+$/g, '').replace(/\|/g, '').trim();

                  // Plain bullet item when there's no timebox or priority metadata
                  if (!timeStr && !priorityStr) {
                    return (
                      <div key={lIdx} className="flex items-start gap-2 pl-1">
                        <span className="w-2 h-2 rounded-full bg-[#E11D48] border border-[#0F172A] shrink-0 mt-2" />
                        <p className="text-[13.5px] text-[#0F172A] leading-[1.65] flex-1">
                          {renderInlineTokens(content)}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={lIdx}
                      className="p-3 rounded-2xl bg-[#FFFDF7] hover:bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#E11D48] border border-[#0F172A] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#0F172A] text-[12.5px] leading-snug">
                            {cleanTitle || content.replace(/\*\*/g, '')}
                          </p>
                          {timeStr && (
                            <div className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#0F172A] bg-[#FEF9C3] border border-[#0F172A] px-2 py-0.5 rounded-md mt-1">
                              <Clock className="w-3 h-3 text-[#E11D48]" />
                              <span>{timeStr}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {priorityStr && (
                        <span
                          className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getPriorityStyle(priorityStr)}`}
                        >
                          {priorityStr}
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <p key={lIdx} className="leading-relaxed">
                    {renderInlineTokens(lineTrim)}
                  </p>
                );
              })}
            </div>
          );
        }

        return (
          <p key={bIdx} className="leading-relaxed">
            {renderInlineTokens(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [isAiReady, setIsAiReady] = useState(true);
  const [drawerWidth, setDrawerWidth] = useState<number>(480);
  const [isResizing, setIsResizing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([INITIAL_WELCOME_MSG]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('genncore_ai_drawer_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 340 && parsed <= 1040) {
          setDrawerWidth(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const maxAllowed = Math.min(980, window.innerWidth - 24);
      const nextWidth = Math.max(340, Math.min(maxAllowed, window.innerWidth - e.clientX));
      setDrawerWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem('genncore_ai_drawer_width', String(drawerWidth));
      } catch {}
    };

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, drawerWidth]);

  const handleToggleDrawerSize = () => {
    soundEngine.playSoftClick();
    const maxAllowed = typeof window !== 'undefined' ? Math.min(920, window.innerWidth - 32) : 920;
    const nextWidth = drawerWidth < 560 ? Math.min(680, maxAllowed) : drawerWidth < 780 ? maxAllowed : 460;
    setDrawerWidth(nextWidth);
    try {
      localStorage.setItem('genncore_ai_drawer_width', String(nextWidth));
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      getAiStatus()
        .then((status) => {
          setIsAiReady(status.isReady);
        })
        .catch(() => {
          setIsAiReady(false);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStatus]);

  if (!isOpen) return null;

  const handleResetChat = () => {
    if (isProcessing) return;
    soundEngine.playSoftClick();
    setMessages([INITIAL_WELCOME_MSG]);
    setCurrentStatus(null);
  };

  const handleSend = async (userPromptText?: string) => {
    const textToSend = (userPromptText || prompt).trim();
    if (!textToSend || isProcessing) return;

    soundEngine.playSoftClick();
    setPrompt('');

    const userMsgId = 'msg-' + Date.now();
    const aiMsgId = 'ai-' + (Date.now() + 1);

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: textToSend },
      { id: aiMsgId, sender: 'ai', text: '', isStreaming: true },
    ]);

    setIsProcessing(true);
    setCurrentStatus('Gencoore AI đang suy nghĩ...');

    const historyPayload = messages
      .filter((m) => m.text.trim())
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

    try {
      await streamAiChat(textToSend, historyPayload, {
        onStatus: (statusPayload) => {
          setCurrentStatus(statusPayload.message);
        },
        onAction: (actionPayload) => {
          if (actionPayload.action === 'TASK_CREATED') {
            soundEngine.playPentatonicChime(4);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('atelier:task-mutated', {
                  detail: { action: 'TASK_CREATED', task: actionPayload.task },
                })
              );
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, createdTask: actionPayload.task } : m
              )
            );
          }
        },
        onToken: (tokenPayload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? { ...m, text: m.text + tokenPayload.text, isStreaming: true }
                : m
            )
          );
        },
        onError: (errPayload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? { ...m, text: `⚠️ ${errPayload.error}`, isStreaming: false }
                : m
            )
          );
        },
        onDone: () => {
          setIsProcessing(false);
          setCurrentStatus(null);
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, isStreaming: false } : m))
          );
        },
      });
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      setCurrentStatus(null);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                text: `Mình chưa kết nối được với máy chủ Gencoore AI: ${err.message || 'Hệ thống đang bận'}. Bạn thử lại sau vài giây nhé!`,
                isStreaming: false,
              }
            : m
        )
      );
    }
  };

  return (
    <div
      style={{ width: `min(100vw, ${drawerWidth}px)` }}
      className={`fixed inset-y-0 right-0 z-[110] bg-[#FFFDF7] shadow-[-6px_0px_0px_#0F172A] border-l-2 border-[#0F172A] flex flex-col justify-between transform animate-in slide-in-from-right duration-200 ${
        isResizing ? 'transition-none select-none' : 'transition-[width] duration-150'
      }`}
    >
      {/* Drag-to-resize Left Edge Handle */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        title="Kéo để chỉnh độ rộng khung Gencoore AI"
        className="hidden sm:flex items-center justify-center absolute left-0 top-0 bottom-0 w-2.5 -translate-x-1/2 cursor-ew-resize z-30 group"
      >
        <div className="w-5 h-11 rounded-full bg-[#FEF08A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:bg-[#E11D48] group-hover:text-white transition-all">
          <GripVertical className="w-3 h-3" />
        </div>
      </div>

      {/* Header */}
      <div className="px-5 py-4 border-b-2 border-[#0F172A] bg-[#FFF1F2] flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-white border-2 border-[#0F172A] p-1.5 flex items-center justify-center shadow-[3px_3px_0px_#0F172A] relative shrink-0">
            <img src="/images/logo-mark.png" alt="Gencoore AI" className="w-full h-full object-contain" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0F172A]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm text-[#0F172A]">Gencoore AI</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 border-2 border-[#0F172A] ${
                  isAiReady
                    ? 'bg-[#DCFCE7] text-[#0F172A]'
                    : 'bg-[#FEF08A] text-[#0F172A]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAiReady ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                  }`}
                />
                {isAiReady ? 'Sẵn sàng' : 'Đang đồng bộ'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-bold truncate">Bạn đồng hành sắp xếp thời gian</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleDrawerSize}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] hover:bg-[#FDE047] text-[10.5px] font-black transition-all cursor-pointer"
            title="Chỉnh kích thước khung AI (Nhỏ / Vừa / Rộng)"
          >
            {drawerWidth >= 700 ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
            <span>{drawerWidth < 560 ? 'S' : drawerWidth < 780 ? 'M' : 'L'}</span>
          </button>
          <button
            onClick={handleResetChat}
            disabled={isProcessing}
            className="p-2 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] hover:bg-[#FEF9C3] transition-all cursor-pointer disabled:opacity-40"
            title="Cuộc trò chuyện mới"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] hover:bg-[#FFE4E6] transition-all cursor-pointer"
            title="Đóng trợ lý"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-main-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'user' ? (
              <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-sm bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[13px] font-bold leading-relaxed">
                {msg.text}
              </div>
            ) : (
              <div className="flex items-start gap-2.5 max-w-[92%]">
                <div className="w-8 h-8 rounded-xl bg-white border-2 border-[#0F172A] p-1 flex items-center justify-center shadow-[2px_2px_0px_#0F172A] shrink-0 mt-0.5">
                  <img src="/images/logo-mark.png" alt="AI" className="block w-full h-full object-contain" />
                </div>
                <div className="flex-1 p-4 rounded-2xl rounded-tl-sm bg-white text-[#0F172A] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                  {msg.text ? (
                    <GencooreFormattedMessage text={msg.text} />
                  ) : (
                    <div className="flex items-center gap-2 text-[#E11D48] py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs font-bold text-[#0F172A]">
                        Mình đang ngó lịch và chuẩn bị câu trả lời cho bạn nè...
                      </span>
                    </div>
                  )}

                  {/* Task Created Confirmation Card */}
                  {msg.createdTask && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-[#DCFCE7] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A] space-y-1.5 animate-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-black text-[11px] text-[#0F172A]">
                          <span className="w-4 h-4 rounded-full bg-[#16A34A] border border-[#0F172A] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          Mình đã thêm vào lịch cho bạn rồi nè!
                        </span>
                        <span className="text-[10px] font-black bg-white text-[#0F172A] px-2 py-0.5 rounded-full border border-[#0F172A]">
                          {msg.createdTask.priority || '#1 Cốt Lõi'}
                        </span>
                      </div>
                      <p className="font-black text-xs text-[#0F172A]">{msg.createdTask.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-[#0F172A] font-bold">
                        <Clock className="w-3 h-3 text-[#E11D48]" />
                        <span>
                          {msg.createdTask.time_box?.start} - {msg.createdTask.time_box?.end}
                        </span>
                        <span>•</span>
                        <Calendar className="w-3 h-3 text-[#E11D48]" />
                        <span>{msg.createdTask.scheduled_date || 'Hôm nay'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Live Status Heartbeat */}
        {currentStatus && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] text-[11px] font-black">
            <Sparkles className="w-3.5 h-3.5 text-[#E11D48] animate-pulse" />
            <span>{currentStatus}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="px-4 py-3 border-t-2 border-[#0F172A] bg-[#FFF1F2] shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-black text-[#0F172A] uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3 text-[#E11D48]" />
          <span>Gợi ý nhanh cho bạn</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {QUICK_SUGGESTIONS.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(item.prompt)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FEF9C3] text-[#0F172A] text-[11px] font-black border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Icon className="w-3.5 h-3.5 text-[#E11D48]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Field */}
      <div
        className="p-3.5 sm:p-4 border-t-2 border-[#0F172A] bg-[#FFFDF7] flex items-center gap-2 shrink-0"
        style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
      >
        <input
          type="text"
          placeholder="Nhắn với Gencoore AI (vd: Xếp lịch học tối nay 19:30)..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isProcessing}
          className="flex-1 px-4 py-2.5 text-xs bg-white border-2 border-[#0F172A] rounded-xl text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none placeholder:text-slate-400 transition-all"
        />
        <button
          onClick={() => handleSend()}
          disabled={!prompt.trim() || isProcessing}
          className="p-2.5 bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-black rounded-xl transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer active:translate-y-0.5"
          title="Gửi tin nhắn"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Send className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
    </div>
  );
};
