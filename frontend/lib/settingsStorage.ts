export type AppTheme = 'slate' | 'cream' | 'graphite' | 'midnight' | 'sage' | 'custom';

export interface CustomThemeConfig {
  sidebarBg: string;       // Hex e.g. '#1E1B4B'
  canvasBg: string;        // Hex e.g. '#FAF5FF'
  accentColor: string;     // Hex e.g. '#7C3AED'
  isDark: boolean;         // true = light text on dark sidebar, false = dark text on light sidebar
}

export const DEFAULT_CUSTOM_THEME: CustomThemeConfig = {
  sidebarBg: '#1E1B4B',
  canvasBg: '#F5F3FF',
  accentColor: '#7C3AED',
  isDark: true,
};

export interface ThemeOption {
  id: AppTheme;
  name: string;
  subtitle: string;
  sidebarBg: string;
  sidebarBorder: string;
  canvasBg: string;
  cardBg: string;
  textColor: string;
  accentColor: string;
  swatches: [string, string, string]; // [sidebar, canvas, accent]
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'slate',
    name: 'Modern Slate (Mặc định)',
    subtitle: 'Thanh lịch, dịu mắt với sidebar xanh xám phân tách rõ ràng',
    sidebarBg: 'bg-[#F1F4F9]',
    sidebarBorder: 'border-[#E2E8F0]',
    canvasBg: 'bg-[#FAFBFD]',
    cardBg: 'bg-white',
    textColor: 'text-[#1E2433]',
    accentColor: '#2563EB',
    swatches: ['#F1F4F9', '#FAFBFD', '#2563EB'],
  },
  {
    id: 'cream',
    name: 'Warm Atelier (Vintage)',
    subtitle: 'Tone kem hoài niệm ấm cúng, thư giãn thị giác',
    sidebarBg: 'bg-[#EDE4D5]',
    sidebarBorder: 'border-[#DCCEB9]',
    canvasBg: 'bg-[#FAF7F2]',
    cardBg: 'bg-[#FFFEFC]',
    textColor: 'text-[#2C180C]',
    accentColor: '#8C5D35',
    swatches: ['#EDE4D5', '#FAF7F2', '#8C5D35'],
  },
  {
    id: 'graphite',
    name: 'Nordic Graphite',
    subtitle: 'Tối giản Bắc Âu, tương phản cao sắc nét',
    sidebarBg: 'bg-[#E5E9F0]',
    sidebarBorder: 'border-[#CBD5E1]',
    canvasBg: 'bg-[#F8FAFC]',
    cardBg: 'bg-white',
    textColor: 'text-[#0F172A]',
    accentColor: '#0F172A',
    swatches: ['#E5E9F0', '#F8FAFC', '#0F172A'],
  },
  {
    id: 'sage',
    name: 'Zen Matcha',
    subtitle: 'Xanh thảo mộc bình yên, giảm mỏi mắt khi làm việc lâu',
    sidebarBg: 'bg-[#E5EEE7]',
    sidebarBorder: 'border-[#C9D9CD]',
    canvasBg: 'bg-[#F4F8F5]',
    cardBg: 'bg-white',
    textColor: 'text-[#1B3624]',
    accentColor: '#166534',
    swatches: ['#E5EEE7', '#F4F8F5', '#166534'],
  },
  {
    id: 'midnight',
    name: 'Midnight Obsidian',
    subtitle: 'Chế độ tối sang trọng, đắm chìm cho không gian làm việc đêm',
    sidebarBg: 'bg-[#0E131F]',
    sidebarBorder: 'border-[#1E2638]',
    canvasBg: 'bg-[#141A24]',
    cardBg: 'bg-[#1C2333]',
    textColor: 'text-[#F1F5F9]',
    accentColor: '#38BDF8',
    swatches: ['#0E131F', '#141A24', '#38BDF8'],
  },
  {
    id: 'custom',
    name: 'Tự Phối Màu (Custom)',
    subtitle: 'Tự do chọn màu Sidebar, màu nền Canvas & màu nút bấm theo ý muốn',
    sidebarBg: 'custom',
    sidebarBorder: 'custom',
    canvasBg: 'custom',
    cardBg: 'custom',
    textColor: 'custom',
    accentColor: 'custom',
    swatches: ['#1E1B4B', '#F5F3FF', '#7C3AED'],
  },
];

export interface VocabVoiceOption {
  id: string;
  label: string;
  accent: string;
  gender: 'Nữ' | 'Nam' | 'Hệ thống';
  sampleTag: string;
}

export const VOCAB_VOICE_OPTIONS: VocabVoiceOption[] = [
  { id: 'en-US-AriaNeural', label: 'Aria (Mỹ • Tự nhiên)', accent: 'en-US', gender: 'Nữ', sampleTag: 'US' },
  { id: 'en-US-GuyNeural', label: 'Guy (Mỹ • Trầm ấm)', accent: 'en-US', gender: 'Nam', sampleTag: 'US' },
  { id: 'en-US-JennyNeural', label: 'Jenny (Mỹ • Giao tiếp)', accent: 'en-US', gender: 'Nữ', sampleTag: 'US' },
  { id: 'en-US-ChristopherNeural', label: 'Christopher (Mỹ • Chuẩn)', accent: 'en-US', gender: 'Nam', sampleTag: 'US' },
  { id: 'en-US-EmmaMultilingualNeural', label: 'Emma (Mỹ • Đa ngữ)', accent: 'en-US', gender: 'Nữ', sampleTag: 'US' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia (Anh UK • BBC)', accent: 'en-GB', gender: 'Nữ', sampleTag: 'UK' },
  { id: 'en-GB-RyanNeural', label: 'Ryan (Anh UK • Lịch lãm)', accent: 'en-GB', gender: 'Nam', sampleTag: 'UK' },
  { id: 'en-AU-NatashaNeural', label: 'Natasha (Úc • Trẻ trung)', accent: 'en-AU', gender: 'Nữ', sampleTag: 'AU' },
  { id: 'en-AU-WilliamNeural', label: 'William (Úc • Rõ nét)', accent: 'en-AU', gender: 'Nam', sampleTag: 'AU' },
  { id: 'en-CA-ClaraNeural', label: 'Clara (Canada • Dịu nhẹ)', accent: 'en-CA', gender: 'Nữ', sampleTag: 'CA' },
  { id: 'browser', label: 'Giọng mặc định trình duyệt (Offline)', accent: 'en-US', gender: 'Hệ thống', sampleTag: 'Local' },
];

export interface AppSettings {
  soundEnabled: boolean;
  soundVolume: number; // 0 to 100
  confettiEnabled: boolean;
  timeFormat: '24h' | '12h';
  weekStartsOn: 1 | 0; // 1 = Monday, 0 = Sunday
  autoScrollToNow: boolean;
  theme: AppTheme;
  customTheme?: CustomThemeConfig;
  sidebarCollapsed: boolean;
  vocabVoice: string;
  vocabSpeechRate: number; // 0.7 to 1.25
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  soundVolume: 80,
  confettiEnabled: true,
  timeFormat: '24h',
  weekStartsOn: 1, // Monday
  autoScrollToNow: true,
  theme: 'slate',
  customTheme: DEFAULT_CUSTOM_THEME,
  sidebarCollapsed: false,
  vocabVoice: 'en-US-AriaNeural',
  vocabSpeechRate: 1.0,
};

const SETTINGS_KEY = 'cbp_atelier_app_settings';

export function getStoredSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      customTheme: { ...DEFAULT_CUSTOM_THEME, ...(parsed.customTheme || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}
