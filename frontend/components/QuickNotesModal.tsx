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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-[#EEF2F8] animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ECE9FE] text-[#7B61FF] flex items-center justify-center font-bold shadow-xs">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1E2433]">Sổ Tay Ghi Chú Nhanh (Scratchpad)</h3>
              <p className="text-[10px] text-[#8F9CAE]">Lưu nhanh ý tưởng, ghi chú tức thời & tự động đồng bộ</p>
            </div>
          </div>

          {savedSuccess && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-in fade-in">
              Đã lưu
            </span>
          )}
        </div>

        {/* Notepad Textarea */}
        <div className="space-y-1">
          <textarea
            value={content}
            onChange={handleChange}
            placeholder="Viết nhanh bất kỳ ý tưởng, snippet hoặc danh sách việc cần làm vào đây..."
            rows={10}
            className="w-full p-4 bg-[#F8FAFD] border border-[#E2E8F0] rounded-2xl text-xs font-mono text-[#1E2433] leading-relaxed focus:outline-none focus:border-[#3B82F6] focus:bg-white resize-none shadow-inner"
          />
          <div className="flex items-center justify-between text-[10px] text-[#8F9CAE] px-1">
            <span>{wordCount} từ • {charCount} ký tự</span>
            <span>Tự động lưu vào bộ nhớ cục bộ</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-[#EEF2F8]">
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
            className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors cursor-pointer"
          >
            Xóa trắng
          </button>

          <button
            onClick={handleConvertSelection}
            disabled={!content.trim()}
            className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Task từ dòng đầu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
