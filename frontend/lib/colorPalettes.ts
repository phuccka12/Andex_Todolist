export interface ColorPalette {
  id: string;
  name: string;
  hex: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  shadow: string;
  group: 'twilight' | 'forest' | 'designer' | 'classic';
  groupLabel: string;
}

export const PALETTES: Record<string, ColorPalette> = {
  // ==========================================
  // Image 2: Twilight Sunset (@codesmashers)
  // ==========================================
  twilight: {
    id: 'twilight',
    name: 'Twilight Rose',
    hex: '#AE445A',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(174,68,90,0.38)]',
    group: 'twilight',
    groupLabel: 'Twilight Sunset (@codesmashers)',
  },
  twilight_plum: {
    id: 'twilight_plum',
    name: 'Wine Plum',
    hex: '#662549',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(102,37,73,0.40)]',
    group: 'twilight',
    groupLabel: 'Twilight Sunset (@codesmashers)',
  },
  twilight_purple: {
    id: 'twilight_purple',
    name: 'Royal Purple',
    hex: '#451952',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(69,25,82,0.42)]',
    group: 'twilight',
    groupLabel: 'Twilight Sunset (@codesmashers)',
  },
  twilight_indigo: {
    id: 'twilight_indigo',
    name: 'Midnight Indigo',
    hex: '#1D1A39',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(29,26,57,0.45)]',
    group: 'twilight',
    groupLabel: 'Twilight Sunset (@codesmashers)',
  },
  sunset_amber: {
    id: 'sunset_amber',
    name: 'Sunset Amber',
    hex: '#F39F5A',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(0, 0, 0, 0.18)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(243,159,90,0.38)]',
    group: 'twilight',
    groupLabel: 'Twilight Sunset (@codesmashers)',
  },
  sunset_cream: {
    id: 'sunset_cream',
    name: 'Dusty Coral Cream',
    hex: '#E8BCB9',
    textColor: '#4A1525',
    badgeBg: 'rgba(74, 21, 37, 0.12)',
    badgeText: '#4A1525',
    shadow: 'shadow-[0_4px_14px_rgba(232,188,185,0.38)]',
    group: 'twilight',
    groupLabel: 'Twilight Sunset (@codesmashers)',
  },

  // ==========================================
  // Image 3: Deep Forest (nedigital.ru)
  // ==========================================
  forest_emerald: {
    id: 'forest_emerald',
    name: 'Forest Emerald',
    hex: '#235347',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(35,83,71,0.38)]',
    group: 'forest',
    groupLabel: 'Deep Forest (nedigital.ru)',
  },
  deep_forest: {
    id: 'deep_forest',
    name: 'Forest Emerald',
    hex: '#235347',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(35,83,71,0.38)]',
    group: 'forest',
    groupLabel: 'Deep Forest (nedigital.ru)',
  },
  alpine_jade: {
    id: 'alpine_jade',
    name: 'Alpine Jade',
    hex: '#163832',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(22,56,50,0.42)]',
    group: 'forest',
    groupLabel: 'Deep Forest (nedigital.ru)',
  },
  midnight_forest: {
    id: 'midnight_forest',
    name: 'Midnight Forest',
    hex: '#0B2B26',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(11,43,38,0.45)]',
    group: 'forest',
    groupLabel: 'Deep Forest (nedigital.ru)',
  },
  dark_spruce: {
    id: 'dark_spruce',
    name: 'Dark Spruce',
    hex: '#051F20',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(5,31,32,0.45)]',
    group: 'forest',
    groupLabel: 'Deep Forest (nedigital.ru)',
  },
  sage_mint: {
    id: 'sage_mint',
    name: 'Sage Mint',
    hex: '#8EB69B',
    textColor: '#0B2617',
    badgeBg: 'rgba(11, 38, 23, 0.14)',
    badgeText: '#0B2617',
    shadow: 'shadow-[0_4px_14px_rgba(142,182,155,0.35)]',
    group: 'forest',
    groupLabel: 'Deep Forest (nedigital.ru)',
  },
  mint_ice: {
    id: 'mint_ice',
    name: 'Mint Ice Highlight',
    hex: '#DAF1DE',
    textColor: '#0E3B27',
    badgeBg: 'rgba(14, 59, 39, 0.12)',
    badgeText: '#0E3B27',
    shadow: 'shadow-[0_4px_14px_rgba(218,241,222,0.40)]',
    group: 'forest',
    groupLabel: 'Deep Forest (nedigital.ru)',
  },

  // ==========================================
  // Image 1: Designer Grid Curated
  // ==========================================
  retro_coral: {
    id: 'retro_coral',
    name: 'Retro Coral Red',
    hex: '#FF5959',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(0, 0, 0, 0.18)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(255,89,89,0.38)]',
    group: 'designer',
    groupLabel: 'Tuyển Chọn Designer (Grid Palettes)',
  },
  ocean_slate: {
    id: 'ocean_slate',
    name: 'Ocean Slate Blue',
    hex: '#446592',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(68,101,146,0.38)]',
    group: 'designer',
    groupLabel: 'Tuyển Chọn Designer (Grid Palettes)',
  },
  sunset_plum: {
    id: 'sunset_plum',
    name: 'Sunset Plum',
    hex: '#6C5FA7',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(108,95,167,0.38)]',
    group: 'designer',
    groupLabel: 'Tuyển Chọn Designer (Grid Palettes)',
  },
  cyan_azure: {
    id: 'cyan_azure',
    name: 'Cyan Azure Electric',
    hex: '#01D1FF',
    textColor: '#042738',
    badgeBg: 'rgba(4, 39, 56, 0.15)',
    badgeText: '#042738',
    shadow: 'shadow-[0_4px_14px_rgba(1,209,255,0.38)]',
    group: 'designer',
    groupLabel: 'Tuyển Chọn Designer (Grid Palettes)',
  },
  cyber_lime: {
    id: 'cyber_lime',
    name: 'Cyber Mint Lime',
    hex: '#12E2A4',
    textColor: '#053125',
    badgeBg: 'rgba(5, 49, 37, 0.15)',
    badgeText: '#053125',
    shadow: 'shadow-[0_4px_14px_rgba(18,226,164,0.38)]',
    group: 'designer',
    groupLabel: 'Tuyển Chọn Designer (Grid Palettes)',
  },
  terracotta: {
    id: 'terracotta',
    name: 'Terracotta Olive',
    hex: '#709078',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(0, 0, 0, 0.18)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(112,144,120,0.38)]',
    group: 'designer',
    groupLabel: 'Tuyển Chọn Designer (Grid Palettes)',
  },
  deep_navy: {
    id: 'deep_navy',
    name: 'Deep Luxury Navy',
    hex: '#0E117A',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(14,17,122,0.42)]',
    group: 'designer',
    groupLabel: 'Tuyển Chọn Designer (Grid Palettes)',
  },
  warm_ochre: {
    id: 'warm_ochre',
    name: 'Warm Ochre Honey',
    hex: '#E0B382',
    textColor: '#422405',
    badgeBg: 'rgba(66, 36, 5, 0.12)',
    badgeText: '#422405',
    shadow: 'shadow-[0_4px_14px_rgba(224,179,130,0.38)]',
    group: 'designer',
    groupLabel: 'Tuyển Chọn Designer (Grid Palettes)',
  },

  // ==========================================
  // Classic Staples (Rich Saturated)
  // ==========================================
  blue: {
    id: 'blue',
    name: 'Royal Blue',
    hex: '#2563EB',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(37,99,235,0.38)]',
    group: 'classic',
    groupLabel: 'Màu Sắc Tiêu Chuẩn',
  },
  purple: {
    id: 'purple',
    name: 'Royal Violet',
    hex: '#7C3AED',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(124,58,237,0.38)]',
    group: 'classic',
    groupLabel: 'Màu Sắc Tiêu Chuẩn',
  },
  amber: {
    id: 'amber',
    name: 'Golden Amber',
    hex: '#D97706',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(0, 0, 0, 0.18)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(217,119,6,0.38)]',
    group: 'classic',
    groupLabel: 'Màu Sắc Tiêu Chuẩn',
  },
  rose: {
    id: 'rose',
    name: 'Crimson Rose',
    hex: '#E11D48',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(225,29,72,0.38)]',
    group: 'classic',
    groupLabel: 'Màu Sắc Tiêu Chuẩn',
  },
  mint: {
    id: 'mint',
    name: 'Emerald Mint',
    hex: '#059669',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(5,150,105,0.38)]',
    group: 'classic',
    groupLabel: 'Màu Sắc Tiêu Chuẩn',
  },
  peach: {
    id: 'peach',
    name: 'Peach Orange',
    hex: '#EA580C',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(0, 0, 0, 0.18)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(234,88,12,0.38)]',
    group: 'classic',
    groupLabel: 'Màu Sắc Tiêu Chuẩn',
  },
  lavender: {
    id: 'lavender',
    name: 'Deep Lavender',
    hex: '#6D28D9',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(109,40,217,0.38)]',
    group: 'classic',
    groupLabel: 'Màu Sắc Tiêu Chuẩn',
  },
  sky: {
    id: 'sky',
    name: 'Sky Azure',
    hex: '#0284C7',
    textColor: '#FFFFFF',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeText: '#FFFFFF',
    shadow: 'shadow-[0_4px_14px_rgba(2,132,199,0.38)]',
    group: 'classic',
    groupLabel: 'Màu Sắc Tiêu Chuẩn',
  },
};

