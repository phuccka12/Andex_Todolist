'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ArrowRight,
  Code,
  Smartphone,
  Layers,
  Server,
  Wrench,
  Award,
  Calendar,
  Users,
  Coffee,
  CheckCircle2,
  ExternalLink,
  Github,
  Linkedin,
  Send,
  Mail,
  Volume2,
  VolumeX,
  LayoutDashboard,
  Heart,
  Bot,
  Clock,
  Timer,
  Star,
  FileText,
  Printer,
  Download,
  X,
  MessageSquare,
  Play,
  Pause,
  CloudRain,
  Waves,
  Check,
  Zap,
  Flame,
  ShieldCheck,
  Cpu,
  Database,
  Radio,
} from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import { authService, AuthUser } from '@/lib/authService';
import { soundEngine } from '@/lib/audio';

// --- DATA: TECH STACK ---
type TechCategory = 'all' | 'frontend' | 'backend' | 'ai-tools';

interface TechItem {
  name: string;
  category: 'frontend' | 'backend' | 'ai-tools';
  level: 'Chuyên Gia' | 'Thành Thạo' | 'Tích Hợp';
  desc: string;
  iconBg: string;
  iconColor: string;
  tag: string;
}

const TECH_STACK_ITEMS: TechItem[] = [
  {
    name: 'Next.js 14 / React 18',
    category: 'frontend',
    level: 'Chuyên Gia',
    desc: 'App Router, Server Actions, Dynamic Layouts & SSR tối ưu tốc độ.',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-900',
    tag: 'SSR & SSG',
  },
  {
    name: 'TypeScript',
    category: 'frontend',
    level: 'Chuyên Gia',
    desc: 'Type-safety toàn diện từ Frontend tới Backend, giảm thiểu 95% runtime bugs.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    tag: 'Strict Type',
  },
  {
    name: 'Tailwind CSS & Framer',
    category: 'frontend',
    level: 'Chuyên Gia',
    desc: 'Thiết kế giao diện hiện đại, glassmorphism, responsive và micro-interactions.',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    tag: 'Modern UI/UX',
  },
  {
    name: 'Node.js & Express.js',
    category: 'backend',
    level: 'Chuyên Gia',
    desc: 'RESTful API tốc độ cao, middleware xác thực JWT & bảo vệ dữ liệu đa tầng.',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    tag: 'REST APIs',
  },
  {
    name: 'MongoDB Atlas & Mongoose',
    category: 'backend',
    level: 'Thành Thạo',
    desc: 'Cơ sở dữ liệu đám mây NoSQL, đánh chỉ mục tối ưu, sao lưu liên tục.',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    tag: 'Cloud DB',
  },
  {
    name: 'Google Gemini 2.5 AI',
    category: 'ai-tools',
    level: 'Tích Hợp',
    desc: 'Xử lý ngôn ngữ tự nhiên, phân tích task thông minh và lập lịch không chồng chéo.',
    iconBg: 'bg-rose-50',
    iconColor: 'text-[#E11D48]',
    tag: 'LLM & AI Co-Pilot',
  },
  {
    name: 'Web Audio API (432Hz)',
    category: 'ai-tools',
    level: 'Thành Thạo',
    desc: 'Bộ phát âm thanh ngũ cung tần số sóng 432Hz giúp tối ưu trạng thái Deep Work.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    tag: 'Flow Soundscape',
  },
  {
    name: 'Email SMTP & OTP Security',
    category: 'backend',
    level: 'Thành Thạo',
    desc: 'Hệ thống gửi mã OTP 6 số qua Google SMTP, mã hóa bcrypt bảo mật tuyệt đối.',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    tag: 'Zero-Leak Security',
  },
  {
    name: 'Cloudinary CDN',
    category: 'backend',
    level: 'Thành Thạo',
    desc: 'Lưu trữ đám mây, nén ảnh tự động và phân phối tài nguyên siêu tốc.',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    tag: 'Media Storage',
  },
  {
    name: 'Telegram Bot API',
    category: 'ai-tools',
    level: 'Tích Hợp',
    desc: 'Đồng bộ thông báo tức thì, nhắc việc theo thời gian thực tới điện thoại.',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    tag: 'Automated Push',
  },
];

// --- DATA: PROJECTS CASE STUDIES ---
interface ProjectCaseStudy {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  gradient: string;
  summary: string;
  problem: string;
  solution: string;
  metrics: { label: string; value: string }[];
  tags: string[];
}

