'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { notify, DialogOptions } from '../lib/notificationService';
import { soundEngine } from '../lib/audio';

export const GlobalNotificationModal: React.FC = () => {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [resolver, setResolver] = useState<((val: boolean) => void) | null>(null);

  useEffect(() => {
    const unregister = notify.register((options, resolve) => {
      setDialog(options);
      setResolver(() => resolve);

      if (options) {
        if (options.type === 'success') {
          soundEngine.playPentatonicChime(4);
        } else {
          soundEngine.playSoftClick();
        }
      }
    });

    return unregister;
  }, []);

  const handleClose = useCallback(
    (confirmed: boolean) => {
      if (resolver) {
        resolver(confirmed);
      }
      setDialog(null);
      setResolver(null);
    },
    [resolver]
  );

  // Keyboard shortcut listener (Enter = confirm, Escape = cancel)
  useEffect(() => {
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, handleClose]);

  if (!dialog) return null;

  const type = dialog.type || 'info';

  const typeConfig = {
    success: {
      bg: 'bg-[#DCFCE7] text-[#15803D] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]',
      btn: 'bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]',
      icon: CheckCircle2,
      badge: 'Thành Công',
      badgeClass: 'text-[#0F172A] bg-[#DCFCE7] border border-[#0F172A]',
    },
    error: {
      bg: 'bg-[#FFE4E6] text-[#E11D48] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]',
      btn: 'bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]',
      icon: AlertTriangle,
      badge: 'Thông Báo Lỗi',
      badgeClass: 'text-[#E11D48] bg-[#FFE4E6] border border-[#0F172A]',
    },
    warning: {
      bg: 'bg-[#FEF9C3] text-[#B45309] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]',
      btn: 'bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]',
      icon: AlertCircle,
      badge: 'Cảnh Báo',
      badgeClass: 'text-[#0F172A] bg-[#FEF9C3] border border-[#0F172A]',
    },
    info: {
      bg: 'bg-[#FFF1F2] text-[#E11D48] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]',
      btn: 'bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]',
      icon: Info,
      badge: 'Thông Báo',
      badgeClass: 'text-[#0F172A] bg-[#FEF9C3] border border-[#0F172A]',
    },
  }[type];

  const IconComponent = typeConfig.icon;

  return (
    <div className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#FFFDF7] rounded-3xl max-w-sm w-full p-6 shadow-[6px_6px_0px_#0F172A] border-2 border-[#0F172A] animate-in zoom-in-95 duration-150 relative space-y-4">
        
        {/* Dismiss Button */}
        <button
          onClick={() => handleClose(false)}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] hover:bg-[#FFE4E6] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${typeConfig.bg}`}>
            <IconComponent className="w-5 h-5 stroke-[2.5]" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-mono font-black ${typeConfig.badgeClass}`}>
                {typeConfig.badge}
              </span>
            </div>
            <h3 className="font-black text-sm text-[#0F172A] leading-snug">
              {dialog.title}
            </h3>
          </div>
        </div>

        {/* Modal Content */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
          <p className="text-xs font-semibold text-[#0F172A] leading-relaxed whitespace-pre-wrap">
            {dialog.message}
          </p>
        </div>

        {/* Actions */}
        <div className="pt-1 flex items-center justify-end gap-2">
          {dialog.isConfirm ? (
            <>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#FEF9C3] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black transition-all cursor-pointer"
              >
                {dialog.cancelText || 'Hủy bỏ'}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer active:translate-y-0.5 ${typeConfig.btn}`}
              >
                {dialog.confirmText || 'Đồng ý'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleClose(true)}
              className="w-full py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black transition-all cursor-pointer active:translate-y-0.5"
            >
              {dialog.confirmText || 'Đã hiểu'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
