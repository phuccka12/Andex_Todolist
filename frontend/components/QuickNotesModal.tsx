'use client';

import React, { useState, useEffect } from 'react';
import { X, StickyNote, Plus, Trash2, Check, ArrowRight, Sparkles } from 'lucide-react';
import { soundEngine } from '../lib/audio';
import { notify } from '../lib/notificationService';


interface QuickNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConvertToTask: (title: string) => void;
}

export const QuickNotesModal: React.FC<QuickNotesModalProps> = ({
  isOpen,
  onClose,
  onConvertToTask,
}) => {
  const [content, setContent] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cbp_scratchpad_notes') || localStorage.getItem('chrono_scratchpad_notes');
      if (saved) {
        setContent(saved);
      }
    } catch {}
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    try {
      localStorage.setItem('cbp_scratchpad_notes', val);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 1500);
    } catch {}
  };

  const handleConvertSelection = () => {
    if (!content.trim()) return;
    const firstLine = content.trim().split('\n')[0];
    onConvertToTask(firstLine);
    soundEngine.playSoftClick();
    onClose();
  };

  if (!isOpen) return null;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFDF7] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-[6px_6px_0px_#0F172A] relative border-2 border-[#0F172A] animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] hover:bg-[#FFE4E6] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#0F172A]/15 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] text-[#E11D48] flex items-center justify-center font-bold shadow-[2px_2px_0px_#0F172A]">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#0F172A]">Sổ Tay Ghi Chú Nhanh (Scratchpad)</h3>
              <p className="text-[10px] font-bold text-slate-600">Lưu nhanh ý tưởng, ghi chú tức thời & tự động đồng bộ</p>
            </div>
          </div>

          {savedSuccess && (
            <span className="text-[10px] font-black text-[#0F172A] bg-[#DCFCE7] border border-[#0F172A] px-2.5 py-0.5 rounded-full shadow-[1px_1px_0px_#0F172A] animate-in fade-in">
              Đã lưu
            </span>
          )}
        </div>

        {/* Notepad Textarea */}
        <div className="space-y-1.5">
          <textarea
            value={content}
            onChange={handleChange}
            placeholder="Viết nhanh bất kỳ ý tưởng, snippet hoặc danh sách việc cần làm vào đây..."
            rows={10}
            className="w-full p-4 bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] rounded-2xl text-xs font-mono font-semibold text-[#0F172A] leading-relaxed focus:bg-[#FFF1F2] focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 px-1">
            <span>{wordCount} từ • {charCount} ký tự</span>
            <span>Tự động lưu vào bộ nhớ cục bộ</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-[#0F172A]/15">
          <button
            onClick={async () => {
              const confirmed = await notify.confirm('Bạn có chắc chắn muốn xóa sạch toàn bộ nội dung sổ tay này?', {
                title: 'Xóa Sổ Tay',
                confirmText: 'Xóa trắng',
                type: 'warning',
              });
              if (confirmed) {
                setContent('');
                localStorage.removeItem('cbp_scratchpad_notes');
                localStorage.removeItem('chrono_scratchpad_notes');
                await notify.success('Đã làm trống sổ tay.');
              }
            }}
            className="px-3.5 py-2 bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            Xóa trắng
          </button>

          <button
            onClick={handleConvertSelection}
            disabled={!content.trim()}
            className="px-4 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer active:translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Tạo Task từ dòng đầu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
