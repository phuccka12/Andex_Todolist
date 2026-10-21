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
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
      icon: CheckCircle2,
      badge: 'Thành Công',
      badgeClass: 'text-emerald-700 bg-emerald-100 border-emerald-200',
    },
    error: {
      bg: 'bg-rose-50 text-rose-600 border-rose-100',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20',
      icon: AlertTriangle,
      badge: 'Thông Báo Lỗi',
      badgeClass: 'text-rose-700 bg-rose-100 border-rose-200',
    },
    warning: {
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
      icon: AlertCircle,
      badge: 'Cảnh Báo',
      badgeClass: 'text-amber-800 bg-amber-100 border-amber-200',
    },
    info: {
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
      btn: 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-blue-500/20',
      icon: Info,
      badge: 'Thông Báo',
      badgeClass: 'text-blue-700 bg-blue-100 border-blue-200',
    },
  }[type];

  const IconComponent = typeConfig.icon;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#EEF2F8] animate-in zoom-in-95 duration-150 relative space-y-4">
        
        {/* Dismiss Button */}
        <button
          onClick={() => handleClose(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${typeConfig.bg}`}>
            <IconComponent className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${typeConfig.badgeClass}`}>
                {typeConfig.badge}
              </span>
            </div>
            <h3 className="font-extrabold text-sm text-[#1E2433] leading-snug">
              {dialog.title}
            </h3>
          </div>
        </div>

        {/* Modal Content */}
        <div className="bg-[#FAFBFD] p-3.5 rounded-2xl border border-[#EEF2F8]">
          <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-wrap">
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E2433] hover:bg-slate-100 transition-all cursor-pointer"
              >
                {dialog.cancelText || 'Hủy bỏ'}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${typeConfig.btn}`}
              >
                {dialog.confirmText || 'Đồng ý'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleClose(true)}
              className="w-full py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-bold transition-all shadow-md shadow-slate-900/10 cursor-pointer"
            >
              {dialog.confirmText || 'Đã hiểu'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