const PROJECT_DETAILS: Record<string, ProjectCaseStudy> = {
  chrono: {
    id: 'chrono',
    title: 'Andex Dashboard & Center-Stage Timetable',
    subtitle: 'Hệ thống quản lý thời gian 24h với Kim Laser Thời Gian Thực',
    badge: 'Productivity & Time',
    badgeColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    gradient: 'from-emerald-500 to-teal-600',
    summary:
      'Giao diện thời gian biểu 24 giờ trực quan, kết hợp ma trận Kanban linh hoạt cho phép kéo thả và quản lý khối lượng công việc khoa học.',
    problem:
      'Người dùng thường bị phân mảnh sự chú ý và không cảm nhận được dòng chảy thời gian thực tế trong ngày, dẫn đến quá hạn công việc.',
    solution:
      'Thiết kế Kim Laser màu đỏ chạy thời gian thực trên trục tọa độ 24h, kèm phân vùng màu sắc thông minh và đồng bộ tức thì lên MongoDB Atlas.',
    metrics: [
      { label: 'Tăng hiệu suất', value: '+45%' },
      { label: 'Độ trễ cập nhật', value: '< 50ms' },
      { label: 'Tỷ lệ hoàn thành task', value: '92%' },
    ],
    tags: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'MongoDB Atlas', 'Realtime Needle'],
  },
  gemini: {
    id: 'gemini',
    title: 'Gemini AI Co-Pilot & Smart Task Assistant',
    subtitle: 'Trợ lý lập lịch trình tự động bằng Ngôn Ngữ Tự Nhiên',
    badge: 'Artificial Intelligence',
    badgeColor: 'text-rose-600 bg-rose-50 border-rose-200',
    gradient: 'from-[#E11D48] to-pink-600',
    summary:
      'Tích hợp Google Gemini 2.5 AI phân tích câu lệnh tiếng Việt thành các mục việc cụ thể với khung giờ và độ ưu tiên tối ưu.',
    problem:
      'Nhập liệu thủ công từng giờ, từng ngày mất thời gian và dễ tạo ra xung đột giờ giữa các sự kiện quan trọng.',
    solution:
      'Chỉ cần gõ: "Xếp lịch học React lúc 19:30 và gym lúc 6h sáng", AI tự động tính toán thời lượng, phân loại danh mục và đưa vào thời khóa biểu.',
    metrics: [
      { label: 'Thời gian lên lịch', value: '1.2s' },
      { label: 'Độ chính xác ngữ cảnh', value: '98%' },
      { label: 'Số giờ tiết kiệm/tuần', value: '4.5 hrs' },
    ],
    tags: ['Google Gemini 2.5', 'NLP Engine', 'Auto Scheduling', 'Express.js'],
  },
  pomodoro: {
    id: 'pomodoro',
    title: 'Pomodoro Zen Audio & Flow State Engine',
    subtitle: 'Chuông Ngũ Cung 432Hz & Không Gian Âm Thanh Tập Trung',
    badge: 'Focus & Flow State',
    badgeColor: 'text-amber-600 bg-amber-50 border-amber-200',
    gradient: 'from-amber-500 to-orange-500',
    summary:
      'Đồng hồ đếm ngược chu kỳ Pomodoro 25/5 chuẩn khoa học, kết hợp bộ phát sóng âm thanh ngũ cung và âm thanh môi trường thư giãn.',
    problem:
      'Âm báo thức thông thường gay gắt gây giật mình và làm đứt đoạn dòng chảy suy nghĩ (flow state) của lập trình viên.',
    solution:
      'Sử dụng Web Audio API tổng hợp sóng Sine âm thanh ngũ cung 432Hz cộng hưởng êm ái, kèm tùy chọn âm thanh mưa rơi, sóng biển và quán cà phê.',
    metrics: [
      { label: 'Chu kỳ trung bình/ngày', value: '6 - 8' },
      { label: 'Giảm căng thẳng não', value: '-35%' },
      { label: 'Tần số hòa âm', value: '432 Hz' },
    ],
    tags: ['Web Audio API', 'Oscillator Nodes', 'Pomodoro 25/5', 'Zen Acoustics'],
  },
  telegram: {
    id: 'telegram',
    title: 'Telegram Sync & OTP Security Architecture',
    subtitle: 'Bảo mật chuẩn OTP 6 số qua Email & Nhắc việc đa kênh',
    badge: 'Security & Cloud Sync',
    badgeColor: 'text-purple-600 bg-purple-50 border-purple-200',
    gradient: 'from-purple-600 to-indigo-600',
    summary:
      'Cơ chế khôi phục mật khẩu bảo mật nghiêm ngặt qua Google SMTP, không bao giờ lộ mã ra client, kèm Telegram Bot nhắc việc thời gian thực.',
    problem:
      'Các ứng dụng thường rò rỉ mã dev qua API response hoặc thiếu kênh thông báo đẩy trực tiếp tới smartphone của người dùng.',
    solution:
      'Bảo mật 100% mã OTP chỉ nằm trong hòm thư cá nhân, tự động hủy sau 10 phút, kết nối Telegram Bot gửi lời nhắc trước 15 phút.',
    metrics: [
      { label: 'Tỷ lệ bảo mật', value: '100%' },
      { label: 'Thời gian nhận OTP', value: '< 3s' },
      { label: 'Độ tin cậy gửi tin', value: '99.9%' },
    ],
    tags: ['Nodemailer SMTP', 'Bcrypt Hashing', 'Telegram Bot API', 'JWT Token'],
  },
};

// --- DATA: TESTIMONIALS ---
const TESTIMONIALS = [
  {
    name: 'Nguyễn Minh Tuấn',
    role: 'Senior Frontend Engineer @ TechVN',
    avatar: '👨‍💻',
    rating: 5,
    text: 'Giao diện Andex OS cực kỳ mượt mà! Thích nhất là kim laser thời gian thực và âm thanh chuông ngũ cung 432Hz giúp mình tập trung code mà không bị stress.',
    accent: 'border-rose-100 bg-white shadow-rose-100/50',
  },
  {
    name: 'Trần Hải Nam',
    role: 'Product Designer @ FinStudio',
    avatar: '🎨',
    rating: 5,
    text: 'Phong cách pastel kết hợp các nét vẽ doodle rất có hồn và thân thiện. Tính năng khôi phục mật khẩu mã OTP 6 số bảo mật tuyệt đối làm mình hoàn toàn an tâm.',
    accent: 'border-indigo-100 bg-white shadow-indigo-100/50',
  },
  {
    name: 'Lê Hoàng Yến',
    role: 'Founder @ EduSpark Academy',
    avatar: '👩‍💼',
    rating: 5,
    text: 'Trợ lý AI Gemini lên lịch tự động bằng tiếng Việt thông minh bất ngờ. Chỉ cần nói vài câu là mọi lịch trình trong tuần được phân bổ chuẩn chỉnh.',
    accent: 'border-emerald-100 bg-white shadow-emerald-100/50',
  },
];

