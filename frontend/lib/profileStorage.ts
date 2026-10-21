import { UserProfileData } from './types';

export const DEFAULT_USER_PROFILE: UserProfileData = {
  name: 'Yaros Tolstykh',
  email: 'yaros.tolstykh@cbp.ai',
  title: 'CBP Personal Workspace Master',
  avatar: '',
  cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  background: '',
  applyAppBackground: false,
  backgroundBlur: 10,
  backgroundOpacity: 0.65,
  bio: 'Định hình nhịp sống và tối ưu hóa năng suất cùng CBP Workspace.',
  dailyGoalHours: 6,
};

export const PRESET_BACKGROUNDS = [
  {
    id: 'abstract_wave',
    label: 'Fluid Ocean',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'cyber_gradient',
    label: 'Cyber Violet',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'sunset_minimal',
    label: 'Sunset Glow',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'zen_forest',
    label: 'Zen Nature',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'dark_studio',
    label: 'Obsidian Studio',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
  },
];

const STORAGE_KEY = 'cbp_user_profile_v1';
let memoryProfileCache: UserProfileData | null = null;

export function getStoredUserProfile(): UserProfileData {
  if (memoryProfileCache) return memoryProfileCache;
  if (typeof window === 'undefined') return DEFAULT_USER_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryProfileCache = DEFAULT_USER_PROFILE;
      return DEFAULT_USER_PROFILE;
    }
    const parsed = JSON.parse(raw);
    memoryProfileCache = { ...DEFAULT_USER_PROFILE, ...parsed };
    return memoryProfileCache;
  } catch (e) {
    console.error('Failed to parse user profile:', e);
    memoryProfileCache = DEFAULT_USER_PROFILE;
    return DEFAULT_USER_PROFILE;
  }
}

export function saveStoredUserProfile(profile: UserProfileData): void {
  memoryProfileCache = { ...profile };
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e: any) {
    console.warn('LocalStorage quota warning, attempting compact fallback save:', e);
    try {
      // If quota exceeded because of huge base64 strings (>300KB), preserve text & fall back safely
      const compactProfile: UserProfileData = {
        ...profile,
        cover: profile.cover && profile.cover.length > 300000 ? '' : profile.cover,
        avatar: profile.avatar && profile.avatar.length > 300000 ? '' : profile.avatar,
        background: profile.background && profile.background.length > 300000 ? '' : profile.background,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compactProfile));
    } catch (fallbackErr) {
      console.error('Failed to save even compact user profile:', fallbackErr);
    }
  }
}
