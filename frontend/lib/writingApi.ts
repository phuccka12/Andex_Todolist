import { authService } from './authService';
import { API_BASE } from './config';

export type WritingTaskType = 'task1' | 'task2';
export type UpgradeMode = 'preserve_voice' | 'band_85';

export interface WritingAnnotation {
  id: string;
  category: 'grammar' | 'lexical' | 'cohesion' | 'logic' | 'strength';
  quote: string;
  suggestion: string;
  explanationVi: string;
  bandImpact?: string;
}

export interface WritingBandCeiling {
  criterion: 'TR/TA' | 'CC' | 'LR' | 'GRA';
  cappedAt: string;
  reasonVi: string;
}

export interface WritingWeakSentence {
  id: string;
  original: string;
  hintVi: string;
  userRewrite?: string;
  rewriteScore?: string;
  rewriteFeedbackVi?: string;
}

export interface WritingRecommendedVocab {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning: string;
  example: string;
  exampleTranslation?: string;
  topic: string;
}

export interface LocalWritingDiagnostics {
  wordCount: number;
  effectiveWordCount: number;
  paragraphCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  repeatedWords: Array<{ word: string; count: number }>;
  promptOverlapRatio: number;
  warnings: string[];
}

export interface CriterionDetail {
  summaryVi: string;
  strengthsVi: string[];
  weaknessesVi: string[];
}

export interface WritingAttempt {
  id: string;
  userId?: string;
  taskType: WritingTaskType;
  essayType: string;
  prompt: string;
  promptImage?: string;
  essay: string;
  elapsedSeconds: number;
  localDiagnostics: LocalWritingDiagnostics;
  scores: {
    taskAchievement: number;
    coherenceCohesion: number;
    lexicalResource: number;
    grammaticalRange: number;
    overall: number;
  };
  overallSummaryVi: string;
  bandCeilings: WritingBandCeiling[];
  unlockNextBand: Array<{ actionVi: string; estimatedGain: string }>;
  criteriaDetails: {
    taskAchievement: CriterionDetail;
    coherenceCohesion: CriterionDetail;
    lexicalResource: CriterionDetail;
    grammaticalRange: CriterionDetail;
  };
  annotations: WritingAnnotation[];
  injectedVocabUsed: Array<{ word: string; meaning?: string; usedCorrectly: boolean; noteVi?: string }>;
  recommendedVocab: WritingRecommendedVocab[];
  weakSentences: WritingWeakSentence[];
  upgradedVersions?: {
    preserveVoiceEssay?: string;
    preserveVoiceNotesVi?: string;
    band85Essay?: string;
    band85NotesVi?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonalVocabHint {
  id: string;
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning: string;
  topic: string;
  srsLevel: number;
}

export interface WeaknessRadarSummary {
  totalAttempts: number;
  avgOverall: number;
  latestOverall: number;
  weakestCriterion: { key: 'TR/TA' | 'CC' | 'LR' | 'GRA'; label: string; avgScore: number } | null;
  recurringPatterns: Array<{ label: string; count: number }>;
  recurringRepeatedWords: Array<{ word: string; count: number }>;
  preWriteChecklist: string[];
  recentTrend: Array<{ id: string; date: string; taskType: string; overall: number }>;
}

const HISTORY_CACHE_PREFIX = 'genncore_writing_history_v1_';
const RADAR_CACHE_PREFIX = 'genncore_writing_radar_v1_';

const historyMemoryCache = new Map<string, WritingAttempt[]>();
const radarMemoryCache = new Map<string, WeaknessRadarSummary>();

function resolveUserKey(explicitUserId?: string): string {
  if (explicitUserId) return explicitUserId;
  if (typeof window === 'undefined') return 'guest';
  if (!authService.getToken()) return 'guest';
  return authService.getCachedUser()?.id || 'authed_default';
}

export function roundIeltsBand(raw: number): number {
  const clamped = Math.max(0, Math.min(9, Number(raw) || 0));
  const halfFloor = Math.floor(clamped * 2) / 2;
  return clamped - halfFloor >= 0.249 ? Math.min(9, halfFloor + 0.5) : halfFloor;
}

const LIVE_STOP_WORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'almost', 'alone', 'along', 'already', 'also',
  'although', 'always', 'among', 'another', 'around', 'because', 'before', 'being', 'below',
  'between', 'cannot', 'could', 'during', 'either', 'enough', 'every', 'first', 'found', 'further',
  'having', 'however', 'important', 'into', 'itself', 'large', 'likely', 'might', 'neither',
  'never', 'often', 'other', 'others', 'perhaps', 'quite', 'rather', 'really', 'several',
  'should', 'since', 'some', 'someone', 'something', 'still', 'such', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'though', 'through', 'toward',
  'towards', 'under', 'unless', 'until', 'upon', 'using', 'very', 'where', 'whereas', 'whether',
  'which', 'while', 'within', 'without', 'would', 'your',
]);

