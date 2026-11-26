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
  Trash2,
  Loader2,
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
      const updated = { ...prev };
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
        const updated = { ...prev };
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
      <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-[#FFFDF7] rounded-3xl max-w-xl w-full overflow-hidden shadow-[6px_6px_0px_#0F172A] relative border-2 border-[#0F172A] animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FEF9C3] text-[#0F172A] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Cover Photo Banner */}
          <div className="relative h-40 w-full bg-[#E11D48] border-b-2 border-[#0F172A] overflow-hidden shrink-0 group">
            {formData.cover ? (
              <img
                src={formData.cover}
                alt="Cover"
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div
                className="w-full h-full bg-gradient-to-r from-[#E11D48] via-[#FB7185] to-[#FDE047] relative"
              >
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: 'radial-gradient(#0F172A 1.5px, transparent 1.5px)',
                    backgroundSize: '18px 18px',
                  }}
                />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />

            {/* Change Cover & Action Buttons */}
            <div className="absolute bottom-3 right-4 flex items-center gap-2 z-10">
              {formData.cover && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...formData, cover: '' };
                    setFormData(updated);
                    onSaveProfile(updated);
                    soundEngine.playSoftClick();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#FFF1F2] hover:bg-[#E11D48] text-[#E11D48] hover:text-white text-xs font-black border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center gap-1 transition-all cursor-pointer"
                  title="Gỡ ảnh bìa hiện tại"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Gỡ ảnh</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] text-xs font-black border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#E11D48]" />
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
            <div className="flex items-end justify-between -mt-12 mb-3 gap-2 flex-wrap">
              {/* Cartoon Avatar Frame */}
              <div className="relative group/avatar">
                <div className="w-24 h-24 rounded-full border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] overflow-hidden bg-[#FFE4E6] flex items-center justify-center text-[#E11D48] text-2xl font-black relative">
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
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center gap-1 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer border-2 border-[#0F172A]"
                  title="Tải ảnh đại diện mới"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-black">Đổi ảnh</span>
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
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, avatar: '' }))}
                    title="Xóa ảnh đại diện"
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#E11D48] text-white hover:bg-[#BE123C] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-transform active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sub-Tabs: Thông tin cá nhân & Ảnh nền toàn app */}
              <div className="flex items-center gap-1 p-1 bg-white rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('info');
                    soundEngine.playSoftClick();
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'info'
                      ? 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black'
                      : 'text-[#0F172A] hover:bg-[#FFE4E6]/70 font-bold border-2 border-transparent'
                  }`}
                >
                  Hồ Sơ & Thống Kê
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('background');
                    soundEngine.playSoftClick();
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'background'
                      ? 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black'
                      : 'text-[#0F172A] hover:bg-[#FFE4E6]/70 font-bold border-2 border-transparent'
                  }`}
                >
                  <ImageIcon className={`w-3.5 h-3.5 ${activeTab === 'background' ? 'text-white' : 'text-[#E11D48]'}`} />
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
                  <div className="bg-[#DCFCE7] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] p-3 rounded-2xl text-center">
                    <span className="text-[10px] font-black text-slate-700 block">Đã hoàn thành</span>
                    <p className="text-lg font-black text-[#0F172A] mt-0.5">{doneCount} việc</p>
                    <span className="text-[9px] font-bold text-slate-600">mục tiêu đã chốt</span>
                  </div>
                  <div className="bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] p-3 rounded-2xl text-center">
                    <span className="text-[10px] font-black text-slate-700 block">Giờ làm việc</span>
                    <p className="text-lg font-black text-[#E11D48] mt-0.5">
                      {(totalMinutes / 60).toFixed(1)}h
                    </p>
                    <span className="text-[9px] font-bold text-slate-600">tích lũy</span>
                  </div>
                  <div className="bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] p-3 rounded-2xl text-center">
                    <span className="text-[10px] font-black text-slate-700 block">Chuỗi Streak</span>
                    <p className="text-lg font-black text-[#0F172A] mt-0.5 flex items-center justify-center gap-1">
                      <Flame className="w-4 h-4 fill-[#E11D48] text-[#E11D48]" /> {realStreak} ngày
                    </p>
                    <span className="text-[9px] font-bold text-slate-600">
                      {realStreak > 0 ? 'liên tục' : 'bắt đầu ngay'}
                    </span>
                  </div>
                </div>

                {/* Profile Details Form */}
                <div className="bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-black text-[#0F172A] block mb-1">
                      Họ và Tên
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="VD: Nguyễn Minh Anh"
                      className="w-full px-3.5 py-2 text-xs bg-white border-2 border-[#0F172A] rounded-xl text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-black text-[#0F172A] block mb-1">
                        Chức danh / Tiêu đề
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                        placeholder="VD: Personal Workspace Master"
                        className="w-full px-3.5 py-2 text-xs bg-white border-2 border-[#0F172A] rounded-xl text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-[#0F172A] block mb-1">
                        Email liên hệ
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                        placeholder="name@genncore.ai"
                        className="w-full px-3.5 py-2 text-xs bg-white border-2 border-[#0F172A] rounded-xl text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-[#0F172A] block mb-1">
                      Giới thiệu bản thân (Bio)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.bio || ''}
                      onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                      placeholder="Viết một vài dòng về mục tiêu và phong cách làm việc..."
                      className="w-full px-3.5 py-2 text-xs bg-white border-2 border-[#0F172A] rounded-xl text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none resize-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#DCFCE7] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse border border-[#0F172A]" />
                    <div>
                      <span className="text-xs font-black text-[#0F172A] block">
                        Đồng Bộ Đám Mây Trực Tuyến
                      </span>
                      <span className="text-[10px] font-bold text-slate-700">
                        Tự động sao lưu dữ liệu an toàn • Không gian làm việc cá nhân
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white text-[#0F172A] border-2 border-[#0F172A]">
                    Live
                  </span>
                </div>
              </>
            ) : (
              /* Tab: Background & Wallpaper Customization */
              <div className="space-y-4 pt-1">
                <div className="p-3.5 rounded-2xl bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-[#0F172A]">
                      Áp Dụng Hình Nền Toàn Ứng Dụng
                    </h4>
                    <p className="text-[10px] font-bold text-slate-600">
                      Bật để hiển thị ảnh nền tràn viền với hiệu ứng làm mờ cao cấp
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.applyAppBackground}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, applyAppBackground: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white border-2 border-[#0F172A] rounded-full peer peer-checked:bg-[#E11D48] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[#0F172A] peer-checked:after:bg-white after:border-2 after:border-[#0F172A] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                {/* Upload Custom Wallpaper Button */}
                <div className="bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] rounded-2xl p-4 space-y-2">
                  <label className="text-[11px] font-black text-[#0F172A] block">
                    Tải Lên Ảnh Nền Cá Nhân (Từ Máy Tính)
                  </label>
                  <div
                    onClick={() => bgInputRef.current?.click()}
                    className="border-2 border-dashed border-[#0F172A] rounded-2xl p-4 text-center cursor-pointer transition-colors bg-[#FFFDF7] hover:bg-[#FEF9C3] group"
                  >
                    <Upload className="w-6 h-6 mx-auto text-[#E11D48] mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black text-[#0F172A] block">
                      Bấm để chọn file ảnh từ máy của bạn
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">
                      Hỗ trợ PNG, JPG, WebP tối đa 15MB
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
                <div className="bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] rounded-2xl p-4">
                  <label className="text-[11px] font-black text-[#0F172A] block mb-2.5">
                    Hoặc Chọn Bộ Sưu Tập Ảnh Nền Tuyển Chọn
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {PRESET_BACKGROUNDS.map((bg) => (
                      <button
                        type="button"
                        key={bg.id}
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            background: bg.url,
                            applyAppBackground: true,
                          }))
                        }
                        className={`relative rounded-xl overflow-hidden h-16 border-2 border-[#0F172A] transition-all group cursor-pointer ${
                          formData.background === bg.url
                            ? 'ring-2 ring-[#E11D48] shadow-[3px_3px_0px_#0F172A]'
                            : 'hover:shadow-[2px_2px_0px_#0F172A]'
                        }`}
                      >
                        <img src={bg.url} alt={bg.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 flex items-center justify-center">
                          <span className="text-[10px] font-black text-white px-1.5 py-0.5 rounded-md bg-black/50 border border-white/30">
                            {bg.label}
                          </span>
                        </div>
                        {formData.background === bg.url && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#E11D48] border border-[#0F172A] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Blur & Opacity Adjustments */}
                {formData.applyAppBackground && (
                  <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-[#0F172A]">Độ mờ kính (Blur):</span>
                      <span className="font-black text-[#E11D48]">{formData.backgroundBlur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={formData.backgroundBlur}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, backgroundBlur: parseInt(e.target.value, 10) }))
                      }
                      className="w-full accent-[#E11D48] cursor-pointer"
                    />

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-black text-[#0F172A]">Độ trong suốt nền (Opacity):</span>
                      <span className="font-black text-[#E11D48]">
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
                      className="w-full accent-[#E11D48] cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 px-6 border-t-2 border-[#0F172A] bg-[#FFF1F2] flex items-center justify-between shrink-0 gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#FEF9C3] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black transition-all cursor-pointer"
            >
              Đóng
            </button>

            <div className="flex items-center gap-2">
              {isUploadingCloud && (
                <span className="text-xs font-black text-[#0F172A] bg-[#FEF9C3] border-2 border-[#0F172A] px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E11D48]" />
                  <span>Đang tải ảnh lên đám mây...</span>
                </span>
              )}
              {savedSuccess && (
                <span className="text-xs font-black text-[#0F172A] bg-[#DCFCE7] border-2 border-[#0F172A] px-2.5 py-1 rounded-full flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Đã lưu thành công!
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FDE047]" />
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
