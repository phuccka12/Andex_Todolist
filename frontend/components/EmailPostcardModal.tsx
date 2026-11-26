'use client';

import React, { useState } from 'react';
import { Mail, Send, X, Check, Sun, Moon, Loader2, Flame } from 'lucide-react';
import { sendPostcardEmail } from '../lib/api';
import { authService } from '../lib/authService';
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
  const [recipient, setRecipient] = useState(() => authService.getCachedUser()?.email || '');

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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFDF7] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-[6px_6px_0px_#0F172A] relative border-2 border-[#0F172A] animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] hover:bg-[#FFE4E6] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-3 border-b-2 border-[#0F172A]/15">
          <div className="w-10 h-10 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#E11D48] flex items-center justify-center font-bold">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-[#0F172A] text-sm">Artisan Email Dispatcher</h3>
            <p className="text-[10px] font-bold text-slate-600">Bưu Thiếp Email Tự Động Định Kỳ</p>
          </div>
        </div>

        {/* Toggle Type */}
        <div className="flex bg-[#FFF1F2] p-1.5 rounded-2xl border-2 border-[#0F172A] gap-1 text-xs font-black">
          <button
            onClick={() => setEmailType('sunrise')}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              emailType === 'sunrise'
                ? 'bg-[#FEF9C3] text-[#0F172A] border border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-[#E11D48]" />
            <span>06:30 Bình Minh</span>
          </button>
          <button
            onClick={() => setEmailType('sunset')}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              emailType === 'sunset'
                ? 'bg-[#E11D48] text-white border border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>22:00 Tổng Kết</span>
          </button>
        </div>

        {/* Postcard Preview Card */}
        <div className="p-4 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-3 font-serif">
          <div className="flex items-center justify-between text-[11px] font-mono not-italic font-black text-[#E11D48] border-b-2 border-[#0F172A]/20 pb-2">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{emailType === 'sunrise' ? 'BƯU THIẾP BÌNH MINH' : 'BƯU THIẾP TỔNG KẾT'}</span>
            </span>
            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-[#0F172A] text-[#0F172A]">
              <Flame className="w-3 h-3 fill-[#E11D48] text-[#E11D48]" />
              <span>14 DAYS STREAK</span>
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="font-black text-sm text-[#0F172A] not-italic">
              {emailType === 'sunrise'
                ? `Chào buổi sáng, ${authService.getCachedUser()?.name?.split(' ')[0] || 'Bạn'}!`
                : 'Tổng kết ngày trọn vẹn!'}
            </h4>
            <p className="text-xs text-[#0F172A]/85 leading-relaxed italic font-medium">
              {emailType === 'sunrise'
                ? 'Hôm nay Mascot Nala đã lên sẵn 3 chặng dừng chân cho bạn. Thời tiết ngoài trời 24°C dịu mát.'
                : 'Bạn đã hoàn tất 4/4 ca Deep Work hôm nay. Hãy nghỉ ngơi thật ngon nhé.'}
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl text-xs text-[#0F172A] space-y-1.5 not-italic border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]">
            <p className="font-mono text-[10px] font-black text-[#E11D48]">3 Ca Trọng Tâm Hôm Nay:</p>
            <ul className="space-y-1 text-[#0F172A] font-mono font-semibold text-[11px]">
              <li>• 09:00 - UI Designers: Redesign App</li>
              <li>• 09:45 - API Integration Service</li>
              <li>• 11:00 - User Testing & Benchmark</li>
            </ul>
          </div>
        </div>

        {/* Send Action */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Nhập địa chỉ email nhận bưu thiếp..."
              className="flex-1 px-3.5 py-2 text-xs bg-white border-2 border-[#0F172A] rounded-xl text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none"
            />
            <button
              onClick={handleSendTest}
              disabled={isSending}
              className="px-5 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:translate-y-0.5 disabled:opacity-50"
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
            <p className="text-xs text-[#0F172A] bg-[#DCFCE7] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] px-3 py-1.5 rounded-xl font-black flex items-center justify-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Đã lưu & gửi thành công bưu thiếp tới {recipient}!</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
