'use client';

import React, { useState } from 'react';
import { Mail, Send, X, Check, Sun, Moon, Loader2, Flame } from 'lucide-react';
import { sendPostcardEmail } from '../lib/api';
import { soundEngine } from '../lib/audio';
import { notify } from '../lib/notificationService';


interface EmailPostcardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailPostcardModal: React.FC<EmailPostcardModalProps> = ({ isOpen, onClose }) => {
  const [emailType, setEmailType] = useState<'sunrise' | 'sunset'>('sunrise');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [recipient, setRecipient] = useState('yaros.tolstykh@cbp.ai');

  if (!isOpen) return null;

  const handleSendTest = async () => {
    try {
      setIsSending(true);
      await sendPostcardEmail({
        recipient,
        type: emailType,
        title: emailType === 'sunrise' ? 'Bưu thiếp Bình Minh' : 'Bưu thiếp Tổng Kết',
        haiku: emailType === 'sunrise' ? 'Nắng sớm rọi trang giấy / Ba ca việc đợi chờ' : 'Đêm buông vầng trăng khuyết / Việc chốt tròn thảnh thơi',
        weather: '24°C Dịu mát',
        tasksSummary: ['09:00 - UI Designers', '09:45 - API Integration', '11:00 - User Testing'],
        streakDays: 14,
      });
      soundEngine.playPentatonicChime(4);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
      }, 3500);
    } catch (err) {
      console.error(err);
      notify.error('Không thể gửi bưu thiếp qua máy chủ backend.');
    } finally {
      setIsSending(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative border border-[#EEF2F8] animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#FFF6DF] text-[#FFB800] flex items-center justify-center font-bold">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-[#1E2433] text-sm">Artisan Email Dispatcher</h3>
            <p className="text-[10px] text-[#8F9CAE]">Bưu Thiếp Email Tự Động Định Kỳ</p>
          </div>
        </div>

        {/* Toggle Type */}
        <div className="flex bg-[#F4F6FA] p-1 rounded-full text-xs font-semibold">
          <button
            onClick={() => setEmailType('sunrise')}
            className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all ${
              emailType === 'sunrise'
                ? 'bg-white text-[#1E2433] font-bold shadow-xs'
                : 'text-[#8F9CAE]'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-[#FFB800]" />
            <span>06:30 Bình Minh</span>
          </button>
          <button
            onClick={() => setEmailType('sunset')}
            className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all ${
              emailType === 'sunset'
                ? 'bg-white text-[#1E2433] font-bold shadow-xs'
                : 'text-[#8F9CAE]'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-[#7B61FF]" />
            <span>22:00 Tổng Kết</span>
          </button>
        </div>

        {/* Postcard Preview Card */}
        <div className="p-4 rounded-2xl bg-[#FFFBF0] border border-[#FFE8A3] space-y-3 font-serif">
          <div className="flex items-center justify-between text-[11px] font-mono not-italic font-bold text-[#D97706] border-b border-[#FDE68A] pb-2">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 stroke-[2]" />
              <span>{emailType === 'sunrise' ? 'BƯU THIẾP BÌNH MINH' : 'BƯU THIẾP TỔNG KẾT'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 stroke-[2]" />
              <span>14 DAYS STREAK</span>
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-sm text-[#1E2433] not-italic">
              {emailType === 'sunrise' ? 'Chào buổi sáng, Yaros!' : 'Tổng kết ngày trọn vẹn!'}
            </h4>
            <p className="text-xs text-[#4A5568] leading-relaxed italic">
              {emailType === 'sunrise'
                ? 'Hôm nay Mascot Nala đã lên sẵn 3 chặng dừng chân cho bạn. Thời tiết ngoài trời 24°C dịu mát.'
                : 'Bạn đã hoàn tất 4/4 ca Deep Work hôm nay. Hãy nghỉ ngơi thật ngon nhé.'}
            </p>
          </div>

          <div className="p-3 bg-white/90 rounded-xl text-xs text-[#2D3748] space-y-1.5 not-italic border border-[#FDE68A]">
            <p className="font-mono text-[10px] font-bold text-[#B45309]">3 Ca Trọng Tâm Hôm Nay:</p>
            <ul className="space-y-1 text-[#4A5568] font-mono text-[11px]">
              <li>• 09:00 - UI Designers: Redesign App</li>
              <li>• 09:45 - API Integration Service</li>
              <li>• 11:00 - User Testing & Benchmark</li>
            </ul>
          </div>
        </div>

        {/* Send Action */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="flex-1 px-4 py-2 text-xs bg-[#F4F6FA] border border-[#EEF2F8] text-[#1E2433] rounded-full focus:outline-none focus:ring-2 focus:ring-[#4880FF]/30"
            />
            <button
              onClick={handleSendTest}
              disabled={isSending}
              className="px-5 py-2 bg-[#1E2433] hover:bg-[#2B3448] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-xs disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi Thử</span>
                </>
              )}
            </button>
          </div>

          {sentSuccess && (
            <p className="text-xs text-emerald-600 font-bold flex items-center justify-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Đã lưu & gửi thành công bưu thiếp tới {recipient}!</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
