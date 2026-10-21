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
  AlertCircle,
  Loader2,
  ChevronRight,
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

const QUICK_SUGGESTIONS = [
  {
    icon: Target,
    label: '2h Deep Work Chiều Nay',
    prompt: 'Tìm một slot trống 2 tiếng chiều nay từ 14:00 để xếp ca Deep Work P1',
  },
  {
    icon: Zap,
    label: 'Khám phá Lịch Hôm Nay',
    prompt: 'Hôm nay tôi có những ca việc nào quan trọng nhất cần ưu tiên?',
  },
  {
    icon: Clock,
    label: 'Xếp Họp Team Sáng Mai',
    prompt: 'Quét slot trống 1 tiếng sáng mai để xếp lịch họp review tiến độ',
  },
  {
    icon: Coffee,
    label: 'Cảnh Báo Sang Telegram',
    prompt: 'Gửi thông báo tóm tắt lịch trình quan trọng sang Telegram cho tôi',
  },
];

function renderInlineTokens(str: string): React.ReactNode {
  // Matches **bold text**
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2).trim();

      // Check if it's priority token like [P1 - Cốt Lõi] or P1
      if (/^\[?(P[1-4](\s*-\s*[^\]]+)?|#\d\s*[^\]]+)\]?$/i.test(inner)) {
        return (
          <span
            key={idx}
            className="inline-flex items-center font-mono text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 mx-1 align-baseline shadow-2xs"
          >
            {inner.replace(/[\[\]]/g, '')}
          </span>
        );
      }

      // Check if it's time slot token like [08:30 - 10:00]
      if (/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(inner)) {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 mx-1 align-baseline shadow-2xs"
          >
            <Clock className="w-3 h-3 text-slate-500" />
            {inner.replace(/[\[\]]/g, '')}
          </span>
        );
      }

      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {inner}
        </strong>
      );
    }

    return part;
  });
}

const AtelierFormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // 1. Normalize mashed text from LLM
  const normalized = text
    .replace(/:\s*-\s*\[/g, ':\n\n- [')
    .replace(/:\s*-\s*\*\*/g, ':\n\n- **')
    .replace(/([^\n])\s*-\s*(\[\d{1,2}:\d{2}|\*\*)/g, (m, p1, p2) => p1 + '\n- ' + p2)
    .replace(/([^\n])\s*(>|\*+)?\s*(Lưu ý:|Note:|Chú ý:)/gi, (m, p1) => p1 + '\n\n> Lưu ý: ')
    .replace(/(\.)\s*(Bạn có muốn|Tôi có thể|Hãy cho tôi biết|Bạn có cần)/gi, (m, p1, p2) => p1 + '\n\n' + p2);

  // Split into paragraphs / blocks
  const blocks = normalized.split(/\n\n+/);

  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-slate-800">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Blockquote / Note block: ONLY if block strictly starts with > or Lưu ý:
        const isNoteBlock =
          trimmed.startsWith('>') ||
          trimmed.startsWith('**Lưu ý:**') ||
          trimmed.startsWith('Lưu ý:') ||
          trimmed.startsWith('**Chú ý:**') ||
          trimmed.startsWith('Chú ý:');

        if (isNoteBlock) {
          const cleanNote = trimmed
            .replace(/^>\s*/, '')
            .replace(/^\*\*Lưu ý:\*\*\s*/i, '')
            .replace(/^Lưu ý:\s*/i, '')
            .replace(/^\*\*Chú ý:\*\*\s*/i, '')
            .replace(/^Chú ý:\s*/i, '')
            .replace(/\*+/g, '')
            .trim();

          return (
            <div
              key={bIdx}
              className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-950 text-xs flex items-start gap-2.5 my-2 shadow-2xs animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-normal">
                <span className="font-bold text-amber-900 block mb-0.5">Lưu ý hệ thống</span>
                <span className="text-amber-900/90">{cleanNote}</span>
              </div>
            </div>
          );
        }

        // List block (starts with - or * or contains line breaks with - )
        const lines = trimmed.split('\n');
        const hasListItems = lines.some((l) => l.trim().startsWith('- ') || l.trim().startsWith('* '));

        if (hasListItems) {
          return (
            <div key={bIdx} className="space-y-2 my-2.5">
              {lines.map((line, lIdx) => {
                const lineTrim = line.trim();
                if (lineTrim.startsWith('- ') || lineTrim.startsWith('* ')) {
                  const content = lineTrim.replace(/^[-*]\s*/, '');
                  // Check if this is a task entry like [08:30 - 10:00] | Title | Priority
                  const timeMatch = content.match(/\[?(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})\]?/);
                  const timeStr = timeMatch ? timeMatch[1] : null;

                  // Priority match [P1 ...] or #1 Cốt Lõi or [P1 - Cốt Lõi]
                  const priorityMatch = content.match(/(P[1-4](\s*-\s*[^\]|\n]+)?|#[1-4]\s*[^\]|\n]+)/i);
                  const priorityStr = priorityMatch ? priorityMatch[0].replace(/[\[\]]/g, '').trim() : null;

                  // Clean title: remove time and priority tokens and pipe separators
                  let cleanTitle = content
                    .replace(/\[?\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\]?/g, '')
                    .replace(/\*\*/g, '');

                  if (priorityStr) {
                    cleanTitle = cleanTitle.replace(priorityStr, '');
                  }

                  cleanTitle = cleanTitle.replace(/^[|\s-]+|[|\s-]+$/g, '').replace(/\|/g, '').trim();

                  return (
                    <div
                      key={lIdx}
                      className="p-3 rounded-xl bg-slate-50/90 hover:bg-slate-100 border border-slate-200/80 transition-all flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 text-xs truncate">
                            {cleanTitle || content.replace(/\*\*/g, '')}
                          </p>
                          {timeStr && (
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{timeStr}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {priorityStr && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200/70">
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

        // Regular paragraph with rich inline formatting
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Chào bạn! Tôi là Atelier Concierge — trợ lý điều hành lịch trình cá nhân. Tôi có thể quét slot trống trên thời khóa biểu, khởi tạo ca việc P1 hoặc gửi cảnh báo sang Telegram. Hôm nay bạn muốn tối ưu kế hoạch nào?',
    },
  ]);

  // Check backend AI readiness on open
  useEffect(() => {
    if (isOpen) {
      getAiStatus().then((status) => {
        setIsAiReady(status.isReady);
      }).catch(() => {
        setIsAiReady(false);
      });
    }
  }, [isOpen]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStatus]);

  if (!isOpen) return null;

  const handleSend = async (userPromptText?: string) => {
    const textToSend = (userPromptText || prompt).trim();
    if (!textToSend || isProcessing) return;

    soundEngine.playSoftClick();
    setPrompt('');

    const userMsgId = 'msg-' + Date.now();
    const aiMsgId = 'ai-' + (Date.now() + 1);

    // 1. Append user message & placeholder AI message
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: textToSend },
      { id: aiMsgId, sender: 'ai', text: '', isStreaming: true },
    ]);

    setIsProcessing(true);
    setCurrentStatus('Atelier Concierge đang phân tích yêu cầu...');

    // 2. Prepare conversation history for Gemini
    const historyPayload = messages
      .filter((m) => m.text.trim())
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

    try {
      await streamAiChat(
        textToSend,
        historyPayload,
        {
          onStatus: (statusPayload) => {
            setCurrentStatus(statusPayload.message);
          },
          onAction: (actionPayload) => {
            if (actionPayload.action === 'TASK_CREATED') {
              soundEngine.playPentatonicChime(4);
              // Dispatch internal Event Bus for Zero-Reload Timetable Sync
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('atelier:task-mutated', {
                    detail: { action: 'TASK_CREATED', task: actionPayload.task },
                  })
                );
              }
              // Attach created task to AI message card
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
        }
      );
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      setCurrentStatus(null);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                text: `Không thể kết nối Atelier Concierge: ${err.message || 'Hệ thống đang bận hoặc có sự cố kết nối'}. Vui lòng thử lại sau giây lát.`,
                isStreaming: false,
              }
            : m
        )
      );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-md sm:max-w-lg bg-[#FAFBFD] shadow-2xl border-l border-[#EEF2F8] flex flex-col justify-between transition-all transform animate-in slide-in-from-right duration-200">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#EEF2F8] bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#1E293B] to-[#334155] text-white flex items-center justify-center font-bold shadow-xs">
            <Bot className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-[#1E2433]">Atelier Concierge</h3>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-medium tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Executive Ready
              </span>
            </div>
            <p className="text-[11px] text-[#8F9CAE]">Điều hành lịch trình & Agentic Multi-RAG</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
              <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-xs bg-[#1E293B] text-white text-[13px] font-medium leading-relaxed shadow-xs border border-slate-700/40">
                {msg.text}
              </div>
            ) : (
              <div className="flex items-start gap-2.5 max-w-[92%]">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#1E293B] to-[#334155] text-white flex items-center justify-center font-bold shadow-xs shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-sky-400" />
                </div>
                <div className="flex-1 p-3.5 sm:p-4 rounded-2xl rounded-tl-xs bg-white text-slate-800 border border-slate-200/80 shadow-xs">
                  {msg.text ? (
                    <AtelierFormattedMessage text={msg.text} />
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                      <span className="text-xs">Đang xử lý và tổng hợp dữ liệu...</span>
                    </div>
                  )}

                  {/* Task Created Confirmation Card */}
                  {msg.createdTask && (
                    <div className="mt-3 p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] space-y-1.5 animate-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-bold text-[11px]">
                          <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                          Đã Lập Lịch Vào Thời Khóa Biểu
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                          {msg.createdTask.priority || '#1 Cốt Lõi'}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-900">{msg.createdTask.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>
                          {msg.createdTask.time_box?.start} - {msg.createdTask.time_box?.end}
                        </span>
                        <span>•</span>
                        <Calendar className="w-3 h-3 text-emerald-600" />
                        <span>{msg.createdTask.scheduled_date || 'Hôm nay'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Live Status Heartbeat (Kills the 2-3s blank wait) */}
        {currentStatus && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-sky-100 text-sky-800 text-[11px] font-medium shadow-2xs animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-sky-500 animate-spin" />
            <span>{currentStatus}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="px-4 py-2 border-t border-[#EEF2F8] bg-[#FAFBFD] shrink-0">
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#8F9CAE] uppercase tracking-wider mb-1.5">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Gợi ý thao tác điều hành nhanh:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_SUGGESTIONS.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(item.prompt)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-[#475569] hover:text-[#0284C7] text-[11px] font-medium border border-[#E2E8F0] hover:border-sky-200 transition-all shrink-0 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                <Icon className="w-3 h-3 text-sky-600" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Field */}
      <div className="p-4 border-t border-[#EEF2F8] bg-white flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder="Nhập yêu cầu xếp lịch hoặc tra cứu kế hoạch..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isProcessing}
          className="flex-1 px-4 py-2.5 text-xs bg-[#F8FAFD] border border-[#CBD5E1] text-[#1E2433] rounded-xl focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] placeholder:text-[#94A3B8]"
        />
        <button
          onClick={() => handleSend()}
          disabled={!prompt.trim() || isProcessing}
          className="p-2.5 bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-xl transition-all shadow-md shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Gửi yêu cầu"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          ) : (
            <Send className="w-4 h-4 text-sky-400" />
          )}
        </button>
      </div>

    </div>
  );
};
