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

const TOPIC_KEYWORD_RULES: Array<{ topic: string; keywords: string[] }> = [
  {
    topic: 'IT & Tech',
    keywords: [
      'code', 'coding', 'software', 'server', 'database', 'api', 'deploy', 'bug', 'algorithm',
      'framework', 'frontend', 'backend', 'cloud', 'network', 'cyber', 'security', 'encrypt',
      'debug', 'compile', 'latency', 'cache', 'query', 'interface', 'system', 'hardware',
      'lập trình', 'phần mềm', 'dữ liệu', 'máy chủ', 'thuật toán', 'bảo mật', 'hệ thống', 'mạng',
    ],
  },
  {
    topic: 'Kinh doanh',
    keywords: [
      'business', 'company', 'client', 'customer', 'deadline', 'meeting', 'strategy', 'startup',
      'negotiate', 'negotiation', 'contract', 'marketing', 'brand', 'sales', 'product', 'launch',
      'workflow', 'streamline', 'manage', 'leadership', 'stakeholder', 'enterprise', 'pitch',
      'kinh doanh', 'khách hàng', 'chiến lược', 'hợp đồng', 'họp', 'thương lượng', 'lãnh đạo', 'dự án',
    ],
  },
  {
    topic: 'Tài chính',
    keywords: [
      'finance', 'financial', 'invest', 'investment', 'stock', 'market', 'budget', 'revenue',
      'profit', 'loss', 'inflation', 'debt', 'asset', 'equity', 'tax', 'bank', 'interest',
      'tài chính', 'đầu tư', 'ngân sách', 'doanh thu', 'lợi nhuận', 'lạm phát', 'cổ phiếu', 'thuế',
    ],
  },
  {
    topic: 'Cảm xúc & Tâm lý',
    keywords: [
      'resilient', 'resilience', 'empathy', 'anxious', 'anxiety', 'burnout', 'stress', 'calm',
      'grateful', 'gratitude', 'mindset', 'emotion', 'confidence', 'overwhelm', 'procrastinate',
      'motivation', 'inspire', 'frustrated', 'peaceful', 'nostalgic', 'optimistic',
      'kiên cường', 'đồng cảm', 'lo âu', 'căng thẳng', 'trì hoãn', 'biết ơn', 'tâm lý', 'cảm xúc', 'tự tin',
    ],
  },
  {
    topic: 'Sức khỏe',
    keywords: [
      'health', 'healthy', 'workout', 'exercise', 'nutrition', 'diet', 'sleep', 'fatigue',
      'therapy', 'medicine', 'doctor', 'hospital', 'immune', 'vitamin', 'fitness', 'yoga',
      'sức khỏe', 'dinh dưỡng', 'tập luyện', 'giấc ngủ', 'bệnh', 'bác sĩ', 'thể chất',
    ],
  },
  {
    topic: 'Du lịch',
    keywords: [
      'travel', 'trip', 'itinerary', 'flight', 'airport', 'hotel', 'luggage', 'passport',
      'visa', 'destination', 'tour', 'tourist', 'embark', 'journey', 'commute', 'cruise',
      'du lịch', 'chuyến bay', 'hành trình', 'khách sạn', 'hộ chiếu', 'hành lý', 'điểm đến',
    ],
  },
  {
    topic: 'IELTS & Học thuật',
    keywords: [
      'mitigate', 'exacerbate', 'ubiquitous', 'paradigm', 'empirical', 'sustainable', 'phenomenon',
      'hypothesis', 'methodology', 'significant', 'fluctuate', 'consequently', 'ambiguous',
      'eloquent', 'comprehensive', 'preliminary', 'curriculum', 'dissertation', 'research',
      'học thuật', 'nghiên cứu', 'giảm thiểu', 'trầm trọng', 'phổ biến', 'bền vững', 'giả thuyết', 'luận văn',
    ],
  },
  {
    topic: 'Giao tiếp',
    keywords: [
      'greet', 'apologize', 'compliment', 'persuade', 'fluent', 'conversation', 'discuss',
      'clarify', 'respond', 'feedback', 'polite', 'casual', 'colleague', 'acquaintance',
      'giao tiếp', 'xin lỗi', 'khen ngợi', 'thuyết phục', 'trò chuyện', 'phản hồi', 'lịch sự',
    ],
  },
];

export function classifyTopicByKeywords(
  word: string,
  meaning = '',
  example = '',
  requestedTopic?: string
): string {
  const cleanReq = (requestedTopic || '').trim();
  if (cleanReq && !['chung', 'tự động', 'auto'].includes(cleanReq.toLowerCase())) {
    return cleanReq;
  }

  const haystack = `${word} ${meaning} ${example}`.toLowerCase();
  let bestTopic = 'Đời sống';
  let bestScore = 0;

  for (const rule of TOPIC_KEYWORD_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (haystack.includes(kw)) {
        score += kw.includes(' ') ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = rule.topic;
    }
  }

  return bestTopic;
}

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
      topic: classifyTopicByKeywords(
        cleanWord,
        payload.meaning || '',
        payload.example || '',
        payload.topic
      ),
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
        topic: classifyTopicByKeywords(cleanWord, cleanMeaning, item.example || '', item.topic),
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

export async function clearAllVocab(): Promise<boolean> {
  writeCachedVocab([]);
  if (!authService.getToken()) {
    return true;
  }
  try {
    const res = await fetch(`${API_BASE}/vocab/all`, {
      method: 'DELETE',
      headers: { ...authService.getAuthHeaders() },
    });
    return res.ok;
  } catch {
    return true;
  }
}