// Fallback & Alias Resolver so legacy/unmapped theme keys NEVER look pale or break
export function resolvePalette(themeKey?: string): ColorPalette {
  if (!themeKey) return PALETTES.twilight;

  const direct = PALETTES[themeKey];
  if (direct) return direct;

  const keyLower = themeKey.toLowerCase();

  // Alias maps
  if (keyLower.includes('emerald') || keyLower.includes('forest') || keyLower === 'green') {
    return PALETTES.deep_forest;
  }
  if (keyLower.includes('jade')) {
    return PALETTES.alpine_jade;
  }
  if (keyLower.includes('twilight') || keyLower.includes('rose') || keyLower.includes('berry')) {
    return PALETTES.twilight;
  }
  if (keyLower.includes('sunset') || keyLower.includes('amber') || keyLower.includes('gold')) {
    return PALETTES.sunset_amber;
  }
  if (keyLower.includes('coral') || keyLower.includes('red')) {
    return PALETTES.retro_coral;
  }
  if (keyLower.includes('cyan') || keyLower.includes('teal')) {
    return PALETTES.cyan_azure;
  }
  if (keyLower.includes('plum') || keyLower.includes('wine')) {
    return PALETTES.twilight_plum;
  }
  if (keyLower.includes('purple') || keyLower.includes('violet')) {
    return PALETTES.twilight_purple;
  }
  if (keyLower.includes('indigo') || keyLower.includes('dark')) {
    return PALETTES.twilight_indigo;
  }
  if (keyLower.includes('blue')) {
    return PALETTES.blue;
  }
  if (keyLower.includes('mint')) {
    return PALETTES.mint;
  }

  return PALETTES.twilight;
}

export const DEFAULT_PALETTE = PALETTES.twilight;
