import { authService } from './authService';
import { API_BASE } from './config';

export interface VocabItem {
  id: string;
  userId?: string;
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning: string;
  example?: string;
  exampleTranslation?: string;
  topic: string;
  srsLevel: number; // 0..5
  nextReviewAt: string;
  lastReviewedAt?: string | null;
  reviewCount: number;
  correctCount: number;
  createdAt?: string;
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface ExtractedVocabDraft {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  topic: string;
  selected?: boolean;
}

const VOCAB_CACHE_KEY = 'gencoore_cached_vocab_v1';

function readCachedVocab(): VocabItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VOCAB_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedVocab(list: VocabItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VOCAB_CACHE_KEY, JSON.stringify(list));
  } catch {}
}

export async function fetchVocab(): Promise<VocabItem[]> {
  if (!authService.getToken()) {
    return readCachedVocab();
  }

  try {
    const res = await fetch(`${API_BASE}/vocab`, {
      cache: 'no-store',
      headers: { ...authService.getAuthHeaders() },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      writeCachedVocab(data);
      return data;
    }
    return [];
  } catch {
    return readCachedVocab();
  }
}

export async function createVocab(payload: Partial<VocabItem>): Promise<VocabItem> {
  const createLocally = (): VocabItem => {
    const cached = readCachedVocab();
    const cleanWord = payload.word?.trim() || '';
    const dup = cached.some((w) => w.word.toLowerCase() === cleanWord.toLowerCase());
    if (dup) {
      throw new Error(`Từ "${cleanWord}" đã có trong kho từ vựng của bạn.`);
    }

    const localItem: VocabItem = {
      id: `local-vocab-${Date.now()}`,
      word: cleanWord,
      phonetic: payload.phonetic?.trim() || '',
      partOfSpeech: payload.partOfSpeech?.trim() || '',
      meaning: payload.meaning?.trim() || '',
      example: payload.example?.trim() || '',
      exampleTranslation: payload.exampleTranslation?.trim() || '',
      topic: payload.topic?.trim() || 'Chung',
      srsLevel: 0,
      nextReviewAt: new Date().toISOString(),
      reviewCount: 0,
      correctCount: 0,
    };
    writeCachedVocab([localItem, ...cached]);
    return localItem;
  };

  if (!authService.getToken()) {
    return createLocally();
  }

  const res = await fetch(`${API_BASE}/vocab`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 400) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || 'Dữ liệu từ vựng không hợp lệ.');
  }
  if (!res.ok) {
    return createLocally();
  }

  const created = await res.json();
  const cached = readCachedVocab();
  writeCachedVocab([created, ...cached]);
  return created;
}

export async function bulkCreateVocab(
  words: Partial<VocabItem>[]
): Promise<{ insertedCount: number; skippedCount: number; words: VocabItem[] }> {
  const bulkLocally = () => {
    const cached = readCachedVocab();
    const existingSet = new Set(cached.map((w) => w.word.toLowerCase()));
    const added: VocabItem[] = [];
    let skippedCount = 0;

    for (const item of words) {
      const cleanWord = item.word?.trim();
      const cleanMeaning = item.meaning?.trim();
      if (!cleanWord || !cleanMeaning || existingSet.has(cleanWord.toLowerCase())) {
        skippedCount++;
        continue;
      }
      existingSet.add(cleanWord.toLowerCase());
      added.push({
        id: `local-vocab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        word: cleanWord,
        phonetic: item.phonetic || '',
        partOfSpeech: item.partOfSpeech || '',
        meaning: cleanMeaning,
        example: item.example || '',
        exampleTranslation: item.exampleTranslation || '',
        topic: item.topic || 'Chung',
        srsLevel: 0,
        nextReviewAt: new Date().toISOString(),
        reviewCount: 0,
        correctCount: 0,
      });
    }

    writeCachedVocab([...added, ...cached]);
    return { insertedCount: added.length, skippedCount, words: added };
  };

  if (!authService.getToken()) {
    return bulkLocally();
  }

  try {
    const res = await fetch(`${API_BASE}/vocab/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify({ words }),
    });
    if (!res.ok) throw new Error('Bulk insert failed');
    const data = await res.json();
    if (Array.isArray(data.words)) {
      const cached = readCachedVocab();
      writeCachedVocab([...data.words, ...cached]);
    }
    return data;
  } catch {
    return bulkLocally();
  }
}

export async function aiExtractVocab(payload: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
  topic?: string;
}): Promise<ExtractedVocabDraft[]> {
  const res = await fetch(`${API_BASE}/vocab/ai-extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Không thể tự động trích xuất từ vựng.');
  }
  return Array.isArray(data.words)
    ? data.words.map((w: ExtractedVocabDraft) => ({ ...w, selected: true }))
    : [];
}

export async function reviewVocab(id: string, rating: ReviewRating): Promise<VocabItem> {
  const reviewLocally = (): VocabItem => {
    const cached = readCachedVocab();
    const target = cached.find((w) => w.id === id);
    if (!target) throw new Error('Word not found');

    const now = new Date();
    const intervals = [1, 3, 7, 14, 30, 60];
    let nextLevel = target.srsLevel || 0;
    const nextDate = new Date(now);

    if (rating === 'again') {
      nextLevel = 0;
      nextDate.setMinutes(nextDate.getMinutes() + 5);
    } else if (rating === 'hard') {
      nextLevel = Math.max(1, nextLevel);
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (rating === 'good') {
      nextLevel = Math.min(5, nextLevel + 1);
      nextDate.setDate(nextDate.getDate() + (intervals[Math.max(0, nextLevel - 1)] || 1));
    } else {
      nextLevel = Math.min(5, nextLevel + 2);
      nextDate.setDate(nextDate.getDate() + (intervals[Math.max(0, nextLevel - 1)] || 3));
    }

    const updated: VocabItem = {
      ...target,
      srsLevel: nextLevel,
      nextReviewAt: nextDate.toISOString(),
      lastReviewedAt: now.toISOString(),
      reviewCount: (target.reviewCount || 0) + 1,
      correctCount: rating === 'good' || rating === 'easy' ? (target.correctCount || 0) + 1 : target.correctCount || 0,
    };
    writeCachedVocab(cached.map((w) => (w.id === id ? updated : w)));
    return updated;
  };

  if (!authService.getToken() || id.startsWith('local-vocab-')) {
    return reviewLocally();
  }

  try {
    const res = await fetch(`${API_BASE}/vocab/${id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify({ rating }),
    });
    if (!res.ok) throw new Error('Review failed');
    const updated = await res.json();
    const cached = readCachedVocab();
    writeCachedVocab(cached.map((w) => (w.id === updated.id ? updated : w)));
    return updated;
  } catch {
    return reviewLocally();
  }
}

