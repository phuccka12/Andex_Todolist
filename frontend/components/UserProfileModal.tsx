'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Check,
  Flame,
  Sparkles,
  Sliders,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Crop,
  Loader2,
  Cloud,
} from 'lucide-react';
import { TaskItem, UserProfileData } from '../lib/types';
import { PRESET_BACKGROUNDS } from '../lib/profileStorage';
import { calculateRealStreak } from '../lib/streakService';
import { soundEngine } from '../lib/audio';
import { ImageCropperModal } from './ImageCropperModal';
import { compressImageDataUrl } from '../lib/imageUtils';
import { notify } from '../lib/notificationService';

import { uploadImageToCloud } from '../lib/uploadService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  profile: UserProfileData;
  onSaveProfile: (profile: UserProfileData) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  tasks,
  profile,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<UserProfileData>({ ...profile });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'background'>('info');
  const [isUploadingCloud, setIsUploadingCloud] = useState(false);

  // Keep formData strictly in sync whenever modal opens or profile changes from parent/cloud
  useEffect(() => {
    if (isOpen && profile) {
      setFormData({ ...profile });
    }
  }, [isOpen, profile]);

  const [cropper, setCropper] = useState<{
    isOpen: boolean;
    imageSrc: string;
    cropType: 'circle' | 'banner' | 'wallpaper';
    title: string;
    target: 'avatar' | 'cover' | 'background';
  }>({
    isOpen: false,
    imageSrc: '',
    cropType: 'circle',
    title: '',
    target: 'avatar',
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const doneCount = tasks.filter((t) => t.column === 'done').length;
  const totalMinutes = tasks.reduce((acc, t) => acc + (t.time_box?.duration_minutes || 90), 0);
  const realStreak = calculateRealStreak(tasks);

  // Handle avatar upload -> Open Cropper
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      notify.warning('Vui lòng chọn ảnh có kích thước dưới 15MB', 'Ảnh Quá Lớn');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setCropper({
        isOpen: true,
        imageSrc: result,
        cropType: 'circle',
        title: 'Chỉnh Sửa & Cắt Ảnh Đại Diện (Avatar)',
        target: 'avatar',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle cover upload -> Compress, immediately preview, auto-save & open Cropper
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      notify.warning('Vui lòng chọn ảnh bìa dưới 15MB', 'Ảnh Quá Lớn');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      if (!result) return;
      // Compress immediately to prevent QuotaExceeded on localStorage
      const compressed = await compressImageDataUrl(result, 1200, 500, 0.82);
      const updated = { ...formData, cover: compressed };
      setFormData(updated);
      onSaveProfile(updated);
      soundEngine.playSoftClick();

      // Open cropper so user can adjust framing if desired
      setCropper({
        isOpen: true,
        imageSrc: compressed,
        cropType: 'banner',
        title: 'Chỉnh Sửa & Cắt Ảnh Bìa (Cover Banner)',
        target: 'cover',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle custom app background upload -> Open Cropper
  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      notify.warning('Vui lòng chọn ảnh nền dưới 15MB', 'Ảnh Quá Lớn');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      if (!result) return;
      const compressed = await compressImageDataUrl(result, 1600, 900, 0.80);
      setCropper({
        isOpen: true,
        imageSrc: compressed,
        cropType: 'wallpaper',
        title: 'Chỉnh Sửa & Cắt Hình Nền Toàn App',
        target: 'background',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmCrop = async (croppedDataUrl: string) => {
    const isAvatar = cropper.target === 'avatar';
    const optimized = await compressImageDataUrl(
      croppedDataUrl,
      isAvatar ? 300 : 1200,
      isAvatar ? 300 : 500,
      0.82
    );

    // Immediate preview
    setFormData((prev) => {
      let updated = { ...prev };
      if (cropper.target === 'avatar') {
        updated.avatar = optimized;
      } else if (cropper.target === 'cover') {
        updated.cover = optimized;
      } else if (cropper.target === 'background') {
        updated.background = optimized;
        updated.applyAppBackground = true;
      }
      onSaveProfile(updated);
      return updated;
    });
    setCropper((prev) => ({ ...prev, isOpen: false }));
    soundEngine.playPentatonicChime(4);

    // Upload to Cloudinary
    setIsUploadingCloud(true);
    const folder = cropper.target === 'avatar' ? 'avatars' : cropper.target === 'cover' ? 'covers' : 'wallpapers';
    const uploadRes = await uploadImageToCloud(optimized, folder);
    setIsUploadingCloud(false);

    if (uploadRes.mode === 'cloudinary' && uploadRes.url) {
      setFormData((prev) => {
        let updated = { ...prev };
        if (cropper.target === 'avatar') {
          updated.avatar = uploadRes.url;
        } else if (cropper.target === 'cover') {
          updated.cover = uploadRes.url;
        } else if (cropper.target === 'background') {
          updated.background = uploadRes.url;
          updated.applyAppBackground = true;
        }
        onSaveProfile(updated);
        return updated;
      });
    }
  };

  const handleSave = () => {
    onSaveProfile(formData);
    soundEngine.playPentatonicChime(3);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-[28px] max-w-xl w-full overflow-hidden shadow-2xl relative border border-[#EEF2F8] animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Cover Photo Banner */}
          <div className="relative h-40 w-full bg-slate-900 overflow-hidden shrink-0 group">
            {formData.cover ? (
              <img
                src={formData.cover}
                alt="Cover"
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

            {/* Change Cover & Action Buttons */}
            <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10">
              {formData.cover && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...formData, cover: '' };
                    setFormData(updated);
                    onSaveProfile(updated);
                    soundEngine.playSoftClick();
                  }}
                  className="px-2.5 py-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-white text-xs font-bold shadow-md flex items-center gap-1 transition-all backdrop-blur-xs cursor-pointer"
                  title="Gỡ ảnh bìa hiện tại"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Gỡ ảnh</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-800 text-xs font-bold shadow-md flex items-center gap-1.5 transition-all opacity-95 group-hover:opacity-100 cursor-pointer active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Đổi ảnh bìa</span>
              </button>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />
          </div>

        {/* Avatar + Main Tabs bar */}
        <div className="px-6 pt-0 pb-4 relative shrink-0">
          <div className="flex items-end justify-between -mt-14 mb-3">
            {/* Avatar Circle */}
            <div className="relative group/avatar">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-800 flex items-center justify-center text-white text-2xl font-black relative">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt={formData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitials(formData.name || 'CBP')}</span>
                )}
              </div>

              {/* Upload Avatar Overlay Button */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center gap-1 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer border-4 border-transparent"
                title="Tải ảnh đại diện mới"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-bold">Đổi ảnh</span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />

              {formData.avatar && (
                <button
                  onClick={() => setFormData((p) => ({ ...p, avatar: '' }))}
                  title="Xóa ảnh đại diện"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-rose-500 text-white hover:bg-rose-600 shadow-sm transition-transform active:scale-95"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sub-Tabs: Thông tin cá nhân & Ảnh nền toàn app */}
            <div className="flex items-center gap-1 p-1 bg-[#F1F4FA] rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'info'
                    ? 'bg-white text-[#1E2433] shadow-xs'
                    : 'text-[#64748B] hover:text-[#1E2433]'
                }`}
              >
                Hồ Sơ & Thống Kê
              </button>
              <button
                onClick={() => setActiveTab('background')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'background'
                    ? 'bg-white text-[#1E2433] shadow-xs'
                    : 'text-[#64748B] hover:text-[#1E2433]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Hình Nền Toàn App</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="px-6 pb-6 overflow-y-auto custom-main-scroll flex-1 space-y-4">
          {activeTab === 'info' ? (
            <>
              {/* Stats Grid from Real Atlas Data */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-[#F8FAFD] border border-[#EEF2F8] p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-[#8F9CAE] block">Đã hoàn thành</span>
                  <p className="text-lg font-black text-emerald-600 mt-0.5">{doneCount} việc</p>
                  <span className="text-[9px] text-[#64748B]">mục tiêu đã chốt</span>
                </div>
                <div className="bg-[#F8FAFD] border border-[#EEF2F8] p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-[#8F9CAE] block">Giờ làm việc</span>
                  <p className="text-lg font-black text-[#3B82F6] mt-0.5">
                    {(totalMinutes / 60).toFixed(1)}h
                  </p>
                  <span className="text-[9px] text-[#64748B]">tích lũy</span>
                </div>
                <div className="bg-[#F8FAFD] border border-[#EEF2F8] p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-[#8F9CAE] block">Chuỗi Streak</span>
                  <p className="text-lg font-black text-amber-500 mt-0.5 flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4 fill-amber-500" /> {realStreak} ngày
                  </p>
                  <span className="text-[9px] text-[#64748B]">
                    {realStreak > 0 ? 'liên tục' : 'bắt đầu ngay'}
                  </span>
                </div>
              </div>

              {/* Profile Details Form */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-[#64748B] block mb-1">
                    Họ và Tên
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="VD: Yaros Tolstykh"
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E2E8F0] focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] block mb-1">
                      Chức danh / Tiêu đề
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                      placeholder="VD: Personal Workspace Master"
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E2E8F0] focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] block mb-1">
                      Email liên hệ
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      placeholder="name@cbp.ai"
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E2E8F0] focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#64748B] block mb-1">
                    Giới thiệu bản thân (Bio)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.bio || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="Viết một vài dòng về mục tiêu và phong cách làm việc..."
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-[#E2E8F0] focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFD] border border-[#EEF2F8]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <span className="text-xs font-bold text-[#1E2433] block">
                        Đồng Bộ Đám Mây Trực Tuyến
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        Tự động sao lưu dữ liệu an toàn • Không gian làm việc cá nhân
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Live
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Tab: Background & Wallpaper Customization */
            <div className="space-y-4 pt-1">
              <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-[#1E3A8A]">
                    Áp Dụng Hình Nền Toàn Ứng Dụng
                  </h4>
                  <p className="text-[10px] text-[#3B82F6]">
                    Bật để hiển thị ảnh nền tràn viền với hiệu ứng làm mờ cao cấp
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.applyAppBackground}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, applyAppBackground: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                </label>
              </div>

              {/* Upload Custom Wallpaper Button */}
              <div>
                <label className="text-[11px] font-bold text-[#64748B] block mb-2">
                  Tải Lên Ảnh Nền Cá Nhân (Từ Máy Tính)
                </label>
                <div
                  onClick={() => bgInputRef.current?.click()}
                  className="border-2 border-dashed border-[#CBD5E1] hover:border-[#3B82F6] rounded-2xl p-4 text-center cursor-pointer transition-colors bg-[#FAFBFD] hover:bg-[#F0F7FF] group"
                >
                  <Upload className="w-6 h-6 mx-auto text-[#64748B] group-hover:text-[#3B82F6] mb-1.5 transition-colors" />
                  <span className="text-xs font-bold text-[#1E2433] block">
                    Bấm để chọn file ảnh từ máy của bạn
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">
                    Hỗ trợ PNG, JPG, WebP tối đa 8MB
                  </span>
                </div>
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBgChange}
                />
              </div>

              {/* Preset Wallpapers */}
              <div>
                <label className="text-[11px] font-bold text-[#64748B] block mb-2">
                  Hoặc Chọn Bộ Sưu Tập Ảnh Nền Tuyển Chọn
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() =>
                        setFormData((p) => ({
                          ...p,
                          background: bg.url,
                          applyAppBackground: true,
                        }))
                      }
                      className={`relative rounded-xl overflow-hidden h-16 border-2 transition-all group ${
                        formData.background === bg.url
                          ? 'border-[#3B82F6] ring-2 ring-blue-200'
                          : 'border-transparent hover:border-slate-300'
                      }`}
                    >
                      <img src={bg.url} alt={bg.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-md bg-black/40">
                          {bg.label}
                        </span>
                      </div>
                      {formData.background === bg.url && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#3B82F6] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blur & Opacity Adjustments */}
              {formData.applyAppBackground && (
                <div className="space-y-3 bg-[#F8FAFD] p-3.5 rounded-2xl border border-[#EEF2F8]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#475569]">Độ mờ kính (Blur):</span>
                    <span className="font-black text-[#3B82F6]">{formData.backgroundBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={formData.backgroundBlur}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, backgroundBlur: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-[#3B82F6]"
                  />

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-bold text-[#475569]">Độ trong suốt nền (Opacity):</span>
                    <span className="font-black text-[#3B82F6]">
                      {Math.round(formData.backgroundOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={formData.backgroundOpacity}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        backgroundOpacity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[#3B82F6]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-[#EEF2F8] bg-[#FAFBFD] flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:text-[#1E2433] hover:bg-[#EEF2F8] transition-colors"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {isUploadingCloud && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Đang tải ảnh lên đám mây...</span>
              </span>
            )}
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Đã lưu thành công!
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#1E2433] hover:bg-[#2B3448] text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Lưu Hồ Sơ</span>
            </button>
          </div>
        </div>

        </div>
      </div>

      {/* Embedded Image Cropper & Editor Modal rendered OUTSIDE overflow container */}
      <ImageCropperModal
        isOpen={cropper.isOpen}
        imageSrc={cropper.imageSrc}
        cropType={cropper.cropType}
        title={cropper.title}
        onClose={() => setCropper((prev) => ({ ...prev, isOpen: false }))}
        onConfirmCrop={handleConfirmCrop}
      />
    </>
  );
};
