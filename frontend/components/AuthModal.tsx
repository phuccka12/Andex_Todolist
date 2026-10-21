'use client';

import React, { useState, useEffect } from 'react';
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
    }
  }, [isOpen, initialTab]);

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
        setSuccessMsg('Đăng ký tài khoản thành công! Đang thiết lập không gian làm việc...');
        setTimeout(() => {
          onAuthSuccess(res.user!);
          onClose();
        }, 800);
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
        }, 900);
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
      }, 700);
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

  const handleQuickDemo = () => {
    setName('Cao Bảo Phúc');
    setEmail('phuc.cbp@gmail.com');
    setPassword('123456');
    setConfirmPassword('123456');
    soundEngine.playSoftClick();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] max-w-md w-full shadow-2xl border border-[#EEF2F8] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Brand Header Banner */}
        <div className="bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E2433] p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white font-black text-xs shadow-lg">
              CBP
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-1.5">
                <span>CBP Atelier OS</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Cloud Sync
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                {tab === 'forgot'
                  ? 'Khôi phục quyền truy cập tài khoản'
                  : tab === 'reset'
                  ? 'Thiết lập mật khẩu bảo mật mới'
                  : 'Không gian làm việc & Quản lý thời gian đa người dùng'}
              </p>
            </div>
          </div>

          {/* Tab Selector for Login / Register */}
          {tab === 'login' || tab === 'register' ? (
            <div className="flex items-center p-1 bg-white/10 rounded-xl mt-4 border border-white/10">
              <button
                onClick={() => {
                  setTab('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                  soundEngine.playSoftClick();
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  tab === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng Nhập</span>
              </button>

              <button
                onClick={() => {
                  setTab('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                  soundEngine.playSoftClick();
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  tab === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Đăng Ký Mới</span>
              </button>
            </div>
          ) : (
            /* Navigation back button for Forgot / Reset */
            <div className="flex items-center justify-between mt-4 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setTab(tab === 'reset' ? 'forgot' : 'login');
                  setErrorMsg('');
                  setSuccessMsg('');
                  soundEngine.playSoftClick();
                }}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{tab === 'reset' ? 'Nhập lại email' : 'Quay lại đăng nhập'}</span>
              </button>
              <div className="flex items-center gap-1 text-[11px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-400/20">
                <KeyRound className="w-3 h-3 text-blue-400" />
                <span>{tab === 'forgot' ? 'Bước 1/2' : 'Bước 2/2'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          
          {/* Error / Success banners */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1 & 2: REGISTER EXTRA FIELDS */}
          {tab === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Họ & Tên</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Cao Bảo Phúc"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#1E2433] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          )}

          {/* EMAIL FIELD (Used in Login, Register, Forgot) */}
          {tab !== 'reset' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Địa chỉ Email</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: user@atelier.io"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#1E2433] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          )}

          {/* PASSWORD FIELD (Only for Login & Register) */}
          {(tab === 'login' || tab === 'register') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#3B82F6]" />
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
                      className="text-[11px] text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold transition-colors cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-[#64748B] hover:text-[#2563EB] flex items-center gap-1"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#1E2433] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          )}

          {/* CONFIRM PASSWORD (Only on Register) */}
          {tab === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Xác nhận mật khẩu</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu ở trên"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#1E2433] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          )}

          {/* TAB FORGOT: Description & Shortcut */}
          {tab === 'forgot' && (
            <div className="space-y-2">
              <p className="text-xs text-[#64748B] leading-relaxed">
                Hệ thống sẽ gửi một mã xác nhận gồm <strong className="text-[#1E2433]">6 chữ số</strong> tới địa chỉ email trên để bạn thiết lập lại mật khẩu mới.
              </p>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab('reset');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-[11px] text-[#2563EB] hover:underline font-medium flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3 text-[#2563EB]" />
                  <span>Đã có mã OTP? Nhập mã ngay</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB RESET: 6-DIGIT OTP & NEW PASSWORD */}
          {tab === 'reset' && (
            <div className="space-y-3.5">
              {/* OTP Field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span>Mã xác thực OTP (6 chữ số)</span>
                  </label>
                  <button
                    type="button"
                    disabled={resending}
                    onClick={handleResendOtp}
                    className="text-[11px] text-[#2563EB] hover:underline font-medium flex items-center gap-1 disabled:opacity-50"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-base font-mono font-black text-center tracking-[0.4em] text-[#1E2433] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:tracking-widest"
                />
                <p className="text-[10px] text-[#94A3B8] text-center">Mã có hiệu lực trong vòng 15 phút</p>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span>Mật khẩu mới</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-[11px] text-[#64748B] hover:text-[#2563EB] flex items-center gap-1"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#1E2433] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>Xác nhận mật khẩu mới</span>
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#1E2433] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] hover:from-[#1D4ED8] hover:to-[#4338CA] text-white text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
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

          {/* Fast Demo fill helper (for login/register) */}
          {(tab === 'login' || tab === 'register') && (
            <div className="pt-2 border-t border-[#EEF2F8] flex items-center justify-between text-[11px] text-[#64748B]">
              <span>Chưa muốn gõ tay?</span>
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-[#2563EB] hover:text-[#1D4ED8] font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#2563EB]" />
                <span>Điền thông tin mẫu</span>
              </button>
            </div>
          )}

          {/* Return to Login link when in forgot/reset */}
          {(tab === 'forgot' || tab === 'reset') && (
            <div className="pt-2 border-t border-[#EEF2F8] text-center">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                  soundEngine.playSoftClick();
                }}
                className="text-[11px] text-[#64748B] hover:text-[#2563EB] font-medium hover:underline cursor-pointer"
              >
                Nhớ ra mật khẩu rồi? Đăng nhập ngay
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
