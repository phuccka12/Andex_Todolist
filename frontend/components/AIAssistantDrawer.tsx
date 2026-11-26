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
  text: 'Chào bạn! Mình là **Gencoore AI** — người bạn đồng hành sắp xếp thời gian của bạn.\n\nMình có thể tìm khung giờ rảnh trên lịch, tạo nhanh ca việc ưu tiên hoặc gửi nhắc nhở qua Telegram. Hôm nay bạn muốn mình hỗ trợ việc gì nào?',
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
    return 'bg-rose-50 text-[#E11D48] border-rose-200/80';
  }
  if (lower.includes('2') || lower.includes('quan trọng')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/80';
  }
  return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
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
            className={`inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full border mx-1 align-baseline ${getPriorityStyle(cleanPriority)}`}
          >
            {cleanPriority}
          </span>
        );
      }

      if (/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(inner)) {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-lg bg-rose-50 text-[#E11D48] border border-rose-200/70 mx-1 align-baseline"
          >
            <Clock className="w-3 h-3 text-[#E11D48]" />
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
    <div className="space-y-2.5 text-[13.5px] leading-[1.65] text-slate-700 font-normal">
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
              className="p-3.5 rounded-2xl bg-amber-50/85 border border-amber-200/75 text-slate-700 text-xs flex items-start gap-2.5 my-2 shadow-2xs"
            >
              <div className="w-6 h-6 rounded-xl bg-white border border-amber-200/80 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold text-amber-900 block mb-0.5">Gợi ý nhỏ</span>
                <span className="text-slate-600">{cleanNote}</span>
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
                      <div key={lIdx} className="flex items-start gap-2.5 pl-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-2.5" />
                        <p className="text-[13.5px] text-slate-700 leading-[1.65] flex-1">
                          {renderInlineTokens(content)}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={lIdx}
                      className="p-3 rounded-2xl bg-[#FFF9FA] hover:bg-[#FFF1F2] border border-rose-100/90 shadow-2xs transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 text-[12.5px] leading-snug">
                            {cleanTitle || content.replace(/\*\*/g, '')}
                          </p>
                          {timeStr && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-[#E11D48] bg-white border border-rose-100 px-2 py-0.5 rounded-lg mt-1">
                              <Clock className="w-3 h-3 text-[#E11D48]" />
                              <span>{timeStr}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {priorityStr && (
                        <span
                          className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${getPriorityStyle(priorityStr)}`}
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([INITIAL_WELCOME_MSG]);

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
    <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-md sm:max-w-lg bg-gradient-to-b from-[#FFFDFB] via-[#FFF9F8] to-[#FFF5F6] shadow-[-12px_0_36px_-8px_rgba(15,23,42,0.14)] border-l border-rose-200/80 flex flex-col justify-between transition-all transform animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-rose-100 bg-gradient-to-r from-[#FFF1F2] via-[#FFF8F6] to-[#FEFCE8] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white border border-rose-200/80 p-1.5 flex items-center justify-center shadow-sm shadow-rose-500/10 relative shrink-0">
            <img src="/images/logo-mark.png" alt="Gencoore AI" className="w-full h-full object-contain" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-900">Gencoore AI</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border ${
                  isAiReady
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : 'bg-amber-50 text-amber-700 border-amber-200/80'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAiReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {isAiReady ? 'Sẵn sàng' : 'Đang đồng bộ'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Trợ lý đồng hành sắp xếp thời gian</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetChat}
            disabled={isProcessing}
            className="p-2 rounded-xl bg-white/80 border border-rose-100 text-slate-500 hover:text-[#E11D48] hover:bg-white shadow-2xs transition-all cursor-pointer disabled:opacity-40"
            title="Cuộc trò chuyện mới"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/80 border border-rose-100 text-slate-500 hover:text-[#E11D48] hover:bg-white shadow-2xs transition-all cursor-pointer"
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
              <div className="max-w-[82%] px-4 py-2.5 rounded-3xl rounded-tr-md bg-gradient-to-br from-[#FB7185] via-[#E11D48] to-[#BE123C] text-white shadow-md shadow-rose-500/20 text-[13.5px] font-medium leading-relaxed">
                {msg.text}
              </div>
            ) : (
              <div className="flex items-start gap-2.5 max-w-[92%]">
                <div className="w-8 h-8 rounded-full bg-[#FFF1F2] border border-rose-200 p-1.5 flex items-center justify-center shadow-2xs shrink-0 mt-0.5">
                  <img src="/images/logo-mark.png" alt="AI" className="block w-full h-full object-contain" />
                </div>
                <div className="flex-1 px-4 py-3.5 rounded-3xl rounded-tl-md bg-white text-slate-700 border border-rose-100/90 shadow-[0_4px_20px_-4px_rgba(225,29,72,0.08)]">
                  {msg.text ? (
                    <GencooreFormattedMessage text={msg.text} />
                  ) : (
                    <div className="flex items-center gap-2 text-[#E11D48] py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs font-medium text-slate-500">
                        Đang kiểm tra lịch và chuẩn bị câu trả lời...
                      </span>
                    </div>
                  )}

                  {/* Task Created Confirmation Card */}
                  {msg.createdTask && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 shadow-2xs text-emerald-950 space-y-1.5 animate-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-semibold text-xs text-emerald-800">
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          Đã thêm vào lịch Gencoore!
                        </span>
                        <span className="text-[10.5px] font-semibold bg-white text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {msg.createdTask.priority || '#1 Cốt Lõi'}
                        </span>
                      </div>
                      <p className="font-semibold text-[13px] text-slate-900">{msg.createdTask.title}</p>
                      <div className="flex items-center gap-2 text-[11.5px] text-emerald-700 font-medium">
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

        {/* Live Status Heartbeat */}
        {currentStatus && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-rose-100 shadow-sm text-[#E11D48] text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#E11D48] animate-pulse" />
            <span>{currentStatus}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="px-4 py-3 border-t border-rose-100 bg-[#FFF8F9]/90 shrink-0">
        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-rose-500 uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3 text-[#E11D48]" />
          <span>Gợi ý nhanh cho bạn</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_SUGGESTIONS.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(item.prompt)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#FFF1F2] text-slate-700 hover:text-[#E11D48] text-[11.5px] font-medium border border-rose-200/80 shadow-2xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
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
        className="p-3.5 sm:p-4 border-t border-rose-100 bg-white/95 flex items-center gap-2 shrink-0"
        style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
      >
        <input
          type="text"
          placeholder="Nhắn với Gencoore AI (vd: Xếp lịch học tối nay 19:30)..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isProcessing}
          className="flex-1 px-4 py-2.5 text-[13px] bg-[#FFF9FA] border border-rose-200/80 rounded-2xl text-slate-800 font-normal focus:bg-white focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 focus:outline-none placeholder:text-slate-400 transition-all"
        />
        <button
          onClick={() => handleSend()}
          disabled={!prompt.trim() || isProcessing}
          className="p-2.5 bg-gradient-to-br from-[#FB7185] to-[#E11D48] hover:from-[#F43F5E] hover:to-[#BE123C] text-white shadow-sm shadow-rose-500/25 rounded-2xl transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer active:scale-95"
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