/**
 * 0-Token instant client-side diagnostics while typing.
 */
export function computeLiveWritingStats(
  prompt: string,
  essay: string,
  taskType: WritingTaskType
): LocalWritingDiagnostics {
  const clean = essay.trim();
  const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const paragraphs = clean
    ? clean
        .split(/\r?\n\s*\r?\n|\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];
  const paragraphCount = paragraphs.length;
  const sentences = clean
    ? clean
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2)
    : [];
  const sentenceCount = Math.max(sentences.length, clean ? 1 : 0);
  const avgSentenceLength = sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0;

  const normalizeTokens = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

  const promptTokens = normalizeTokens(prompt);
  const essayTokens = normalizeTokens(clean);
  let copiedWords = 0;

  if (promptTokens.length >= 5 && essayTokens.length >= 5) {
    const promptSet = new Set<string>();
    for (let i = 0; i <= promptTokens.length - 5; i++) {
      promptSet.add(promptTokens.slice(i, i + 5).join(' '));
    }
    const hitIdx = new Set<number>();
    for (let i = 0; i <= essayTokens.length - 5; i++) {
      if (promptSet.has(essayTokens.slice(i, i + 5).join(' '))) {
        for (let k = i; k < i + 5; k++) hitIdx.add(k);
      }
    }
    copiedWords = hitIdx.size;
  }

  const effectiveWordCount = Math.max(0, wordCount - copiedWords);
  const promptOverlapRatio = wordCount > 0 ? Math.round((copiedWords / wordCount) * 100) : 0;

  const freq = new Map<string, number>();
  for (const t of essayTokens) {
    if (t.length < 4 || LIVE_STOP_WORDS.has(t) || /^\d+$/.test(t)) continue;
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  const repeatedWords = Array.from(freq.entries())
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  const minTarget = taskType === 'task1' ? 150 : 250;
  const warnings: string[] = [];
  if (wordCount > 0 && effectiveWordCount < minTarget) {
    warnings.push(`Cần thêm ${minTarget - effectiveWordCount} từ thực chất để đạt mốc ${minTarget} từ.`);
  }
  if (promptOverlapRatio >= 12) {
    warnings.push(`Có ${copiedWords} từ giống nguyên văn đề bài (sẽ không được tính).`);
  }
  if (wordCount > 50 && paragraphCount < 3) {
    warnings.push(`Nên tách tối thiểu 3–4 đoạn rõ ràng.`);
  }

  return {
    wordCount,
    effectiveWordCount,
    paragraphCount,
    sentenceCount,
    avgSentenceLength,
    repeatedWords,
    promptOverlapRatio,
    warnings,
  };
}

export function getCachedWritingHistory(userId?: string): WritingAttempt[] {
  const key = resolveUserKey(userId);
  const mem = historyMemoryCache.get(key);
  if (mem) return mem;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${HISTORY_CACHE_PREFIX}${key}`);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      historyMemoryCache.set(key, parsed);
      return parsed;
    }
  } catch {}
  return [];
}

function writeCachedHistory(items: WritingAttempt[], userId?: string) {
  const key = resolveUserKey(userId);
  historyMemoryCache.set(key, items);
  if (typeof window === 'undefined') return;
  try {
    // Strip heavy promptImage strings in local cache
    const compact = items.slice(0, 20).map((it) => ({ ...it, promptImage: '' }));
    localStorage.setItem(`${HISTORY_CACHE_PREFIX}${key}`, JSON.stringify(compact));
  } catch {}
}

export function getCachedWritingRadar(userId?: string): WeaknessRadarSummary | null {
  const key = resolveUserKey(userId);
  const mem = radarMemoryCache.get(key);
  if (mem) return mem;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${RADAR_CACHE_PREFIX}${key}`);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.totalAttempts === 'number') {
      radarMemoryCache.set(key, parsed);
      return parsed;
    }
  } catch {}
  return null;
}