export async function autoTagExistingVocab(): Promise<{ updatedCount: number; words: VocabItem[] }> {
  const autoTagLocally = () => {
    const cached = readCachedVocab();
    let updatedCount = 0;
    const next = cached.map((item) => {
      const curr = (item.topic || '').trim().toLowerCase();
      if (!curr || curr === 'chung' || curr === 'tự động' || curr === 'từ ảnh') {
        const nextTopic = classifyTopicByKeywords(item.word, item.meaning, item.example || '');
        if (nextTopic !== item.topic) {
          updatedCount++;
          return { ...item, topic: nextTopic };
        }
      }
      return item;
    });
    writeCachedVocab(next);
    return { updatedCount, words: next };
  };

  if (!authService.getToken()) {
    return autoTagLocally();
  }

  try {
    const res = await fetch(`${API_BASE}/vocab/auto-tag`, {
      method: 'POST',
      headers: { ...authService.getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Auto-tag failed');
    const data = await res.json();
    if (Array.isArray(data.words)) {
      writeCachedVocab(data.words);
    }
    return { updatedCount: data.updatedCount || 0, words: data.words || [] };
  } catch {
    return autoTagLocally();
  }
}

function splitCsvLine(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result.map((cell) => cell.replace(/^"|"$/g, '').trim());
}

/**
 * Parses CSV/TSV or delimited lines.
 * Supports header-mapped columns (word, meaning, phonetic, partOfSpeech, example, exampleTranslation, topic)
 * as well as positional 2..7 column CSV/TSV/dash/pipe rows.
 * Returns null if the input looks like raw words-only or paragraph text that needs AI extraction.
 */
export function parseStructuredVocabLines(
  rawText: string,
  defaultTopic = 'Chung'
): ExtractedVocabDraft[] | null {
  const cleanText = rawText.replace(/^\uFEFF/, '');
  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  const parsed: ExtractedVocabDraft[] = [];
  let colMap: Record<string, number> | null = null;
  let startIdx = 0;

  const firstParts = lines[0].includes('\t')
    ? splitCsvLine(lines[0], '\t')
    : lines[0].includes(';') && !lines[0].includes(',')
    ? splitCsvLine(lines[0], ';')
    : lines[0].includes('|')
    ? splitCsvLine(lines[0], '|')
    : lines[0].includes(',')
    ? splitCsvLine(lines[0], ',')
    : [];

  if (
    firstParts.length >= 2 &&
    /^(word|term|tu|từ|english|từ vựng)$/i.test(firstParts[0])
  ) {
    colMap = {};
    firstParts.forEach((header, idx) => {
      const h = header.toLowerCase().replace(/\s+/g, '');
      if (['word', 'term', 'tu', 'từ', 'english', 'từvựng'].includes(h)) colMap!.word = idx;
      else if (['meaning', 'nghia', 'nghĩa', 'definition', 'vietnamese', 'nghĩatiếngviệt'].includes(h))
        colMap!.meaning = idx;
      else if (['phonetic', 'ipa', 'phienam', 'phiênâm'].includes(h)) colMap!.phonetic = idx;
      else if (['partofspeech', 'pos', 'loaitu', 'loạitừ', 'từloại', 'type'].includes(h))
        colMap!.partOfSpeech = idx;
      else if (['example', 'vidu', 'vídụ', 'sentence'].includes(h)) colMap!.example = idx;
      else if (['exampletranslation', 'dichvidu', 'dịchvídụ', 'translation', 'dich'].includes(h))
        colMap!.exampleTranslation = idx;
      else if (['topic', 'tag', 'chude', 'chủđề', 'category'].includes(h)) colMap!.topic = idx;
    });
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = splitCsvLine(line, '\t');
    } else if (line.includes('|')) {
      parts = splitCsvLine(line, '|');
    } else if (line.includes(' - ')) {
      parts = line.split(' - ').map((p) => p.trim());
    } else if (line.includes(': ')) {
      parts = line.split(': ').map((p) => p.trim());
    } else if (line.includes(';')) {
      parts = splitCsvLine(line, ';');
    } else if (line.includes(',')) {
      parts = splitCsvLine(line, ',');
    }

    const word = colMap ? parts[colMap.word ?? 0] || '' : parts[0] || '';
    const meaning = colMap ? parts[colMap.meaning ?? 1] || '' : parts[1] || '';

    if (word && meaning) {
      const phonetic = colMap
        ? colMap.phonetic !== undefined
          ? parts[colMap.phonetic] || ''
          : ''
        : parts[2] || '';
      const partOfSpeech = colMap
        ? colMap.partOfSpeech !== undefined
          ? parts[colMap.partOfSpeech] || ''
          : ''
        : parts.length >= 6
        ? parts[3] || ''
        : '';
      const example = colMap
        ? colMap.example !== undefined
          ? parts[colMap.example] || ''
          : ''
        : parts.length >= 6
        ? parts[4] || ''
        : parts[3] || '';
      const exampleTranslation = colMap
        ? colMap.exampleTranslation !== undefined
          ? parts[colMap.exampleTranslation] || ''
          : ''
        : parts.length >= 6
        ? parts[5] || ''
        : '';
      const rawTopic = colMap
        ? colMap.topic !== undefined
          ? parts[colMap.topic] || ''
          : ''
        : parts.length >= 6
        ? parts[6] || ''
        : parts[4] || '';

      parsed.push({
        word,
        meaning,
        phonetic,
        partOfSpeech,
        example,
        exampleTranslation,
        topic: classifyTopicByKeywords(word, meaning, example, rawTopic || defaultTopic),
        selected: true,
      });
    }
  }

  const effectiveLines = Math.max(1, lines.length - startIdx);
  // Only treat as structured import if at least half of data lines matched word+meaning pairs
  if (parsed.length > 0 && parsed.length >= Math.ceil(effectiveLines * 0.5)) {
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

