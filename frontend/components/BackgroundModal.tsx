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
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-[#FFFDF7] rounded-3xl max-w-lg w-full max-h-[90vh] shadow-[6px_6px_0px_#0F172A] relative border-2 border-[#0F172A] animate-in zoom-in-95 duration-200 flex flex-col my-auto overflow-hidden">
          {/* Header - Fixed */}
          <div className="px-5 sm:px-6 py-4 border-b-2 border-[#0F172A] shrink-0 bg-[#FFF1F2] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] text-[#E11D48] flex items-center justify-center shadow-[2px_2px_0px_#0F172A] shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-[#0F172A]">Tùy Chỉnh Hình Nền (Background)</h3>
                <p className="text-[11px] text-slate-600 font-bold">Tự tải ảnh cá nhân từ máy tính hoặc chọn bộ sưu tập</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] hover:bg-[#FFE4E6] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
            {/* Primary Feature: Upload Your Own Image from Computer */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-[#E11D48]" />
                  <span>Tải Lên Ảnh Nền Của Bạn (Từ Máy Tính)</span>
                </label>
                {previewBg && (
                  <button
                    onClick={handleRemoveBackground}
                    className="px-2.5 py-1 rounded-lg bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border border-[#0F172A] text-[11px] font-black flex items-center gap-1 transition-colors cursor-pointer"
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
                className={`border-2 border-dashed border-[#0F172A] rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all relative overflow-hidden group shadow-[3px_3px_0px_#0F172A] ${
                  isDragging
                    ? 'bg-[#FEF9C3] scale-[1.01]'
                    : 'bg-white hover:bg-[#FFF1F2]'
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
                  <div className="w-11 h-11 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] mx-auto flex items-center justify-center text-[#E11D48] group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-[#0F172A] block">
                      Bấm để chọn file ảnh hoặc Kéo thả ảnh vào đây
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 block mt-0.5">
                      Hỗ trợ PNG, JPG, JPEG, WebP, GIF, SVG (Tối đa 15MB)
                    </span>
                  </div>
                </div>

                {/* Live background preview thumbnail in box if present */}
                {previewBg && (
                  <div className="mt-3 pt-3 border-t-2 border-[#0F172A]/15 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-10 rounded-lg overflow-hidden border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]">
                        <img src={previewBg} alt="Active bg" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[11px] font-black text-[#0F172A] bg-[#DCFCE7] border border-[#0F172A] px-2 py-0.5 rounded-full flex items-center gap-1">
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
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#FEF9C3] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Crop className="w-3.5 h-3.5 text-[#E11D48]" />
                      <span>Sửa & Cắt ảnh</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sliders for Blur and Opacity */}
            {previewBg && (
              <div className="p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-[#0F172A] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#E11D48]" />
                    <span>Độ mờ kính (Blur):</span>
                  </span>
                  <span className="font-black text-[#E11D48] bg-[#FFF1F2] border border-[#0F172A] px-2 py-0.5 rounded-md">{blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={blur}
                  onChange={(e) => handleBlurChange(parseInt(e.target.value, 10))}
                  className="w-full accent-[#E11D48] cursor-pointer"
                />

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-black text-[#0F172A]">Độ trong suốt nền (Opacity):</span>
                  <span className="font-black text-[#E11D48] bg-[#FFF1F2] border border-[#0F172A] px-2 py-0.5 rounded-md">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  className="w-full accent-[#E11D48] cursor-pointer"
                />
              </div>
            )}

            {/* Preset Gallery */}
            <div>
              <span className="text-xs font-black text-[#0F172A] block mb-2">
                Hoặc chọn hình nền tuyển chọn sẵn:
              </span>
              <div className="grid grid-cols-5 gap-2 pb-1">
                {PRESET_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => handleSelectPreset(bg.url)}
                    className={`relative rounded-xl overflow-hidden h-14 border-2 border-[#0F172A] transition-all group cursor-pointer ${
                      previewBg === bg.url
                        ? 'ring-2 ring-[#E11D48] shadow-[3px_3px_0px_#E11D48] -translate-y-0.5'
                        : 'shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5'
                    }`}
                    title={bg.label}
                  >
                    <img src={bg.url} alt={bg.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 flex items-end p-1">
                      <span className="text-[8px] font-black text-white truncate w-full block text-left">
                        {bg.label}
                      </span>
                    </div>
                    {previewBg === bg.url && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#E11D48] border border-[#0F172A] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between border-t-2 border-[#0F172A] shrink-0 bg-[#FFFDF7]">
            <div>
              {successToast && (
                <span className="text-xs font-black text-[#0F172A] bg-[#DCFCE7] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] px-2.5 py-1 rounded-full flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Đã cập nhật ảnh nền!
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black transition-all cursor-pointer active:translate-y-0.5"
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