export async function fetchWritingPrep(
  prompt: string,
  userId?: string
): Promise<{ personalVocab: PersonalVocabHint[]; radar: WeaknessRadarSummary }> {
  const key = resolveUserKey(userId);
  const params = new URLSearchParams({ prompt: prompt.slice(0, 500) });
  const res = await fetch(`${API_BASE}/writing/prep?${params.toString()}`, {
    cache: 'no-store',
    headers: { ...authService.getAuthHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Chưa tải được dữ liệu gợi ý Writing.');
  }
  if (data.radar) {
    radarMemoryCache.set(key, data.radar);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${RADAR_CACHE_PREFIX}${key}`, JSON.stringify(data.radar));
      } catch {}
    }
  }
  return {
    personalVocab: Array.isArray(data.personalVocab) ? data.personalVocab : [],
    radar: data.radar,
  };
}

export async function fetchWritingHistory(userId?: string): Promise<WritingAttempt[]> {
  try {
    const res = await fetch(`${API_BASE}/writing/history`, {
      cache: 'no-store',
      headers: { ...authService.getAuthHeaders() },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && Array.isArray(data.items)) {
      writeCachedHistory(data.items, userId);
      return data.items;
    }
  } catch {}
  return getCachedWritingHistory(userId);
}

export async function fetchWritingAttemptById(id: string): Promise<WritingAttempt | null> {
  const res = await fetch(`${API_BASE}/writing/${id}`, {
    cache: 'no-store',
    headers: { ...authService.getAuthHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) return null;
  return data.attempt;
}

export async function gradeWritingEssay(
  payload: {
    taskType: WritingTaskType;
    essayType: string;
    prompt: string;
    promptImage?: string;
    essay: string;
    elapsedSeconds?: number;
  },
  userId?: string
): Promise<WritingAttempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const res = await fetch(`${API_BASE}/writing/grade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.attempt) {
      throw new Error(data.error || 'Chưa thể chấm bài lúc này, bạn thử lại sau giây lát.');
    }
    const cached = getCachedWritingHistory(userId);
    writeCachedHistory([data.attempt, ...cached.filter((i) => i.id !== data.attempt.id)], userId);
    return data.attempt;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Máy chủ AI chấm bài mất hơi lâu (>35s), bạn bấm thử lại nhé.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateWritingUpgrade(
  attemptId: string,
  mode: UpgradeMode,
  userId?: string
): Promise<{ essay: string; notesVi: string; cached?: boolean }> {
  const res = await fetch(`${API_BASE}/writing/${attemptId}/upgrade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify({ mode }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Không thể tạo bài nâng cấp lúc này.');
  }
  // Sync local history cache
  const cached = getCachedWritingHistory(userId);
  writeCachedHistory(
    cached.map((a) => {
      if (a.id !== attemptId) return a;
      const upgradedVersions = { ...(a.upgradedVersions || {}) };
      if (mode === 'preserve_voice') {
        upgradedVersions.preserveVoiceEssay = data.essay;
        upgradedVersions.preserveVoiceNotesVi = data.notesVi;
      } else {
        upgradedVersions.band85Essay = data.essay;
        upgradedVersions.band85NotesVi = data.notesVi;
      }
      return { ...a, upgradedVersions };
    }),
    userId
  );
  return { essay: data.essay, notesVi: data.notesVi, cached: Boolean(data.cached) };
}

export async function evaluateWritingRewrites(
  attemptId: string,
  rewrites: Array<{ id: string; userRewrite: string }>,
  userId?: string
): Promise<WritingWeakSentence[]> {
  const res = await fetch(`${API_BASE}/writing/${attemptId}/rewrite-lab`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify({ rewrites }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Chưa thể chấm câu viết lại.');
  }
  const cached = getCachedWritingHistory(userId);
  writeCachedHistory(
    cached.map((a) => (a.id === attemptId ? { ...a, weakSentences: data.weakSentences } : a)),
    userId
  );
  return data.weakSentences;
}

export async function deleteWritingAttempt(attemptId: string, userId?: string): Promise<boolean> {
  const cached = getCachedWritingHistory(userId);
  writeCachedHistory(
    cached.filter((a) => a.id !== attemptId),
    userId
  );
  const res = await fetch(`${API_BASE}/writing/${attemptId}`, {
    method: 'DELETE',
    headers: { ...authService.getAuthHeaders() },
  });
  return res.ok;
}

export const SAMPLE_WRITING_PROMPTS: Array<{
  id: string;
  taskType: WritingTaskType;
  essayType: string;
  title: string;
  prompt: string;
}> = [
  {
    id: 't2-tech-ai',
    taskType: 'task2',
    essayType: 'opinion',
    title: 'AI & Tự động hóa việc làm (Opinion)',
    prompt:
      'Artificial intelligence is increasingly replacing human workers in many industries. Some people believe this will create more opportunities than problems, while others think it will lead to widespread unemployment. To what extent do you agree or disagree?',
  },
  {
    id: 't2-city-env',
    taskType: 'task2',
    essayType: 'problem_solution',
    title: 'Ô nhiễm & Giao thông đô thị (Problem - Solution)',
    prompt:
      'In many major cities around the world, traffic congestion and air pollution are becoming severe problems. What are the main causes of these issues, and what measures can governments and individuals take to address them?',
  },
  {
    id: 't2-edu-online',
    taskType: 'task2',
    essayType: 'discussion',
    title: 'Học trực tuyến vs Học truyền thống (Discussion)',
    prompt:
      'Some people argue that university courses should be delivered primarily online to make education more accessible, whereas others believe in-person classroom teaching remains irreplaceable. Discuss both views and give your own opinion.',
  },
  {
    id: 't1-chart-sample',
    taskType: 'task1',
    essayType: 'chart_graph',
    title: 'Biểu đồ Xu hướng (Dán ảnh Ctrl+V hoặc nhập số liệu)',
    prompt:
      'The chart below shows the percentage of households with internet access in three countries between 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  },
];

