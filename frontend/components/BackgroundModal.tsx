'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Trash2,
  Sliders,
  Sparkles,
  Eye,
  RefreshCw,
  Crop,
} from 'lucide-react';
import { UserProfileData } from '../lib/types';
import { PRESET_BACKGROUNDS } from '../lib/profileStorage';
import { soundEngine } from '../lib/audio';
import { ImageCropperModal } from './ImageCropperModal';
import { notify } from '../lib/notificationService';


interface BackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfileData;
  onUpdateBackground: (updates: {
    background: string;
    applyAppBackground: boolean;
    backgroundBlur?: number;
    backgroundOpacity?: number;
  }) => void;
}

export const BackgroundModal: React.FC<BackgroundModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateBackground,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewBg, setPreviewBg] = useState<string>(profile.background || '');
  const [blur, setBlur] = useState<number>(profile.backgroundBlur ?? 10);
  const [opacity, setOpacity] = useState<number>(profile.backgroundOpacity ?? 0.7);
  const [successToast, setSuccessToast] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState('');

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      notify.warning('Vui lòng chọn file hình ảnh (PNG, JPG, WebP, SVG)', 'Định Dạng Không Hợp Lệ');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      notify.warning('File ảnh quá lớn, vui lòng chọn ảnh dưới 15MB', 'Ảnh Quá Lớn');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCropperSrc(dataUrl);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmCrop = (croppedUrl: string) => {
    setPreviewBg(croppedUrl);
    onUpdateBackground({
      background: croppedUrl,
      applyAppBackground: true,
      backgroundBlur: blur,
      backgroundOpacity: opacity,
    });
    setCropperOpen(false);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 2000);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleSelectPreset = (url: string) => {
    setPreviewBg(url);
    onUpdateBackground({
      background: url,
      applyAppBackground: true,
      backgroundBlur: blur,
      backgroundOpacity: opacity,
    });
    soundEngine.playSoftClick();
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 1500);
  };

  const handleRemoveBackground = () => {
    setPreviewBg('');
    onUpdateBackground({
      background: '',
      applyAppBackground: false,
    });
    soundEngine.playSoftClick();
  };

  const handleBlurChange = (val: number) => {
    setBlur(val);
    if (previewBg) {
      onUpdateBackground({
        background: previewBg,
        applyAppBackground: true,
        backgroundBlur: val,
        backgroundOpacity: opacity,
      });
    }
  };

  const handleOpacityChange = (val: number) => {
    setOpacity(val);
    if (previewBg) {
      onUpdateBackground({
        background: previewBg,
        applyAppBackground: true,
        backgroundBlur: blur,
        backgroundOpacity: val,
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-[24px] sm:rounded-[28px] max-w-lg w-full max-h-[90vh] shadow-2xl relative border border-[#EEF2F8] animate-in zoom-in-95 duration-200 flex flex-col my-auto overflow-hidden">
          {/* Header - Fixed */}
          <div className="px-5 sm:px-6 py-4 border-b border-[#EEF2F8] shrink-0 bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shadow-xs shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#1E2433]">Tùy Chỉnh Hình Nền (Background)</h3>
                <p className="text-[11px] text-[#8F9CAE]">Tự tải ảnh cá nhân từ máy tính hoặc chọn bộ sưu tập</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
            {/* Primary Feature: Upload Your Own Image from Computer */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold text-[#1E2433] flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-[#3B82F6]" />
                  <span>Tải Lên Ảnh Nền Của Bạn (Từ Máy Tính)</span>
                </label>
                {previewBg && (
                  <button
                    onClick={handleRemoveBackground}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Gỡ ảnh nền</span>
                  </button>
                )}
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all relative overflow-hidden group ${
                  isDragging
                    ? 'border-[#3B82F6] bg-[#EFF6FF] scale-[1.01]'
                    : 'border-[#CBD5E1] hover:border-[#3B82F6] bg-[#F8FAFD] hover:bg-[#F0F7FF]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                <div className="space-y-1.5 relative z-10">
                  <div className="w-11 h-11 rounded-full bg-white shadow-md mx-auto flex items-center justify-center text-[#3B82F6] group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#1E2433] block">
                      Bấm để chọn file ảnh hoặc Kéo thả ảnh vào đây
                    </span>
                    <span className="text-[11px] text-[#64748B] block mt-0.5">
                      Hỗ trợ PNG, JPG, JPEG, WebP, GIF, SVG (Tối đa 15MB)
                    </span>
                  </div>
                </div>

                {/* Live background preview thumbnail in box if present */}
                {previewBg && (
                  <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-10 rounded-lg overflow-hidden border border-white shadow-xs">
                        <img src={previewBg} alt="Active bg" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Đang áp dụng hình nền này
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCropperSrc(previewBg);
                        setCropperOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#2563EB] hover:bg-blue-100 text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>Sửa & Cắt ảnh</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sliders for Blur and Opacity */}
            {previewBg && (
              <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#475569] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span>Độ mờ kính (Blur):</span>
                  </span>
                  <span className="font-black text-[#3B82F6]">{blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={blur}
                  onChange={(e) => handleBlurChange(parseInt(e.target.value, 10))}
                  className="w-full accent-[#3B82F6]"
                />

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-[#475569]">Độ trong suốt nền (Opacity):</span>
                  <span className="font-black text-[#3B82F6]">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  className="w-full accent-[#3B82F6]"
                />
              </div>
            )}

            {/* Preset Gallery */}
            <div>
              <span className="text-[11px] font-bold text-[#64748B] block mb-2">
                Hoặc chọn hình nền tuyển chọn sẵn:
              </span>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => handleSelectPreset(bg.url)}
                    className={`relative rounded-xl overflow-hidden h-14 border-2 transition-all group ${
                      previewBg === bg.url
                        ? 'border-[#3B82F6] ring-2 ring-blue-200'
                        : 'border-transparent hover:border-slate-300'
                    }`}
                    title={bg.label}
                  >
                    <img src={bg.url} alt={bg.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 flex items-end p-1">
                      <span className="text-[8px] font-bold text-white truncate w-full block text-left">
                        {bg.label}
                      </span>
                    </div>
                    {previewBg === bg.url && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#3B82F6] text-white flex items-center justify-center">
                        <Check className="w-2 h-2" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between border-t border-[#EEF2F8] shrink-0 bg-white">
            <div>
              {successToast && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" /> Đã cập nhật ảnh nền!
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-[#1E2433] hover:bg-[#2B3448] text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Xong
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperSrc}
        cropType="wallpaper"
        title="Chỉnh Sửa & Cắt Ảnh Nền (Wallpaper)"
        onClose={() => setCropperOpen(false)}
        onConfirmCrop={handleConfirmCrop}
      />
    </>
  );
};