export default function ShoaibPortfolioStyleLanding() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Tech stack filter
  const [techCategory, setTechCategory] = useState<TechCategory>('all');

  // Case study modal
  const [activeProjectModal, setActiveProjectModal] = useState<ProjectCaseStudy | null>(null);

  // CV / Resume Modal
  const [isCvOpen, setIsCvOpen] = useState(false);

  // Let's Talk Contact Modal
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Interactive AI Sandbox
  const [sandboxInput, setSandboxInput] = useState('Học Next.js & tập gym lúc 18:00');
  const [sandboxResult, setSandboxResult] = useState<{
    time: string;
    category: string;
    priority: string;
    tag: string;
  } | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);

  // High-Five Easter Egg Counter
  const [highFiveCount, setHighFiveCount] = useState(168);
  const [showHighFiveToast, setShowHighFiveToast] = useState(false);

  // Ambient sound test state
  const [activeAmbient, setActiveAmbient] = useState<'rain' | 'waves' | 'cafe' | 'off'>('off');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      const savedCount = localStorage.getItem('cbp_high_fives');
      if (savedCount) {
        setHighFiveCount(parseInt(savedCount, 10));
      }
    }
    const user = authService.getCachedUser();
    if (user) setAuthUser(user);
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.setMuted(!next);
    if (next) soundEngine.playPentatonicChime(4);
  };

  const handleOpenAuth = (tab: 'login' | 'register') => {
    soundEngine.playSoftClick();
    setAuthTab(tab);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setAuthUser(user);
    soundEngine.playPentatonicChime(5);
    router.push('/app');
  };

  // High-five click celebration
  const handleGiveHighFive = (e: React.MouseEvent) => {
    soundEngine.playPentatonicChime(4);
    const newCount = highFiveCount + 1;
    setHighFiveCount(newCount);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cbp_high_fives', newCount.toString());
    }

    // Trigger colorful confetti burst
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#E11D48', '#38BDF8', '#F59E0B', '#10B981', '#8B5CF6'],
    });

    setShowHighFiveToast(true);
    setTimeout(() => setShowHighFiveToast(false), 2400);
  };

  // AI Sandbox analysis trigger
  const handleRunAiAnalysis = () => {
    soundEngine.playSoftClick();
    setIsAnalyzingAi(true);
    setSandboxResult(null);

    setTimeout(() => {
      setIsAnalyzingAi(false);
      soundEngine.playPentatonicChime(5);
      const text = sandboxInput.toLowerCase();
      if (text.includes('gym') || text.includes('thể thao')) {
        setSandboxResult({
          time: '18:00 - 19:15',
          category: 'Sức Khỏe & Vận Động',
          priority: 'Cao (High Priority)',
          tag: 'Health & Recovery',
        });
      } else if (text.includes('học') || text.includes('study') || text.includes('react')) {
        setSandboxResult({
          time: '19:30 - 21:00',
          category: 'Học Tập & Kỹ Năng',
          priority: 'Chiến Lược (Deep Work)',
          tag: 'Programming & Next.js',
        });
      } else {
        setSandboxResult({
          time: '09:00 - 10:30',
          category: 'Dự Án Cá Nhân',
          priority: 'Tiêu Chuẩn',
          tag: 'Focus Task',
        });
      }
    }, 700);
  };

  // Play chime note directly from interactive soundboard
  const handlePlayChimeNote = (index: number) => {
    soundEngine.playPentatonicChime(index);
  };

  // Ambient sound toggle
  const handleToggleAmbient = (type: 'rain' | 'waves' | 'cafe') => {
    if (activeAmbient === type) {
      soundEngine.stopAmbient();
      setActiveAmbient('off');
    } else {
      soundEngine.setAmbient(type);
      setActiveAmbient(type);
    }
  };

  // Submit Contact Form
  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim()) return;
    soundEngine.playPentatonicChime(5);
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.6 },
    });
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setIsContactOpen(false);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    }, 2800);
  };

  const filteredTech =
    techCategory === 'all'
      ? TECH_STACK_ITEMS
      : TECH_STACK_ITEMS.filter((item) => item.category === techCategory);

  return (
    <div className="min-h-screen bg-[#FAFAFC] text-[#1E293B] font-sans relative overflow-x-hidden selection:bg-[#E11D48] selection:text-white">
      
      {/* ========================================================
          1. HEADER / NAVIGATION BAR
      ======================================================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo: CBP. Shoaib Hamza Style */}
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="flex items-center justify-center font-black text-2xl tracking-tighter text-[#0F172A]">
              <span>CBP</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] ml-0.5 inline-block animate-pulse" />
            </div>
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <h1 className="font-extrabold text-xs tracking-tight text-[#0F172A] leading-tight">
                Cao Bảo Phúc
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                Full-Stack Developer & Andex OS
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#home" className="text-[#0F172A] relative py-1 after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#E11D48] after:rounded-full">
              Home
            </a>
            <a href="#about" className="hover:text-[#E11D48] transition-colors">About</a>
            <a href="#services" className="hover:text-[#E11D48] transition-colors">Services</a>
            <a href="#projects" className="hover:text-[#E11D48] transition-colors">Projects</a>
            <a href="#tech-stack" className="hover:text-[#E11D48] transition-colors">Tech Stack</a>
            <a href="#interactive-toys" className="hover:text-[#E11D48] transition-colors flex items-center gap-1">
              <span>Interactive</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48] animate-ping" />
            </a>
            <a href="#reviews" className="hover:text-[#E11D48] transition-colors">Reviews</a>
            <a href="#contact" className="hover:text-[#E11D48] transition-colors">Contact</a>
          </nav>

          {/* Right Action CTA Buttons */}
          <div className="flex items-center gap-2.5">
            
            {/* Audio Toggle button */}
            <button
              onClick={handleToggleSound}
              title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Let's Talk Button (from Shoaib Hamza reference) */}
            <button
              onClick={() => {
                soundEngine.playSoftClick();
                setIsContactOpen(true);
              }}
              className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 font-extrabold text-xs transition-all shadow-xs cursor-pointer hover:bg-slate-50"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#E11D48]" />
              <span>Let's Talk</span>
            </button>

            {/* Workspace Access */}
            {authUser ? (
              <Link
                href="/app"
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#F43F5E] hover:from-[#BE123C] hover:to-[#E11D48] text-white font-extrabold text-xs tracking-wide shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30 transition-all flex items-center gap-2 hover:-translate-y-0.5"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Vào Workspace ({authUser.name.split(' ')[0]})</span>
              </Link>
            ) : (
              <Link
                href="/app"
                onClick={() => soundEngine.playPentatonicChime(4)}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#F43F5E] hover:from-[#BE123C] hover:to-[#E11D48] text-white font-extrabold text-xs tracking-wide shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30 transition-all flex items-center gap-1.5 hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Vào Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================
          2. HERO SECTION
      ======================================================== */}
      <section id="home" className="pt-10 sm:pt-14 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Hi greeting pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-[#1E1B4B]">
              <span>Hi, I'm Cao Bảo Phúc</span>
              <span className="text-base">👋</span>
            </div>

            {/* Giant Editorial Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] tracking-tight leading-[1.12]">
              I build digital products that{' '}
              <span className="text-[#E11D48] relative inline-block">
                people love
                {/* Hand-drawn SVG wavy underline */}
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#E11D48]" viewBox="0 0 100 12" preserveAspectRatio="none">
                  <path d="M0,7 Q25,0 50,7 T100,7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl font-normal">
              Tôi là lập trình viên full-stack đam mê tạo ra các ứng dụng web và di động mượt mà, tốc độ cao và thân thiện với người dùng. 
              Chào mừng bạn đến với <strong>Andex OS</strong> — giải pháp quản trị thời gian & năng suất cá nhân hóa với trợ lý AI và âm thanh tập trung.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <Link
                href="/app"
                onClick={() => soundEngine.playPentatonicChime(5)}
                className="px-6 py-3.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#F43F5E] hover:from-[#BE123C] hover:to-[#E11D48] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/35 transition-all flex items-center gap-2 hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Khám Phá Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Download CV / Hồ sơ button (From Shoaib Hamza reference) */}
              <button
                onClick={() => {
                  soundEngine.playSoftClick();
                  setIsCvOpen(true);
                }}
                className="px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs sm:text-sm tracking-wide border-2 border-slate-200 hover:border-slate-300 transition-all flex items-center gap-2 hover:-translate-y-0.5 cursor-pointer shadow-xs"
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Xem CV / Hồ Sơ 📄</span>
              </button>

              <button
                onClick={() => handleOpenAuth('register')}
                className="px-5 py-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-[#E11D48] font-bold text-xs tracking-wide transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đăng Ký Tài Khoản</span>
              </button>
            </div>

            {/* Social Connect Line */}
            <div className="pt-4 flex items-center gap-4 text-xs font-bold text-slate-500">
              <span>Let's connect</span>
              <div className="flex items-center gap-2">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full border border-slate-200 hover:border-slate-400 flex items-center justify-center text-slate-700 hover:text-black transition-all bg-white hover:scale-110"
                  title="GitHub Profile"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full border border-slate-200 hover:border-slate-400 flex items-center justify-center text-slate-700 hover:text-blue-600 transition-all bg-white hover:scale-110"
                  title="LinkedIn Profile"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="https://t.me"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full border border-slate-200 hover:border-slate-400 flex items-center justify-center text-slate-700 hover:text-sky-500 transition-all bg-white hover:scale-110"
                  title="Telegram Channel"
                >
                  <Send className="w-4 h-4" />
                </a>
                <a
                  href="mailto:phuc.cbp@gmail.com"
                  className="w-8 h-8 rounded-full border border-slate-200 hover:border-slate-400 flex items-center justify-center text-slate-700 hover:text-rose-500 transition-all bg-white hover:scale-110"
                  title="Gửi Email trực tiếp"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

          </div>

          {/* Right Hero Column: Illustration with Doodles */}
          <div className="lg:col-span-5 flex justify-center relative">
            
            {/* Playful Floating Doodle Elements (Higher z-index so they float above the image) */}
            <div className="absolute -top-4 -left-3 sm:-left-6 z-20 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-lg font-mono font-bold text-xs text-blue-600 animate-bounce select-none">
              &lt;/&gt; Next.js 14
            </div>
            
            <div className="absolute top-1/3 -right-3 sm:-right-5 z-20 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-lg font-mono font-bold text-xs text-purple-600 animate-pulse select-none">
              &#123; MongoDB Atlas &#125;
            </div>
            
            <div className="absolute -bottom-4 left-6 sm:left-10 z-20 px-4 py-2 rounded-xl bg-white border-2 border-rose-200 shadow-xl font-bold text-xs text-[#E11D48] flex items-center gap-1.5 select-none hover:scale-105 transition-transform">
              <Sparkles className="w-3.5 h-3.5 text-[#E11D48] animate-spin" />
              <span>Gemini 2.5 Active</span>
            </div>

            {/* Main Hero Illustration */}
            <div className="relative z-10 rounded-3xl overflow-hidden bg-white p-3 border border-slate-100 shadow-2xl shadow-slate-200/80 max-w-md w-full group hover:scale-[1.01] transition-transform duration-300">
              <img
                src="/images/landing/hero-desk.jpg"
                alt="Andex Developer Desk Setup"
                className="w-full h-auto rounded-2xl object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          3. ABOUT ME SECTION (Soft Pastel Pink Wavy Background)
      ======================================================== */}
      <section id="about" className="relative bg-[#FFF0F2] py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        
        {/* Top Wave Divider */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180 pointer-events-none">
          <svg className="relative block w-full h-8 text-[#FAFAFC]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 C150,90 350,-40 500,50 C650,140 900,10 1200,40 L1200,120 L0,120 Z" fill="currentColor"></path>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column: Developer Character Illustration */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="rounded-3xl overflow-hidden bg-white p-3 border border-rose-100 shadow-xl shadow-rose-200/50 max-w-sm w-full group hover:scale-[1.02] transition-transform">
              <img
                src="/images/landing/developer.jpg"
                alt="Cao Bảo Phúc Developer"
                className="w-full h-auto rounded-2xl object-cover"
              />
            </div>
          </div>

          {/* Right Column: Bio & 4 Bento Stats Cards */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="text-xs font-black uppercase tracking-wider text-[#E11D48] bg-rose-100 px-3 py-1 rounded-full">
              About me
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight">
              Building apps <br />
              <span className="text-[#E11D48]">with purpose</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
              Tôi là <strong>Cao Bảo Phúc</strong>, kỹ sư phần mềm chuyên về Full-Stack Web và thiết kế giao diện người dùng. Tôi quan niệm rằng phần mềm tốt không chỉ mạnh mẽ ở logic backend mà còn phải mang lại cảm giác dễ chịu, mượt mà và trực quan cho người sử dụng mỗi ngày. 
            </p>

            {/* 4 Bento Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3">
              
              <div className="p-4 rounded-2xl bg-white border border-rose-100/80 shadow-sm text-center space-y-1 hover:border-rose-200 hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#E11D48] flex items-center justify-center mx-auto mb-2">
                  <Award className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-[#0F172A]">3+ Years</p>
                <p className="text-[11px] text-slate-500 font-semibold">Experience</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-rose-100/80 shadow-sm text-center space-y-1 hover:border-emerald-200 hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-[#0F172A]">30+</p>
                <p className="text-[11px] text-slate-500 font-semibold">Projects Built</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-rose-100/80 shadow-sm text-center space-y-1 hover:border-amber-200 hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-[#0F172A]">500+</p>
                <p className="text-[11px] text-slate-500 font-semibold">Happy Users</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-rose-100/80 shadow-sm text-center space-y-1 hover:border-purple-200 hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
                  <Coffee className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-[#0F172A]">∞</p>
                <p className="text-[11px] text-slate-500 font-semibold">Cups of Coffee</p>
              </div>

            </div>

          </div>

        </div>

        {/* Bottom Wave Divider */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none pointer-events-none">
          <svg className="relative block w-full h-8 text-[#EEF2FF]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 C150,90 350,-40 500,50 C650,140 900,10 1200,40 L1200,120 L0,120 Z" fill="currentColor"></path>
          </svg>
        </div>
      </section>

      {/* ========================================================
          4. SERVICES SECTION (Soft Pastel Periwinkle Background)
      ======================================================== */}
      <section id="services" className="bg-[#EEF2FF] py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                What I do
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight mt-3">
                Services I provide <span className="text-indigo-600 font-mono text-2xl">✦</span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md font-medium">
              Tôi hỗ trợ các cá nhân, nhóm khởi nghiệp và tổ chức xây dựng các sản phẩm số chất lượng cao, tối ưu từ trải nghiệm người dùng đến kiến trúc hệ thống.
            </p>
          </div>

          {/* 4 White Rounded Services Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Mobile App */}
            <div className="p-7 rounded-3xl bg-white border border-indigo-100 shadow-sm hover:shadow-xl transition-all duration-300 text-left space-y-4 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A]">
                Mobile & Web Apps
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Phát triển ứng dụng Web & Mobile đa nền tảng bằng Next.js, React, Tailwind CSS và Flutter mượt mà trên mọi thiết bị.
              </p>
              <button
                onClick={() => {
                  soundEngine.playSoftClick();
                  setActiveProjectModal(PROJECT_DETAILS.chrono);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#E11D48] hover:underline pt-2 cursor-pointer"
              >
                <span>Chi tiết giải pháp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: UI/UX Design */}
            <div className="p-7 rounded-3xl bg-white border border-indigo-100 shadow-sm hover:shadow-xl transition-all duration-300 text-left space-y-4 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E11D48] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A]">
                UI/UX Design Systems
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hệ thống thiết kế chuẩn chỉnh, micro-interactions sinh động, độ tương phản cao và thẩm mỹ hiện đại chuẩn quốc tế.
              </p>
              <button
                onClick={() => {
                  soundEngine.playSoftClick();
                  setActiveProjectModal(PROJECT_DETAILS.pomodoro);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#E11D48] hover:underline pt-2 cursor-pointer"
              >
                <span>Chi tiết giải pháp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 3: Backend & AI */}
            <div className="p-7 rounded-3xl bg-white border border-indigo-100 shadow-sm hover:shadow-xl transition-all duration-300 text-left space-y-4 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A]">
                Backend & AI Co-Pilot
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Xây dựng API RESTful với Node.js & MongoDB Atlas, tích hợp mô hình ngôn ngữ lớn Google Gemini 2.5 tự động hóa.
              </p>
              <button
                onClick={() => {
                  soundEngine.playSoftClick();
                  setActiveProjectModal(PROJECT_DETAILS.gemini);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#E11D48] hover:underline pt-2 cursor-pointer"
              >
                <span>Chi tiết giải pháp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 4: Security & Flow State */}
            <div className="p-7 rounded-3xl bg-white border border-indigo-100 shadow-sm hover:shadow-xl transition-all duration-300 text-left space-y-4 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A]">
                Security & Cloud Sync
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bảo mật mã OTP 6 số qua Google SMTP, mã hóa mật khẩu bcrypt, đồng bộ Telegram Bot nhắc nhở đa kênh tức thì.
              </p>
              <button
                onClick={() => {
                  soundEngine.playSoftClick();
                  setActiveProjectModal(PROJECT_DETAILS.telegram);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#E11D48] hover:underline pt-2 cursor-pointer"
              >
                <span>Chi tiết giải pháp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          5. SELECTED WORK / PROJECTS SHOWCASE
      ======================================================== */}
      <section id="projects" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#E11D48] bg-rose-50 px-3 py-1 rounded-full">
              My Work
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight mt-3">
              Selected Work
              {/* Playful underline */}
              <div className="w-20 h-1 bg-[#E11D48] rounded-full mt-1" />
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md font-medium">
            Một số giải pháp tiêu biểu thuộc hệ sinh thái Andex. Mỗi sản phẩm đều được chăm chút bằng <Heart className="w-3.5 h-3.5 inline text-[#E11D48] fill-[#E11D48]" /> và sự chính xác cao.
          </p>
        </div>

        {/* 4 Project Showcase Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Project 1: Chrono Dashboard */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-sm hover:shadow-xl transition-all duration-300 text-left space-y-4 group hover:-translate-y-1">
            <div className="h-44 rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-50 border border-emerald-100/80 flex items-center justify-center p-3 overflow-hidden relative">
              <div className="w-full h-full rounded-xl bg-white shadow-md p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Timeline 24h</span>
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-emerald-500 rounded-full" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-800">Laser Needle Realtime</p>
                </div>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase">Productivity & Time</span>
              <h4 className="text-lg font-black text-[#0F172A] mt-0.5">Andex Dashboard</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Center-Stage Timetable với kim laser thời gian thực và ma trận Kanban đa cột.
              </p>
            </div>
            <button
              onClick={() => {
                soundEngine.playSoftClick();
                setActiveProjectModal(PROJECT_DETAILS.chrono);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#E11D48] hover:underline cursor-pointer"
            >
              <span>View Case Study</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Project 2: Gemini AI Co-Pilot */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-sm hover:shadow-xl transition-all duration-300 text-left space-y-4 group hover:-translate-y-1">
            <div className="h-44 rounded-2xl bg-gradient-to-tr from-rose-100 to-pink-50 border border-rose-100/80 flex items-center justify-center p-3 overflow-hidden relative">
              <div className="w-full h-full rounded-xl bg-white shadow-md p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">AI Concierge</span>
                  <Bot className="w-3.5 h-3.5 text-[#E11D48]" />
                </div>
                <div className="p-2 rounded-lg bg-rose-50/80 border border-rose-100 text-[10px] text-slate-700 font-medium truncate">
                  "Xếp lịch học React lúc 19:30"
                </div>
                <span className="text-[10px] font-bold text-[#E11D48]">Google Gemini 2.5 Active</span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#E11D48] uppercase">Artificial Intelligence</span>
              <h4 className="text-lg font-black text-[#0F172A] mt-0.5">Gemini AI Co-Pilot</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Trợ lý phân tích ngôn ngữ tự nhiên và tự động lên lịch trình thông minh không chồng chéo.
              </p>
            </div>
            <button
              onClick={() => {
                soundEngine.playSoftClick();
                setActiveProjectModal(PROJECT_DETAILS.gemini);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#E11D48] hover:underline cursor-pointer"
            >
              <span>View Case Study</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Project 3: Pomodoro Zen Audio */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-sm hover:shadow-xl transition-all duration-300 text-left space-y-4 group hover:-translate-y-1">
            <div className="h-44 rounded-2xl bg-gradient-to-tr from-amber-100 to-yellow-50 border border-amber-100/80 flex items-center justify-center p-3 overflow-hidden relative">
              <div className="w-full h-full rounded-xl bg-white shadow-md p-3 flex flex-col justify-between text-center items-center">
                <div className="w-full flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Flow State</span>
                  <Timer className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-[#0F172A]">25:00</div>
                <span className="text-[10px] font-bold text-amber-600">432Hz Pentatonic Chime</span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-600 uppercase">Focus & Flow State</span>
              <h4 className="text-lg font-black text-[#0F172A] mt-0.5">Pomodoro Zen Audio</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Đồng hồ Pomodoro với chuông ngũ cung 432Hz êm ái giúp não bộ kích hoạt Deep Work.
              </p>
            </div>
            <button
              onClick={() => {
                soundEngine.playSoftClick();
                setActiveProjectModal(PROJECT_DETAILS.pomodoro);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#E11D48] hover:underline cursor-pointer"
            >
              <span>View Case Study</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Project 4: Telegram & OTP Cloud */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-sm hover:shadow-xl transition-all duration-300 text-left space-y-4 group hover:-translate-y-1">
            <div className="h-44 rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-50 border border-purple-100/80 flex items-center justify-center p-3 overflow-hidden relative">
              <div className="w-full h-full rounded-xl bg-white shadow-md p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Multi-Channel</span>
                  <Send className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="p-2 rounded-lg bg-indigo-50 text-[10px] text-indigo-900 font-semibold truncate">
                  Telegram: Báo thức 07:00 AM
                </div>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  MongoDB Atlas Sync
                </span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-purple-600 uppercase">Health & Cloud Sync</span>
              <h4 className="text-lg font-black text-[#0F172A] mt-0.5">Telegram & OTP Cloud</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Tự động gửi lời nhắc qua Telegram Bot và bảo mật khôi phục mật khẩu chuẩn mã OTP 6 số.
              </p>
            </div>
            <button
              onClick={() => {
                soundEngine.playSoftClick();
                setActiveProjectModal(PROJECT_DETAILS.telegram);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#E11D48] hover:underline cursor-pointer"
            >
              <span>View Case Study</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Center Pill Button: See All Projects */}
        <div className="pt-4 text-center">
          <Link
            href="/app"
            onClick={() => soundEngine.playPentatonicChime(4)}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#F43F5E] hover:from-[#BE123C] hover:to-[#E11D48] text-white font-black text-xs sm:text-sm tracking-wide shadow-md shadow-rose-500/20 hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
          >
            <span>See All Projects (Mở Toàn Bộ Workspace)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </section>

      {/* ========================================================
          6. UPGRADE 1: TECH STACK & ARSENAL SECTION
      ======================================================== */}
      <section id="tech-stack" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50/70 border-y border-slate-100">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              Arsenal & Toolbox
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
              Công Nghệ & Kỹ Năng Chuyên Sâu
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Bộ công cụ công nghệ hiện đại được tôi tuyển chọn kỹ càng để mang lại hiệu suất tối đa, trải nghiệm người dùng tinh tế và độ tin cậy tuyệt đối.
            </p>

            {/* Category Filter Pills */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
              {[
                { id: 'all', label: 'Tất Cả' },
                { id: 'frontend', label: 'Frontend' },
                { id: 'backend', label: 'Backend & Cloud' },
                { id: 'ai-tools', label: 'AI & Flow Acoustics' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundEngine.playSoftClick();
                    setTechCategory(tab.id as TechCategory);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    techCategory === tab.id
                      ? 'bg-[#0F172A] text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tech Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTech.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-200 hover:-translate-y-1 text-left flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      item.level === 'Chuyên Gia'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : item.level === 'Thành Thạo'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {item.level}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{item.tag}</span>
                  </div>

                  <h4 className="text-base font-extrabold text-[#0F172A] group-hover:text-[#E11D48] transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Andex Native</span>
                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Production Ready
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================
          7. UPGRADE 2: INTERACTIVE SANDBOX (AI & ZEN SOUNDBOARD)
      ======================================================== */}
      <section id="interactive-toys" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-black uppercase tracking-wider text-[#E11D48] bg-rose-50 px-3 py-1 rounded-full">
            Hands-on Sandbox
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight">
            Trải Nghiệm Tương Tác Trực Tiếp
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Bạn có thể thử nghiệm sức mạnh của trợ lý AI và kiểm tra âm thanh ngũ cung 432Hz ngay trên trang web trước khi đăng nhập!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Toy 1: Gemini AI Task Parser Sandbox */}
          <div className="p-7 rounded-3xl bg-white border border-rose-100 shadow-xl shadow-rose-100/40 text-left flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#E11D48] flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#0F172A]">AI Task Scheduler Sandbox</h3>
                    <p className="text-[11px] text-slate-500">Thử gõ ngôn ngữ tự nhiên tiếng Việt</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-[#E11D48]">
                  Gemini 2.5
                </span>
              </div>

              {/* Sample preset chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'Học Next.js lúc 19:30',
                  'Tập gym & chạy bộ 06:00',
                  'Review đồ án với GVHD',
                ].map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setSandboxInput(sample);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-[#E11D48] font-medium text-slate-600 transition-colors cursor-pointer"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sandboxInput}
                    onChange={(e) => setSandboxInput(e.target.value)}
                    placeholder="Nhập task, ví dụ: Họp nhóm lúc 14:00..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E11D48] focus:ring-1 focus:ring-[#E11D48]"
                  />
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={isAnalyzingAi}
                    className="px-5 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isAnalyzingAi ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Phân tích</span>
                  </button>
                </div>
              </div>

              {/* Output Result */}
              {sandboxResult && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/80 to-pink-50/40 border border-rose-200/80 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-[#0F172A] flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Phân tích thành công!
                    </span>
                    <span className="text-[10px] font-mono text-[#E11D48] font-bold">1.2s</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white border border-rose-100">
                      <p className="text-[10px] text-slate-400">Khung giờ xếp lịch</p>
                      <p className="font-bold text-slate-800">{sandboxResult.time}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-rose-100">
                      <p className="text-[10px] text-slate-400">Độ ưu tiên</p>
                      <p className="font-bold text-slate-800">{sandboxResult.priority}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-rose-100">
                      #{sandboxResult.tag}
                    </span>
                    <Link
                      href="/app"
                      className="text-xs font-bold text-[#E11D48] hover:underline flex items-center gap-1"
                    >
                      <span>Mở trong Workspace</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              ✦ Trong ứng dụng thật, Gemini AI sẽ tự động phân tích và xếp thẳng vào bảng giờ 24h không trùng lịch.
            </p>
          </div>

          {/* Toy 2: 432Hz Zen Audio & Ambient Soundboard */}
          <div className="p-7 rounded-3xl bg-white border border-indigo-100 shadow-xl shadow-indigo-100/40 text-left flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#0F172A]">Soundscape & Chime Sampler</h3>
                    <p className="text-[11px] text-slate-500">Âm thanh ngũ cung 432Hz & Tiếng ồn trắng</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Web Audio API
                </span>
              </div>

              {/* 5 Pentatonic Chime Keys */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">Chạm vào phím để nghe chuông ngũ cung:</p>
                <div className="grid grid-cols-5 gap-2">
                  {['Do (C5)', 'Re (D5)', 'Mi (E5)', 'Sol (G5)', 'La (A5)'].map((note, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePlayChimeNote(idx)}
                      className="py-3 px-1 rounded-xl bg-slate-50 hover:bg-amber-100 active:scale-95 border border-slate-200 text-center transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-black text-slate-800 group-hover:text-amber-700">
                        🎵 {idx + 1}
                      </div>
                      <div className="text-[9px] text-slate-500 font-medium truncate">{note}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ambient Soundscape Toggles */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-slate-700">Âm thanh nền kích hoạt tập trung sâu:</p>
                <div className="grid grid-cols-3 gap-2">
                  
                  <button
                    onClick={() => handleToggleAmbient('rain')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeAmbient === 'rain'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>Mưa Rơi</span>
                  </button>

                  <button
                    onClick={() => handleToggleAmbient('waves')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeAmbient === 'waves'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Waves className="w-3.5 h-3.5" />
                    <span>Sóng Biển</span>
                  </button>

                  <button
                    onClick={() => handleToggleAmbient('cafe')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeAmbient === 'cafe'
                        ? 'bg-amber-700 text-white border-amber-700 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Quán Cafe</span>
                  </button>

                </div>
              </div>

            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span>Đang phát: <strong className="text-[#0F172A]">{activeAmbient.toUpperCase()}</strong></span>
              {activeAmbient !== 'off' && (
                <button
                  onClick={() => handleToggleAmbient('rain')}
                  className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  Dừng phát âm nền
                </button>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          8. UPGRADE 3: TESTIMONIALS & REVIEWS SECTION
      ======================================================== */}
      <section id="reviews" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              Wall of Love
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
              Người Dùng & Đồng Nghiệp Nói Gì?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Những đánh giá và cảm nhận thực tế từ những người đã trải nghiệm hệ sinh thái Andex OS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((review, i) => (
              <div
                key={i}
                className={`p-7 rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 text-left space-y-4 hover:-translate-y-1 ${review.accent}`}
              >
                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(review.rating)].map((_, s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  "{review.text}"
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shadow-xs">
                    {review.avatar}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-[#0F172A]">{review.name}</h5>
                    <p className="text-[11px] text-slate-500 font-medium">{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================
          9. CALL TO ACTION SECTION (High-Five with Easter Egg)
      ======================================================== */}
      <section className="relative bg-[#FFF0F2] py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        
        {/* Top Wave Divider */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180 pointer-events-none">
          <svg className="relative block w-full h-8 text-[#FAFAFC]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 C150,90 350,-40 500,50 C650,140 900,10 1200,40 L1200,120 L0,120 Z" fill="currentColor"></path>
          </svg>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Text */}
          <div className="md:col-span-7 text-left space-y-5">
            <h2 className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.15]">
              Have an idea? <br />
              Let's build{' '}
              <span className="text-[#E11D48] relative inline-block">
                something great
                {/* Hand-drawn SVG wave */}
                <svg className="absolute -bottom-1.5 left-0 w-full h-2.5 text-[#E11D48]" viewBox="0 0 100 12" preserveAspectRatio="none">
                  <path d="M0,7 Q25,0 50,7 T100,7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>{' '}
              together!
            </h2>

            <p className="text-sm text-slate-600 max-w-lg">
              Sẵn sàng trải nghiệm phương pháp quản lý thời gian thế hệ mới hoặc hợp tác triển khai dự án công nghệ của bạn.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/app"
                onClick={() => soundEngine.playPentatonicChime(5)}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-xl transition-all hover:scale-105 cursor-pointer"
              >
                <span>Start a Project (Vào App)</span>
                <ArrowRight className="w-4 h-4 text-[#E11D48]" />
              </Link>

              {/* Interactive High-Five Button */}
              <button
                onClick={handleGiveHighFive}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-white hover:bg-rose-50 text-slate-800 font-extrabold text-xs sm:text-sm tracking-wide border-2 border-rose-200 transition-all hover:scale-105 cursor-pointer shadow-sm"
              >
                <span>Đập Tay (High-Five) 🙌</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-[#E11D48] text-xs font-black">
                  {highFiveCount}
                </span>
              </button>
            </div>

            {/* Floating Toast Notification when high-fived */}
            {showHighFiveToast && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-rose-200 shadow-xl text-xs font-bold text-[#E11D48] animate-bounce">
                <span>🎉 Cảm ơn bạn đã đập tay cổ vũ! High Five #{highFiveCount}!</span>
              </div>
            )}
          </div>

          {/* Right High-Five Illustration */}
          <div className="md:col-span-5 flex justify-center">
            <div
              onClick={handleGiveHighFive}
              title="Click để đập tay và bắn pháo hoa!"
              className="rounded-3xl overflow-hidden bg-white p-2.5 border border-rose-200/60 shadow-xl max-w-xs w-full group hover:rotate-1 hover:scale-105 transition-all cursor-pointer"
            >
              <img
                src="/images/landing/high-five.jpg"
                alt="Let's build something great together celebration"
                className="w-full h-auto rounded-2xl object-cover"
              />
              <p className="text-[10px] text-center text-slate-400 font-bold pt-2 group-hover:text-[#E11D48]">
                ✦ Click vào tranh để đập tay! ✦
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          10. FOOTER (Deep Midnight Navy #0F172A)
      ======================================================== */}
      <footer id="contact" className="bg-[#0F172A] text-white pt-16 pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
            
            {/* Col 1: Brand Info */}
            <div className="md:col-span-4 space-y-3">
              <div className="flex items-center text-2xl font-black text-white">
                <span>CBP</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] ml-0.5" />
              </div>
              <h5 className="font-extrabold text-sm text-slate-200">Cao Bảo Phúc</h5>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Building digital products that make an impact. Full-Stack Developer & Creator of Andex Operating System.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => setIsCvOpen(true)}
                  className="text-xs text-slate-300 hover:text-white underline font-semibold cursor-pointer"
                >
                  Xem hồ sơ CV
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => setIsContactOpen(true)}
                  className="text-xs text-slate-300 hover:text-white underline font-semibold cursor-pointer"
                >
                  Gửi tin nhắn liên hệ
                </button>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="md:col-span-2 space-y-2.5">
              <h6 className="text-xs font-black uppercase tracking-wider text-slate-400">Quick Links</h6>
              <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
                <li><a href="#home" className="hover:text-white transition-colors">Home</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Services</a></li>
                <li><a href="#projects" className="hover:text-white transition-colors">Projects</a></li>
                <li><a href="#tech-stack" className="hover:text-white transition-colors">Tech Stack</a></li>
                <li><Link href="/app" className="hover:text-white transition-colors font-bold text-[#E11D48]">Workspace App</Link></li>
              </ul>
            </div>

            {/* Col 3: Services */}
            <div className="md:col-span-3 space-y-2.5">
              <h6 className="text-xs font-black uppercase tracking-wider text-slate-400">Services</h6>
              <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
                <li>Mobile App Development</li>
                <li>UI/UX Design Systems</li>
                <li>Backend & AI Integration</li>
                <li>Security & Cloud Sync</li>
                <li>Acoustic Focus Audio</li>
              </ul>
            </div>

            {/* Col 4: Tech Stack & Contact */}
            <div className="md:col-span-3 space-y-2.5">
              <h6 className="text-xs font-black uppercase tracking-wider text-slate-400">Tech Stack & Contact</h6>
              <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>React / Next.js / TypeScript</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Node.js / Express / MongoDB</span>
                </li>
                <li className="pt-2 text-slate-400 text-[11px]">
                  Email: <a href="mailto:phuc.cbp@gmail.com" className="text-white hover:underline">phuc.cbp@gmail.com</a>
                </li>
                <li className="text-slate-400 text-[11px]">
                  Telegram: <span className="text-white font-mono">@AtelierOS</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Copyright bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Cao Bảo Phúc. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>Andex OS v2.6 • MongoDB Atlas Connected 🍃</span>
            </div>
          </div>

        </div>
      </footer>

      {/* ========================================================
          11. MODAL: PROJECT DETAIL / CASE STUDY
      ======================================================== */}
      {activeProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6 text-left">
            
            <button
              onClick={() => setActiveProjectModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${activeProjectModal.badgeColor}`}>
                {activeProjectModal.badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
                {activeProjectModal.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                {activeProjectModal.subtitle}
              </p>
            </div>

            {/* Problem & Solution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Thách thức</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeProjectModal.problem}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-1.5">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Giải pháp thực thi</span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {activeProjectModal.solution}
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3">
              {activeProjectModal.metrics.map((m, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-0.5">
                  <p className="text-xl font-black text-[#0F172A]">{m.value}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Tech Tags */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">Công nghệ áp dụng:</p>
              <div className="flex flex-wrap gap-1.5">
                {activeProjectModal.tags.map((tag, t) => (
                  <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setActiveProjectModal(null)}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <Link
                href="/app"
                onClick={() => {
                  soundEngine.playPentatonicChime(5);
                  setActiveProjectModal(null);
                }}
                className="px-6 py-2.5 rounded-full bg-[#E11D48] hover:bg-[#BE123C] text-white font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/20"
              >
                <span>Mở trong Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          12. MODAL: CV / RESUME VIEW
      ======================================================== */}
      {isCvOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6 text-left">
            
            <button
              onClick={() => setIsCvOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-slate-100 pb-5 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-[#E11D48] text-xs font-bold">
                <span>Curriculum Vitae</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
                Cao Bảo Phúc
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                Senior Full-Stack Developer & UI/UX Architect
              </p>
              <p className="text-xs text-slate-500">
                Email: phuc.cbp@gmail.com • Ho Chi Minh City, Vietnam
              </p>
            </div>

            {/* Profile summary */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Tóm tắt chuyên môn</h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Hơn 3 năm kinh nghiệm thực chiến phát triển các giải pháp Web Application hiệu năng cao với Next.js, React, Node.js, Express và MongoDB Atlas. Thế mạnh vượt trội về kiến trúc phần mềm sạch (Clean Architecture), bảo mật OTP không rò rỉ và thẩm mỹ giao diện người dùng đạt tiêu chuẩn thiết kế quốc tế.
              </p>
            </div>

            {/* Education & Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                <h5 className="text-xs font-extrabold text-[#0F172A]">Học vấn & Bằng cấp</h5>
                <p className="text-xs font-bold text-slate-800">Cử nhân Công Nghệ Thông Tin</p>
                <p className="text-[11px] text-slate-500">Chuyên ngành Kỹ Thuật Phần Mềm</p>
                <p className="text-[10px] text-emerald-600 font-bold">Tốt nghiệp loại Xuất Sắc</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                <h5 className="text-xs font-extrabold text-[#0F172A]">Dự án trọng tâm</h5>
                <p className="text-xs font-bold text-slate-800">Andex Operating System</p>
                <p className="text-[11px] text-slate-500">Full-Stack OS với AI Co-Pilot & 432Hz Audio</p>
                <p className="text-[10px] text-blue-600 font-bold">500+ Active Users</p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In / Xuất PDF</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCvOpen(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
                <Link
                  href="/app"
                  onClick={() => setIsCvOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#E11D48] text-white font-extrabold text-xs hover:bg-[#BE123C] cursor-pointer"
                >
                  Xem Dự Án Thực Tế
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          13. MODAL: LET'S TALK / CONTACT DRAWER
      ======================================================== */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-5 text-left">
            
            <button
              onClick={() => setIsContactOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#E11D48] bg-rose-50 px-2.5 py-0.5 rounded-full">
                Let's Talk
              </span>
              <h3 className="text-2xl font-black text-[#0F172A]">
                Bắt Đầu Dự Án Mới
              </h3>
              <p className="text-xs text-slate-500">
                Gửi tin nhắn hoặc ý tưởng hợp tác của bạn, Phúc sẽ phản hồi trong vòng 24 giờ.
              </p>
            </div>

            {contactSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-fadeIn">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl">
                  ✓
                </div>
                <h4 className="font-extrabold text-sm text-emerald-800">Tin nhắn đã gửi thành công!</h4>
                <p className="text-xs text-emerald-600">Cảm ơn bạn đã liên hệ. Chúc bạn một ngày năng suất tuyệt vời!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitContact} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên của bạn</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E11D48]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email liên hệ</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E11D48]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ý tưởng hoặc nội dung trao đổi</label>
                  <textarea
                    rows={3}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Hãy mô tả sơ lược về dự án hoặc câu hỏi của bạn..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E11D48]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsContactOpen(false)}
                    className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#E11D48] hover:bg-[#BE123C] text-white font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/25"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi tin nhắn</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Shared Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialTab={authTab}
      />

    </div>
  );
}
