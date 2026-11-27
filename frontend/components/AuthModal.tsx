'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { authService, AuthUser } from '../lib/authService';
import { API_BASE } from '../lib/config';
import { soundEngine } from '../lib/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
  initialTab?: 'login' | 'register' | 'forgot' | 'reset';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialTab = 'login',
}) => {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrorMsg('');
      setSuccessMsg('');
      // Prefetch /app bundle & pre-warm backend/DB connection while user enters credentials
      try {
        router.prefetch('/app');
        fetch(`${API_BASE}/health`, { method: 'GET' }).catch(() => {});
      } catch {}
    }
  }, [isOpen, initialTab, router]);

  if (!isOpen) return null;

  // Handle Form Submission according to active tab
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // --- REGISTER FLOW ---
    if (tab === 'register') {
      if (!name.trim()) {
        setErrorMsg('Vui lòng nhập họ và tên của bạn.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Mật khẩu cần ít nhất 6 ký tự.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp.');
        return;
      }

      setLoading(true);
      const res = await authService.register(name, email, password);
      setLoading(false);

      if (res.success && res.user) {
        soundEngine.playPentatonicChime(4);
        setSuccessMsg('Đăng ký thành công! Đang vào không gian làm việc...');
        setTimeout(() => {
          onAuthSuccess(res.user!);
          onClose();
        }, 120);
      } else {
        setErrorMsg(res.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
      return;
    }

    // --- FORGOT PASSWORD REQUEST OTP FLOW ---
    if (tab === 'forgot') {
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ đã đăng ký.');
        return;
      }

      setLoading(true);
      const res = await authService.forgotPassword(email);
      setLoading(false);

      if (res.success) {
        soundEngine.playPentatonicChime(3);
        setSuccessMsg(res.message || 'Mã xác nhận gồm 6 số đã được gửi qua email của bạn.');
        setTab('reset');
      } else {
        setErrorMsg(res.message || 'Không tìm thấy tài khoản với email này.');
      }
      return;
    }

    // --- RESET PASSWORD VERIFY OTP FLOW ---
    if (tab === 'reset') {
      if (!email.trim()) {
        setErrorMsg('Thiếu địa chỉ email.');
        return;
      }
      if (!otpCode.trim() || otpCode.trim().length !== 6) {
        setErrorMsg('Vui lòng nhập đủ 6 chữ số mã xác nhận OTP.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg('Mật khẩu mới cần tối thiểu 6 ký tự.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp.');
        return;
      }

      setLoading(true);
      const res = await authService.resetPassword(email, otpCode.trim(), newPassword);
      setLoading(false);

      if (res.success && res.user) {
        soundEngine.playPentatonicChime(5);
        setSuccessMsg('Đổi mật khẩu thành công! Đang tự động đăng nhập...');
        setTimeout(() => {
          onAuthSuccess(res.user!);
          onClose();
        }, 150);
      } else {
        setErrorMsg(res.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn.');
      }
      return;
    }

    // --- LOGIN FLOW ---
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập email đăng nhập.');
      return;
    }
    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoading(true);
    const res = await authService.login(email, password);
    setLoading(false);

    if (res.success && res.user) {
      soundEngine.playPentatonicChime(4);
      setSuccessMsg(`Đăng nhập thành công! Chào mừng ${res.user.name}.`);
      setTimeout(() => {
        onAuthSuccess(res.user!);
        onClose();
      }, 100);
    } else {
      setErrorMsg(res.message || 'Email hoặc mật khẩu không chính xác.');
    }
  };

  // Resend OTP in reset tab
  const handleResendOtp = async () => {
    if (!email.trim()) return;
    setResending(true);
    setErrorMsg('');
    const res = await authService.forgotPassword(email);
    setResending(false);
    if (res.success) {
      soundEngine.playSoftClick();
      setSuccessMsg('Mã OTP mới đã được gửi lại vào email của bạn.');
    } else {
      setErrorMsg(res.message || 'Không thể gửi lại mã OTP lúc này.');
    }
  };

  const handleGuestLogin = () => {
    soundEngine.playPentatonicChime(4);
    const guestUser: AuthUser = {
      id: 'guest-' + Date.now(),
      name: 'Khách Trải Nghiệm',
      email: 'guest@gencoore.app',
      role: 'user',
      title: 'Gencoore Guest Mode',
      bio: 'Không gian trải nghiệm cục bộ trên trình duyệt',
    };
    authService.setCachedUser(guestUser);
    onAuthSuccess(guestUser);
    onClose();
  };

  const handleQuickDemo = () => {
    setName('Thành viên mới');
    setEmail('demo@gencoore.app');
    setPassword('123456');
    setConfirmPassword('123456');
    soundEngine.playSoftClick();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFDF7] rounded-3xl max-w-md w-full shadow-[6px_6px_0px_#0F172A] border-2 border-[#0F172A] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Brand Header Banner */}
        <div className="bg-[#E11D48] border-b-2 border-[#0F172A] p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FEF9C3] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-1.5 pr-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="px-2.5 py-1 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]">
                <img
                  src="/images/logo-wordmark.png"
                  alt="Genncore"
                  className="block h-5 w-auto object-contain"
                />
              </div>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]">
                Cloud Sync
              </span>
            </div>
            <p className="text-[11px] text-[#FFE4E6] font-bold">
              {tab === 'forgot'
                ? 'Khôi phục quyền truy cập tài khoản'
                : tab === 'reset'
                ? 'Thiết lập mật khẩu bảo mật mới'
                : 'Không gian làm việc & Quản lý thời gian đa người dùng'}
            </p>
          </div>

          {/* Crisp Cartoon Tab Selector for Login / Register */}
          {tab === 'login' || tab === 'register' ? (
            <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl mt-4 border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                  soundEngine.playSoftClick();
                }}
                className={`flex-1 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  tab === 'login'
                    ? 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black'
                    : 'text-[#0F172A] hover:bg-[#FEF9C3] font-bold border-2 border-transparent'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng Nhập</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                  soundEngine.playSoftClick();
                }}
                className={`flex-1 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  tab === 'register'
                    ? 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black'
                    : 'text-[#0F172A] hover:bg-[#FEF9C3] font-bold border-2 border-transparent'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Đăng Ký Mới</span>
              </button>
            </div>
          ) : (
            /* Navigation back bar for Forgot / Reset */
            <div className="flex items-center justify-between mt-4 p-2 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
              <button
                type="button"
                onClick={() => {
                  setTab(tab === 'reset' ? 'forgot' : 'login');
                  setErrorMsg('');
                  setSuccessMsg('');
                  soundEngine.playSoftClick();
                }}
                className="px-2.5 py-1 rounded-xl bg-[#FFF1F2] hover:bg-[#FEF9C3] text-xs text-[#0F172A] border-2 border-[#0F172A] flex items-center gap-1.5 font-black transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#E11D48]" />
                <span>{tab === 'reset' ? 'Nhập lại email' : 'Quay lại đăng nhập'}</span>
              </button>
              <div className="flex items-center gap-1 text-[11px] font-black text-[#0F172A] bg-[#FEF9C3] px-2.5 py-1 rounded-xl border-2 border-[#0F172A]">
                <KeyRound className="w-3 h-3 text-[#E11D48]" />
                <span>{tab === 'forgot' ? 'Bước 1/2' : 'Bước 2/2'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-[#FFFDF7]">
          
          {/* Error / Success Cartoon Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#BE123C] text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-[#DCFCE7] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A] text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB REGISTER: NAME FIELD */}
          {tab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#E11D48]" />
                <span>Họ & Tên</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Cao Bảo Phúc"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-[#0F172A] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* EMAIL FIELD (Used in Login, Register, Forgot) */}
          {tab !== 'reset' && (
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#E11D48]" />
                <span>Địa chỉ Email</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: user@genncore.io"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-[#0F172A] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* PASSWORD FIELD (Only for Login & Register) */}
          {(tab === 'login' || tab === 'register') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#E11D48]" />
                  <span>Mật khẩu</span>
                </label>
                <div className="flex items-center gap-3">
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('forgot');
                        setErrorMsg('');
                        setSuccessMsg('');
                        soundEngine.playSoftClick();
                      }}
                      className="text-[11px] text-[#E11D48] hover:text-[#BE123C] hover:underline font-extrabold transition-colors cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-bold text-slate-600 hover:text-[#E11D48] flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Ẩn' : 'Hiện'}</span>
                  </button>
                </div>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-[#0F172A] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* CONFIRM PASSWORD (Only on Register) */}
          {tab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#E11D48]" />
                <span>Xác nhận mật khẩu</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu ở trên"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-[#0F172A] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* TAB FORGOT: Description & Shortcut */}
          {tab === 'forgot' && (
            <div className="p-3.5 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2">
              <p className="text-xs font-semibold text-[#0F172A] leading-relaxed">
                Hệ thống sẽ gửi một mã xác nhận gồm <strong className="font-black text-[#E11D48]">6 chữ số</strong> tới địa chỉ email trên để bạn thiết lập lại mật khẩu mới.
              </p>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab('reset');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-[11px] text-[#E11D48] hover:underline font-black flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3 text-[#E11D48]" />
                  <span>Đã có mã OTP? Nhập mã ngay</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB RESET: 6-DIGIT OTP & NEW PASSWORD */}
          {tab === 'reset' && (
            <div className="space-y-3.5">
              {/* OTP Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#E11D48]" />
                    <span>Mã xác thực OTP (6 chữ số)</span>
                  </label>
                  <button
                    type="button"
                    disabled={resending}
                    onClick={handleResendOtp}
                    className="text-[11px] text-[#E11D48] hover:underline font-black flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                    <span>Gửi lại mã</span>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#0F172A] rounded-xl text-base font-mono font-black text-center tracking-[0.4em] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none transition-colors placeholder:tracking-widest"
                />
                <p className="text-[10px] font-bold text-slate-500 text-center">Mã có hiệu lực trong vòng 15 phút</p>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#E11D48]" />
                    <span>Mật khẩu mới</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-[11px] font-bold text-slate-600 hover:text-[#E11D48] flex items-center gap-1 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showNewPassword ? 'Ẩn' : 'Hiện'}</span>
                  </button>
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#0F172A] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none transition-colors"
                />
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#E11D48]" />
                  <span>Xác nhận mật khẩu mới</span>
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#0F172A] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-[#FFF1F2] focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tab === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập Vào Không Gian</span>
              </>
            ) : tab === 'register' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Tạo Tài Khoản & Bắt Đầu</span>
              </>
            ) : tab === 'forgot' ? (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Gửi Mã Xác Nhận Qua Email</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Xác Nhận & Đặt Lại Mật Khẩu</span>
              </>
            )}
          </button>
        </form>

        {/* Cartoon Modal Footer */}
        <div className="px-6 py-3.5 bg-[#FFF1F2] border-t-2 border-[#0F172A] flex items-center justify-between gap-2">
          {(tab === 'login' || tab === 'register') ? (
            <>
              <button
                type="button"
                onClick={handleGuestLogin}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FEF9C3] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer"
                title="Vào nhanh không gian làm việc mà không cần máy chủ backend"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E11D48]" />
                <span>Trải nghiệm Khách (Demo)</span>
              </button>
              <button
                type="button"
                onClick={handleQuickDemo}
                className="px-3 py-1.5 rounded-xl bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[11px] font-black transition-all cursor-pointer"
              >
                Điền mẫu
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
                setSuccessMsg('');
                soundEngine.playSoftClick();
              }}
              className="w-full py-1.5 rounded-xl bg-white hover:bg-[#FEF9C3] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[11px] font-black transition-all cursor-pointer text-center"
            >
              Nhớ ra mật khẩu rồi? Đăng nhập ngay
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