export async function updateVocab(id: string, updates: Partial<VocabItem>): Promise<VocabItem> {
  const updateLocally = (): VocabItem => {
    const cached = readCachedVocab();
    let updatedItem: VocabItem | null = null;
    const next = cached.map((w) => {
      if (w.id === id) {
        updatedItem = { ...w, ...updates };
        return updatedItem;
      }
      return w;
    });
    writeCachedVocab(next);
    if (!updatedItem) throw new Error('Không tìm thấy từ vựng.');
    return updatedItem;
  };

  if (!authService.getToken() || id.startsWith('local-vocab-')) {
    return updateLocally();
  }

  try {
    const res = await fetch(`${API_BASE}/vocab/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Update vocab failed');
    const updated = await res.json();
    const cached = readCachedVocab();
    writeCachedVocab(cached.map((w) => (w.id === updated.id ? updated : w)));
    return updated;
  } catch {
    return updateLocally();
  }
}

export async function deleteVocab(id: string): Promise<boolean> {
  const cached = readCachedVocab();
  writeCachedVocab(cached.filter((w) => w.id !== id));

  if (!authService.getToken() || id.startsWith('local-vocab-')) {
    return true;
  }

  try {
    const res = await fetch(`${API_BASE}/vocab/${id}`, {
      method: 'DELETE',
      headers: { ...authService.getAuthHeaders() },
    });
    return res.ok;
  } catch {
    return true;
  }
}

/**
 * Parses CSV/TSV or delimited lines ("word,meaning" / "word - meaning" / "word | meaning").
 * Returns null if the input looks like raw words-only or paragraph text that needs AI extraction.
 */
export function parseStructuredVocabLines(
  rawText: string,
  defaultTopic = 'Chung'
): ExtractedVocabDraft[] | null {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  const parsed: ExtractedVocabDraft[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip CSV header line if present
    if (i === 0 && /^(word|term|tu|từ)\s*[,;\t|]/i.test(line)) {
      continue;
    }

    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t').map((p) => p.trim());
    } else if (line.includes('|')) {
      parts = line.split('|').map((p) => p.trim());
    } else if (line.includes(' - ')) {
      parts = line.split(' - ').map((p) => p.trim());
    } else if (line.includes(': ')) {
      parts = line.split(': ').map((p) => p.trim());
    } else if (line.includes(',')) {
      // Basic CSV split respecting quotes
      const csvCols = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
      if (csvCols && csvCols.length >= 2) {
        parts = csvCols.map((c) => c.replace(/^"|"$/g, '').trim());
      }
    }

    if (parts.length >= 2 && parts[0] && parts[1]) {
      parsed.push({
        word: parts[0],
        meaning: parts[1],
        phonetic: parts[2] || '',
        partOfSpeech: '',
        example: parts[3] || '',
        exampleTranslation: '',
        topic: parts[4] || defaultTopic || 'Chung',
        selected: true,
      });
    }
  }

  // Only treat as structured import if at least half of non-empty lines matched word+meaning pairs
  if (parsed.length > 0 && parsed.length >= Math.ceil(lines.length * 0.5)) {
    return parsed;
  }

  return null;
}

/**
 * Browser Text-to-Speech pronunciation for English words/sentences
 */
export function speakEnglishWord(text: string, slow = false): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'en-US';
    utterance.rate = slow ? 0.65 : 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const enVoice =
      voices.find((v) => v.lang === 'en-US' && v.localService) ||
      voices.find((v) => v.lang.startsWith('en-US')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (enVoice) {
      utterance.voice = enVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {}
}

