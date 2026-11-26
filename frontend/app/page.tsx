'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Pause,
  Play,
  Send,
  Sparkles,
  Timer,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import { authService, AuthUser } from '@/lib/authService';
import { soundEngine } from '@/lib/audio';
import { speakEnglishWord } from '@/lib/vocabApi';

type PreviewTab = 'timetable' | 'english' | 'focus';

const EASE_CARTOON: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Cute SVG Cartoon Avatar inspired by bold-outline flat-color illustration style
 */
const CartoonCharacterTile: React.FC<{
  bg: string;
  shirt: string;
  hair: string;
  hasSprout?: boolean;
  hasCap?: boolean;
  label?: string;
}> = ({ bg, shirt, hair, hasSprout, hasCap, label }) => (
  <div
    className={`aspect-square rounded-2xl border-2 border-[#0F172A] ${bg} relative overflow-hidden flex items-end justify-center shadow-[3px_3px_0px_#0F172A]`}
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Shirt / Shoulders */}
      <path
        d="M18,102 C18,76 34,68 50,68 C66,68 82,76 82,102 Z"
        fill={shirt}
        stroke="#0F172A"
        strokeWidth="3.5"
      />
      {/* Neck */}
      <rect x="43" y="58" width="14" height="14" rx="5" fill="#FFE0D2" stroke="#0F172A" strokeWidth="3" />
      {/* Ears */}
      <circle cx="29" cy="46" r="5.5" fill="#FFE0D2" stroke="#0F172A" strokeWidth="3" />
      <circle cx="71" cy="46" r="5.5" fill="#FFE0D2" stroke="#0F172A" strokeWidth="3" />
      {/* Head */}
      <circle cx="50" cy="44" r="21" fill="#FFE0D2" stroke="#0F172A" strokeWidth="3.5" />
      {/* Hair */}
      <path
        d="M28,42 C28,22 40,16 50,16 C62,16 72,24 72,42 C66,32 58,28 50,30 C41,28 34,33 28,42 Z"
        fill={hair}
        stroke="#0F172A"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      {hasCap && (
        <>
          <path
            d="M28,33 C30,17 44,14 54,15 C66,16 72,24 72,33 Z"
            fill="#E11D48"
            stroke="#0F172A"
            strokeWidth="3.2"
          />
          <circle cx="50" cy="24" r="2.6" fill="#FFFFFF" />
        </>
      )}
      {hasSprout && (
        <path
          d="M54,16 C54,9 60,7 62,12 C58,15 55,16 54,16 Z M54,16 C50,10 45,11 47,15 C50,17 53,16 54,16 Z"
          fill="#4ADE80"
          stroke="#0F172A"
          strokeWidth="2.4"
        />
      )}
      {/* Eyes */}
      <circle cx="42" cy="44" r="2.4" fill="#0F172A" />
      <circle cx="58" cy="44" r="2.4" fill="#0F172A" />
      {/* Rosy Cheeks */}
      <ellipse cx="36" cy="50" rx="4" ry="2.4" fill="#FB7185" opacity="0.55" />
      <ellipse cx="64" cy="50" rx="4" ry="2.4" fill="#FB7185" opacity="0.55" />
      {/* Smile */}
      <path d="M44,52 Q50,57 56,52" fill="none" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
    {label && (
      <span className="absolute bottom-1.5 px-1.5 py-0.5 rounded-md bg-white border border-[#0F172A] text-[8.5px] font-black text-[#0F172A] tracking-tight">
        {label}
      </span>
    )}
  </div>
);

export default function GenncoreCartoonPortfolio() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('timetable');

  // Focus Preview Timer
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);

  // Feedback Modal
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  useEffect(() => {
    const user = authService.getCachedUser();
    if (user) setAuthUser(user);
  }, []);

  useEffect(() => {
    if (!focusRunning) return;
    const timer = setInterval(() => {
      setFocusSeconds((s) => (s > 0 ? s - 1 : 25 * 60));
    }, 1000);
    return () => clearInterval(timer);
  }, [focusRunning]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.setMuted(!next);
    if (next) soundEngine.playPentatonicChime(4);
  };

  const handleOpenAuth = (tab: 'login' | 'register') => {
    soundEngine.playSoftClick();
    setAuthInitialTab(tab);
    setIsAuthOpen(true);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F1] via-[#FFF1F2] to-[#FEFCE8] text-[#0F172A] font-sans relative overflow-x-hidden selection:bg-[#E11D48] selection:text-white">
      {/* Layered Cartoon Paper Texture & Soft Pastel Ambient Washes */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-28 -left-24 w-[420px] h-[420px] rounded-full bg-[#FDA4AF]/30 blur-3xl" />
        <div className="absolute top-16 -right-24 w-[380px] h-[380px] rounded-full bg-[#FDE047]/30 blur-3xl" />
        <div className="absolute top-[46%] -left-28 w-[360px] h-[360px] rounded-full bg-[#93C5FD]/25 blur-3xl" />
        <div className="absolute -bottom-24 right-10 w-[400px] h-[400px] rounded-full bg-[#FCA5A5]/25 blur-3xl" />

        {/* Comic Halftone Polka Dot Overlay */}
        <div
          className="absolute inset-0 opacity-[0.26]"
          style={{
            backgroundImage: 'radial-gradient(#94A3B8 1.25px, transparent 1.25px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: 'radial-gradient(#E11D48 1.25px, transparent 1.25px)',
            backgroundSize: '44px 44px',
            backgroundPosition: '11px 11px',
          }}
        />

        {/* Subtle Floating Cartoon Doodles (Wide Screens Only) */}
        <motion.svg
          animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          viewBox="0 0 48 48"
          className="hidden xl:block absolute top-32 left-8 w-11 h-11 opacity-85"
        >
          <path
            d="M24 3 L29 19 L45 24 L29 29 L24 45 L19 29 L3 24 L19 19 Z"
            fill="#FDE047"
            stroke="#0F172A"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </motion.svg>

        <motion.svg
          animate={{ y: [0, 12, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          viewBox="0 0 48 48"
          className="hidden xl:block absolute top-[28rem] right-8 w-10 h-10 opacity-80"
        >
          <circle cx="24" cy="24" r="15" fill="#FFE4E6" stroke="#0F172A" strokeWidth="3" />
          <circle cx="24" cy="24" r="6" fill="#E11D48" stroke="#0F172A" strokeWidth="2.5" />
        </motion.svg>

        <motion.svg
          animate={{ y: [0, -8, 0], rotate: [-6, 6, -6] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          viewBox="0 0 56 32"
          className="hidden xl:block absolute bottom-36 left-10 w-12 h-8 opacity-80"
        >
          <path
            d="M4 20 Q14 4 24 18 T44 16 T52 10"
            fill="none"
            stroke="#E11D48"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </motion.svg>
      </div>

      {/* ===================================================================== */}
      {/* 1. CARTOON PORTFOLIO NAVBAR                                           */}
      {/* ===================================================================== */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_CARTOON }}
        className="sticky top-0 z-50 bg-[#FFFDF7]/95 backdrop-blur-md border-b-2 border-[#0F172A]"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 sm:h-24 flex items-center justify-between gap-4">
          {/* Left: Cartoon Sticker Logo Lockup */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <motion.div
              whileHover={{ rotate: -1.5, x: 1, y: 1 }}
              transition={{ type: 'spring', stiffness: 360, damping: 20 }}
              className="px-4 py-2 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] group-hover:shadow-[2px_2px_0px_#0F172A] transition-shadow flex items-center gap-2"
            >
              <img
                src="/images/logo-wordmark.png"
                alt="GENNCORE"
                className="block h-7 sm:h-9 w-auto object-contain"
              />
            </motion.div>
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-xl bg-[#FDE047] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[11px] font-black text-[#0F172A] -rotate-3">
              STUDIO
            </span>
          </Link>

          {/* Center: Cartoon Pill Nav Container */}
          <nav className="hidden md:inline-flex items-center gap-1 p-1 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-extrabold whitespace-nowrap">
            <a
              href="#showcase"
              className="px-3.5 py-1.5 rounded-xl bg-[#FFE4E6] text-[#E11D48] transition-colors"
            >
              Portfolio
            </a>
            <a
              href="#preview"
              className="px-3.5 py-1.5 rounded-xl text-[#0F172A] hover:bg-[#FEF9C3] transition-colors"
            >
              Trải nghiệm
            </a>
            <a
              href="#modules"
              className="px-3.5 py-1.5 rounded-xl text-[#0F172A] hover:bg-[#DBEAFE] transition-colors"
            >
              Mô-đun
            </a>
          </nav>

          {/* Right: Sound, Feedback & Workspace CTA */}
          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={handleToggleSound}
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              className="p-2 rounded-xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#E11D48]" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playSoftClick();
                setIsContactOpen(true);
              }}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FEF9C3] hover:bg-[#FDE047] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-[#0F172A] font-extrabold text-xs transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#E11D48]" />
              <span>Góp ý</span>
            </button>

            {!authUser && (
              <button
                type="button"
                onClick={() => handleOpenAuth('login')}
                className="hidden sm:inline-flex px-3.5 py-2 rounded-xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-[#0F172A] font-extrabold text-xs transition-all cursor-pointer"
              >
                Đăng nhập
              </button>
            )}

            <Link
              href="/app"
              onClick={() => soundEngine.playPentatonicChime(4)}
              className="px-4 sm:px-5 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-extrabold text-xs border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Vào Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ===================================================================== */}
      {/* 2. CARTOON PORTFOLIO HERO SECTION                                     */}
      {/* ===================================================================== */}
      <section id="showcase" className="relative z-10 pt-10 sm:pt-16 pb-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_CARTOON }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF08A] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-extrabold text-[#0F172A]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E11D48]" />
              <span>Genncore Portfolio • Cao Bao Phuc (Kelvin Cao)</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: EASE_CARTOON }}
              className="text-4xl sm:text-5xl lg:text-[56px] font-black text-[#0F172A] tracking-tight leading-[1.1]"
            >
              Sắp xếp ngày mới{' '}
              <span className="text-[#E11D48] relative inline-block">
                thông minh
                <svg
                  className="absolute -bottom-1.5 left-0 w-full h-3 text-[#E11D48]"
                  viewBox="0 0 120 12"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M2,8 Q30,2 60,7 T118,6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, delay: 0.35, ease: EASE_CARTOON }}
                  />
                </svg>
              </span>{' '}
              &amp; học tiếng Anh mỗi ngày!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: EASE_CARTOON }}
              className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl font-medium"
            >
              <strong>Genncore</strong> hợp nhất <strong>Lịch biểu 24h</strong>, <strong>Kanban</strong>,{' '}
              <strong>Pomodoro 432Hz</strong> và <strong>Phòng học từ vựng IELTS 8.0+</strong> trong giao diện thân thiện, vui mắt và cực kỳ mượt mà.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: EASE_CARTOON }}
              className="flex flex-wrap items-center gap-3.5 pt-1"
            >
              <Link
                href="/app"
                onClick={() => soundEngine.playPentatonicChime(5)}
                className="px-6 py-3.5 rounded-2xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-black text-xs sm:text-sm border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0F172A] flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Khám Phá Hệ Thống</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {!authUser && (
                <button
                  type="button"
                  onClick={() => handleOpenAuth('register')}
                  className="px-6 py-3.5 rounded-2xl bg-white hover:bg-[#FFF1F2] text-[#0F172A] font-extrabold text-xs sm:text-sm border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0F172A] flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Đăng Ký Miễn Phí</span>
                </button>
              )}
            </motion.div>
          </div>

          {/* Right Hero: Cartoon Character Grid Card (inspired by reference image!) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14, ease: EASE_CARTOON }}
            className="lg:col-span-5"
          >
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="rounded-3xl bg-white border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FFE4E6] border-2 border-[#0F172A] p-1 flex items-center justify-center">
                    <img src="/images/logo-mark.png" alt="G" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xs font-black text-[#0F172A]">GENNCORE CLUB</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E11D48] text-white border-2 border-[#0F172A] text-[10px] font-black">
                  v3.0
                </span>
              </div>

              {/* 2x2 Real Cartoon Character Stickers */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { src: '/images/landing/sticker-1.jpg', label: 'LỊCH 24H', badgeBg: 'bg-[#FEF08A]', tilt: -1.5 },
                  { src: '/images/landing/sticker-2.jpg', label: 'IELTS 8.0+', badgeBg: 'bg-[#FFE4E6]', tilt: 1.5 },
                  { src: '/images/landing/sticker-3.jpg', label: 'KANBAN', badgeBg: 'bg-[#DBEAFE]', tilt: 1.2 },
                  { src: '/images/landing/sticker-4.jpg', label: '432HZ', badgeBg: 'bg-[#DCFCE7]', tilt: -1.2 },
                ].map((st) => (
                  <motion.div
                    key={st.label}
                    whileHover={{ scale: 1.04, rotate: st.tilt }}
                    transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                    className="aspect-square rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] overflow-hidden relative group"
                  >
                    <img
                      src={st.src}
                      alt={st.label}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span
                      className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md border border-[#0F172A] text-[9px] font-black text-[#0F172A] whitespace-nowrap shadow-[1.5px_1.5px_0px_#0F172A] ${st.badgeBg}`}
                    >
                      {st.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Interactive Cartoon Speech Bubble */}
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                className="p-3 rounded-2xl bg-[#FFF1F2] border-2 border-[#0F172A] flex items-center justify-between gap-2"
              >
                <p className="text-[11px] font-extrabold text-[#0F172A] truncate">
                  &ldquo;resilient&rdquo; — Kiên cường, mau phục hồi!
                </p>
                <button
                  type="button"
                  onClick={() => speakEnglishWord('resilient', false)}
                  className="px-2.5 py-1 rounded-xl bg-[#E11D48] text-white border-2 border-[#0F172A] text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Nghe</span>
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. INTERACTIVE CARTOON STUDIO PREVIEW                                 */}
      {/* ===================================================================== */}
      <section id="preview" className="relative z-10 py-12 bg-[#FFE4E6]/45 border-y-2 border-dashed border-[#0F172A]/15">
        <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: EASE_CARTOON }}
          className="rounded-3xl bg-white border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] overflow-hidden"
        >
          {/* Window Bar */}
          <div className="px-4 sm:px-6 py-3.5 border-b-2 border-[#0F172A] bg-[#FFF1F2] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E11D48] border-2 border-[#0F172A]" />
              <span className="w-3 h-3 rounded-full bg-[#FDE047] border-2 border-[#0F172A]" />
              <span className="w-3 h-3 rounded-full bg-[#4ADE80] border-2 border-[#0F172A]" />
              <span className="text-[11px] font-mono font-bold text-[#0F172A] ml-2 hidden sm:inline">
                genncore.studio
              </span>
            </div>

            <div className="inline-flex p-1 rounded-2xl bg-white border-2 border-[#0F172A] text-xs font-extrabold relative">
              {(
                [
                  { id: 'timetable', label: 'Lịch Biểu 24h', icon: Calendar },
                  { id: 'english', label: 'English Studio', icon: BookOpen },
                  { id: 'focus', label: 'Focus 432Hz', icon: Timer },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = previewTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setPreviewTab(tab.id);
                    }}
                    className={`relative px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors z-10 ${
                      active ? 'text-white' : 'text-[#0F172A] hover:text-[#E11D48]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="cartoonTabPill"
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        className="absolute inset-0 rounded-xl bg-[#E11D48] -z-10"
                      />
                    )}
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animated Stage */}
          <div className="p-6 sm:p-8 min-h-[280px]">
            <AnimatePresence mode="wait">
              {previewTab === 'timetable' && (
                <motion.div
                  key="timetable"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: EASE_CARTOON }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
                >
                  <div className="lg:col-span-5 space-y-3 text-left">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE4E6] text-[#E11D48] border-2 border-[#0F172A] text-[11px] font-black">
                      <Clock className="w-3.5 h-3.5" />
                      Lịch biểu 24h
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-[#0F172A]">
                      Sắp xếp công việc rõ ràng từng giờ
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Xem nhanh theo Tuần, Ngày, Tháng hoặc Kanban. Nhắn một câu cho Genncore AI để tự động xếp lịch.
                    </p>
                  </div>

                  <div className="lg:col-span-7 space-y-2.5">
                    {[
                      { time: '08:30 – 10:30', title: 'Deep Work: Phát triển sản phẩm', tag: 'Ưu tiên P1', bg: 'bg-[#FFF1F2]' },
                      { time: '14:00 – 15:00', title: 'Ôn 25 từ vựng & luyện đặt câu AI', tag: 'English', bg: 'bg-[#FEF9C3]' },
                      { time: '19:30 – 21:00', title: 'Tổng kết & lên lịch ngày mai', tag: 'Routine', bg: 'bg-[#DBEAFE]' },
                    ].map((slot) => (
                      <motion.div
                        key={slot.time}
                        whileHover={{ x: 4 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                        className={`p-3.5 rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] flex items-center justify-between gap-3 ${slot.bg}`}
                      >
                        <div>
                          <p className="text-[10.5px] font-mono font-bold text-slate-600">{slot.time}</p>
                          <p className="text-xs sm:text-sm font-black text-[#0F172A]">{slot.title}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-white border-2 border-[#0F172A] text-[10px] font-black shrink-0">
                          {slot.tag}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {previewTab === 'english' && (
                <motion.div
                  key="english"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: EASE_CARTOON }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
                >
                  <div className="lg:col-span-5 space-y-3 text-left">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] border-2 border-[#0F172A] text-[11px] font-black">
                      <Brain className="w-3.5 h-3.5" />
                      English Studio
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-[#0F172A]">
                      Học theo Chủ đề, Từ điển &amp; Gia sư IELTS 8.0+
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Import Excel/ảnh chụp, tra Modal Verbs / Idioms / Phrasal Verbs 2 chiều và nghe 10 giọng đọc tự nhiên.
                    </p>
                  </div>

                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-2xl bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white border border-[#0F172A] text-[#E11D48]">
                          Cảm xúc &amp; Tâm lý
                        </span>
                        <button
                          type="button"
                          onClick={() => speakEnglishWord('resilient', false)}
                          className="p-1.5 rounded-lg bg-[#E11D48] text-white border border-[#0F172A] cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="text-lg font-black text-[#0F172A]">resilient</h4>
                      <p className="text-xs font-extrabold text-emerald-700">Kiên cường, mau phục hồi</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-2">
                      <span className="text-[11px] font-black text-[#E11D48] block">
                        Gia sư IELTS 8.0+
                      </span>
                      <p className="text-[11.5px] font-semibold text-[#0F172A] leading-relaxed">
                        &ldquo;Thay vì dùng <strong>very important</strong>, dùng <strong>indispensable</strong> câu sẽ xịn hơn nhiều!&rdquo;
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {previewTab === 'focus' && (
                <motion.div
                  key="focus"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: EASE_CARTOON }}
                  className="flex flex-col sm:flex-row items-center justify-between gap-6"
                >
                  <div className="space-y-3 text-left max-w-md">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF08A] text-[#0F172A] border-2 border-[#0F172A] text-[11px] font-black">
                      <Timer className="w-3.5 h-3.5 text-[#E11D48]" />
                      Pomodoro &amp; 432Hz
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-[#0F172A]">
                      Âm thanh tập trung sâu
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Bộ đếm Pomodoro kết hợp chuông ngũ cung 432Hz dịu nhẹ cho từng phiên làm việc.
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] flex flex-col items-center gap-3 min-w-[230px]">
                    <div className="text-4xl font-black font-mono text-[#0F172A]">
                      {formatTimer(focusSeconds)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playPentatonicChime(4);
                          setFocusRunning((r) => !r);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                      >
                        {focusRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{focusRunning ? 'Tạm dừng' : 'Bắt đầu'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFocusRunning(false);
                          setFocusSeconds(25 * 60);
                        }}
                        className="px-3 py-2 rounded-xl bg-white border-2 border-[#0F172A] text-xs font-extrabold text-[#0F172A] cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. CARTOON PORTFOLIO MODULES GRID                                     */}
      {/* ===================================================================== */}
      <section id="modules" className="relative z-10 py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-[#FFE4E6] border-2 border-[#0F172A] text-[10.5px] font-black uppercase tracking-wider text-[#E11D48]">
            System Modules
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
            Các mô-đun nổi bật của Genncore
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'Lịch Biểu & Kanban',
              desc: 'Lịch tuần/ngày/tháng và bảng Kanban 4 cột trực quan.',
              icon: Layers,
              bg: 'bg-[#FFF1F2]',
              iconBg: 'bg-[#E11D48] text-white',
            },
            {
              title: 'English Topic Decks',
              desc: 'Học từ vựng theo thẻ chủ đề, Popup nền mờ & ôn tập SRS.',
              icon: BookOpen,
              bg: 'bg-[#FEF9C3]',
              iconBg: 'bg-[#FACC15] text-[#0F172A]',
            },
            {
              title: 'Gia sư IELTS 8.0+',
              desc: 'Từ điển Anh↔Việt, Modal Verbs, Idioms & Phrasal Verbs.',
              icon: Brain,
              bg: 'bg-[#DBEAFE]',
              iconBg: 'bg-[#3B82F6] text-white',
            },
            {
              title: 'Focus 432Hz & TTS',
              desc: 'Chuông ngũ cung 432Hz & 10 giọng đọc tiếng Anh chuẩn.',
              icon: Flame,
              bg: 'bg-[#DCFCE7]',
              iconBg: 'bg-[#22C55E] text-[#0F172A]',
            },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: idx * 0.08, ease: EASE_CARTOON }}
                whileHover={{ y: -5 }}
                className={`p-5 rounded-3xl border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] flex flex-col justify-between gap-4 ${card.bg}`}
              >
                <div className="space-y-3">
                  <div className={`w-11 h-11 rounded-2xl border-2 border-[#0F172A] flex items-center justify-center ${card.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-black text-[#0F172A]">{card.title}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{card.desc}</p>
                </div>

                <Link
                  href="/app"
                  onClick={() => soundEngine.playSoftClick()}
                  className="inline-flex items-center gap-1 text-xs font-black text-[#E11D48] hover:underline"
                >
                  <span>Mở mô-đun</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4.2 ABOUT GENNCORE WEBSITE (CARTOON STREET STORY)                     */}
      {/* ===================================================================== */}
      <section id="about" className="relative z-10 pb-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: EASE_CARTOON }}
          className="rounded-3xl bg-white border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-7 items-center overflow-hidden"
        >
          {/* Left: About Copy */}
          <div className="lg:col-span-6 space-y-4 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] border-2 border-[#0F172A] text-[11px] font-black text-[#0F172A]">
              <Sparkles className="w-3.5 h-3.5 text-[#E11D48]" />
              Về trang web Genncore
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] leading-tight">
              Tất cả công cụ học tập & làm việc gói gọn trong{' '}
              <span className="text-[#E11D48]">một workspace sống động</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Genncore Workspace OS được xây dựng để bạn không còn phải mở hàng loạt ứng dụng rời rạc.
              Từ sắp xếp lịch biểu 24h, kéo-thả công việc trên bảng Kanban, tra cứu từ điển Anh↔Việt
              đến luyện phát âm IELTS và giữ tập trung với âm thanh 432Hz — mọi thứ đồng bộ mượt mà
              trên cùng một giao diện trực quan.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {[
                { label: 'Lập lịch 24h', sub: 'Kéo thả trực quan', bg: 'bg-[#FFF1F2]' },
                { label: 'English Lab', sub: 'Từ điển & IELTS', bg: 'bg-[#FEF9C3]' },
                { label: 'Deep Focus', sub: 'Pomodoro & 432Hz', bg: 'bg-[#DBEAFE]' },
              ].map((pill) => (
                <div
                  key={pill.label}
                  className={`p-3 rounded-2xl ${pill.bg} border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]`}
                >
                  <p className="text-xs font-black text-[#0F172A]">{pill.label}</p>
                  <p className="text-[10.5px] font-bold text-slate-600 mt-0.5">{pill.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Cartoon Street Illustration */}
          <div className="lg:col-span-6">
            <motion.div
              whileHover={{ rotate: 1, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="rounded-2xl border-2 border-[#0F172A] shadow-[5px_5px_0px_#0F172A] overflow-hidden bg-[#99D5B9]"
            >
              <img
                src="/images/landing/cartoon-street.jpg"
                alt="Genncore Street Creative Team"
                className="w-full h-64 sm:h-80 object-cover object-center"
              />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ===================================================================== */}
      {/* 4.3 WORKFLOW INTRO (MAKE YOUR MOVE)                                   */}
      {/* ===================================================================== */}
      <section className="relative z-10 pb-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: EASE_CARTOON }}
          className="rounded-3xl bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-7 items-center overflow-hidden"
        >
          {/* Left: Cartoon Poster Artwork */}
          <div className="lg:col-span-5">
            <motion.div
              whileHover={{ rotate: -1.5, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="rounded-2xl border-2 border-[#0F172A] shadow-[5px_5px_0px_#0F172A] overflow-hidden bg-[#FCE83A] max-w-sm mx-auto"
            >
              <img
                src="/images/landing/cartoon-move.jpg"
                alt="Make Your Move with Genncore"
                className="w-full h-72 sm:h-88 object-contain"
              />
            </motion.div>
          </div>

          {/* Right: 3-Step Intro */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDE047] border-2 border-[#0F172A] text-[11px] font-black text-[#0F172A]">
              <Flame className="w-3.5 h-3.5 text-[#E11D48]" />
              Make Your Move
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] leading-tight">
              Bắt đầu nhịp học tập & làm việc hiệu quả chỉ với{' '}
              <span className="text-[#E11D48]">3 bước đơn giản</span>
            </h2>

            <div className="space-y-2.5">
              {[
                {
                  step: '01',
                  title: 'Lên kế hoạch ngày & tuần siêu nhanh',
                  desc: 'Sắp xếp block thời gian 24h hoặc kéo thẻ task sang cột Đang làm / Hoàn thành.',
                  badgeBg: 'bg-[#FFE4E6] text-[#E11D48]',
                },
                {
                  step: '02',
                  title: 'Học tiếng Anh & lưu từ vựng tức thì',
                  desc: 'Tra nghĩa song ngữ Anh↔Việt, nghe phát âm chuẩn và ôn tập flashcard ngay trên web.',
                  badgeBg: 'bg-[#FEF9C3] text-[#0F172A]',
                },
                {
                  step: '03',
                  title: 'Bật Deep Focus & giữ chuỗi tập trung',
                  desc: 'Kết hợp Pomodoro 25 phút với sóng âm 432Hz để vào guồng làm việc không xao nhãng.',
                  badgeBg: 'bg-[#DBEAFE] text-[#1D4ED8]',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] flex items-start gap-3"
                >
                  <span
                    className={`px-2.5 py-1 rounded-xl border-2 border-[#0F172A] text-xs font-black shrink-0 ${item.badgeBg}`}
                  >
                    {item.step}
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-[#0F172A]">{item.title}</p>
                    <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===================================================================== */}
      {/* 4.5 CARTOON ARTWORK & COMMUNITY BANNER                                */}
      {/* ===================================================================== */}
      <section className="relative z-10 pb-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: EASE_CARTOON }}
          className="rounded-3xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center overflow-hidden"
        >
          {/* Left: Cartoon Crowd Artwork */}
          <div className="lg:col-span-5">
            <motion.div
              whileHover={{ rotate: -1, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="rounded-2xl border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] overflow-hidden bg-white h-72 sm:h-80"
            >
              <img
                src="/images/landing/cartoon-crowd.jpg"
                alt="Genncore Cartoon Community"
                className="w-full h-full object-cover object-bottom"
              />
            </motion.div>
          </div>

          {/* Right: Story + Avatars Sheet Preview + CTA */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border-2 border-[#0F172A] text-[11px] font-black text-[#E11D48]">
              <Sparkles className="w-3.5 h-3.5" />
              Genncore Creative Workspace
            </span>

            <h3 className="text-2xl sm:text-3xl font-black text-[#0F172A] leading-tight">
              Thiết kế sinh động để mỗi ngày học và làm việc đều có cảm hứng!
            </h3>

            <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-2.5 shadow-[3px_3px_0px_#0F172A] flex items-center gap-3.5">
              <img
                src="/images/landing/cartoon-avatars.jpg"
                alt="Genncore Stickers"
                className="w-20 h-20 rounded-xl border border-[#0F172A] object-cover shrink-0"
              />
              <div className="space-y-1">
                <p className="text-xs font-black text-[#0F172A]">
                  Đồng bộ từ Web đến Mobile
                </p>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Lịch biểu 24h, Kanban, Từ điển Anh↔Việt và Gia sư IELTS 8.0+ luôn sẵn sàng cùng bạn mọi lúc.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/app"
                onClick={() => soundEngine.playPentatonicChime(5)}
                className="px-6 py-3 rounded-2xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-black text-xs border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0F172A] inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Bắt đầu ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===================================================================== */}
      {/* 4.8 AUTHOR SPOTLIGHT (CARTOON CREATOR CARD)                           */}
      {/* ===================================================================== */}
      <section className="relative z-10 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center max-w-lg mx-auto mb-8 space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-[#FEF08A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[10.5px] font-black uppercase tracking-wider text-[#0F172A]">
            Creator Spotlight
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
            Người đứng sau{' '}
            <span className="text-[#E11D48] underline decoration-wavy decoration-[#FACC15] underline-offset-4">
              Genncore
            </span>
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: EASE_CARTOON }}
          className="rounded-3xl bg-white border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] overflow-hidden"
        >
          {/* Cartoon Window Header */}
          <div className="px-5 py-3 border-b-2 border-[#0F172A] bg-[#FFF1F2] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E11D48] border-2 border-[#0F172A]" />
              <span className="w-3 h-3 rounded-full bg-[#FDE047] border-2 border-[#0F172A]" />
              <span className="w-3 h-3 rounded-full bg-[#4ADE80] border-2 border-[#0F172A]" />
              <span className="text-[11px] font-mono font-bold text-[#0F172A] ml-1.5">
                creator.profile
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FDE047] border-2 border-[#0F172A] text-[10px] font-black text-[#0F172A] -rotate-2">
              BUILDER
            </span>
          </div>

          <div className="p-5 sm:p-7 flex flex-col sm:flex-row items-center gap-6">
            <motion.div
              whileHover={{ rotate: -1.5, scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className="w-40 sm:w-44 aspect-[3/4] rounded-2xl border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] overflow-hidden shrink-0 bg-[#E11D48]"
            >
              <img
                src="/images/landing/author-kelvin.jpg"
                alt="Cao Bao Phuc (Kelvin Cao)"
                className="w-full h-full object-cover"
              />
            </motion.div>

            <div className="flex-1 text-center sm:text-left space-y-3">
              <span className="inline-block px-3 py-1 rounded-full bg-[#FFE4E6] border-2 border-[#0F172A] text-[10.5px] font-black uppercase tracking-wider text-[#E11D48]">
                Tác giả hệ thống
              </span>

              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
                  Cao Bao Phuc <span className="text-[#E11D48]">(Kelvin Cao)</span>
                </h3>
                <p className="text-xs sm:text-sm font-extrabold text-slate-600 mt-1">
                  AI Engineer / Software Engineer
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <a
                  href="mailto:phuccao083@gmail.com"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF1F2] hover:bg-[#FFE4E6] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-extrabold text-[#0F172A] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#E11D48]" />
                  <span>phuccao083@gmail.com</span>
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                <Link
                  href="/app"
                  onClick={() => soundEngine.playPentatonicChime(4)}
                  className="px-4 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-black text-xs border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Vào Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSoftClick();
                    setIsContactOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] font-extrabold text-xs border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#E11D48]" />
                  <span>Liên hệ / Góp ý</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===================================================================== */}
      {/* 5. CARTOON STUDIO FOOTER                                              */}
      {/* ===================================================================== */}
      <footer className="relative z-10 border-t-2 border-[#0F172A] bg-[#FFF1F2] py-10 px-4 sm:px-6 lg:px-8 mt-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                <img src="/images/logo-wordmark.png" alt="GENNCORE" className="block h-5 w-auto object-contain" />
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-[#FDE047] border-2 border-[#0F172A] text-[10px] font-black text-[#0F172A] -rotate-2">
                STUDIO
              </span>
            </div>
            <p className="text-xs font-bold text-slate-700">
              Phát triển bởi <strong className="text-[#0F172A]">Cao Bao Phuc (Kelvin Cao)</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs">
            <a
              href="#showcase"
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] font-extrabold text-[#0F172A] transition-colors"
            >
              Portfolio
            </a>
            <a
              href="#preview"
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] font-extrabold text-[#0F172A] transition-colors"
            >
              Trải nghiệm
            </a>
            <a
              href="#modules"
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] font-extrabold text-[#0F172A] transition-colors"
            >
              Mô-đun
            </a>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSoftClick();
                setIsContactOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-black cursor-pointer transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Góp ý</span>
            </button>
            <span className="text-slate-600 font-extrabold ml-1">
              © {new Date().getFullYear()} Genncore
            </span>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialTab={authInitialTab}
        onAuthSuccess={(user) => {
          setAuthUser(user);
          router.push('/app');
        }}
      />

      {isContactOpen && (
        <div
          onClick={() => setIsContactOpen(false)}
          className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-[#0F172A]">Gửi góp ý cho Genncore</h3>
              <button
                type="button"
                onClick={() => setIsContactOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {contactSent ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-sm font-black text-[#0F172A]">Đã gửi thành công!</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  soundEngine.playPentatonicChime(4);
                  setContactSent(true);
                  setTimeout(() => {
                    setIsContactOpen(false);
                    setContactSent(false);
                    setContactName('');
                    setContactEmail('');
                    setContactMsg('');
                  }, 1500);
                }}
                className="space-y-3"
              >
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Tên của bạn"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#0F172A] text-xs font-semibold outline-none focus:bg-[#FFF1F2]"
                />
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Email liên hệ"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#0F172A] text-xs font-semibold outline-none focus:bg-[#FFF1F2]"
                />
                <textarea
                  rows={3}
                  required
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  placeholder="Nội dung góp ý..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#0F172A] text-xs font-semibold outline-none focus:bg-[#FFF1F2] resize-none"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
