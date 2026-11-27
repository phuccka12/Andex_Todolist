import { authService } from './authService';
import { API_BASE } from './config';

export interface JournalEntry {
  id?: string;
  _id?: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  title: string;
  mood: 'grateful' | 'happy' | 'venting' | 'exhausted' | 'peaceful' | 'nostalgic';
  weather?: 'sunny' | 'rainy' | 'cloudy' | 'windy' | 'night';
  content: string;
  positives: string[];
  negatives: string[];
  photos: string[];
  photoCount?: number;
  hasDeferredCover?: boolean;
  isBurnedNegative?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface JournalSummaryPage {
  items: JournalEntry[];
  totalCount: number;
  hasMore: boolean;
}

const GUEST_JOURNAL_KEY = 'gencoore_guest_journals_v1';
const SESSION_CACHE_PREFIX = 'gencoore_journal_summary_cache_v1_';

const memorySummaryCache = new Map<string, JournalSummaryPage>();
const coverBlobCache = new Map<string, string>();
const coverInFlight = new Map<string, Promise<string | null>>();
const fullEntryInFlight = new Map<string, Promise<JournalEntry | null>>();

function resolveCacheKey(userKey?: string): string {
  if (userKey) return userKey;
  return authService.getToken() ? 'authed_default' : 'guest';
}

function readSessionSummaryCache(cacheKey: string): JournalSummaryPage | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) {
      return {
        items: parsed.items,
        totalCount: Number(parsed.totalCount) || parsed.items.length,
        hasMore: Boolean(parsed.hasMore),
      };
    }
  } catch {}
  return null;
}

function writeSessionSummaryCache(cacheKey: string, page: JournalSummaryPage): void {
  if (typeof window === 'undefined') return;
  try {
    // Strip large inline base64 strings before writing to sessionStorage to keep storage fast & tiny
    const compactItems = page.items.slice(0, 30).map((item) => {
      const firstPhoto = item.photos?.[0];
      const keepInline =
        typeof firstPhoto === 'string' &&
        (firstPhoto.startsWith('http://') ||
          firstPhoto.startsWith('https://') ||
          firstPhoto.length <= 40_000);
      return {
        ...item,
        photos: keepInline && firstPhoto ? [firstPhoto] : [],
        hasDeferredCover: Boolean(item.hasDeferredCover || (!keepInline && (item.photoCount || item.photos?.length))),
      };
    });
    sessionStorage.setItem(
      `${SESSION_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify({
        items: compactItems,
        totalCount: page.totalCount,
        hasMore: page.hasMore,
      })
    );
  } catch {}
}

export function getCachedJournalSummary(userKey?: string): JournalSummaryPage | null {
  const key = resolveCacheKey(userKey);
  const mem = memorySummaryCache.get(key);
  if (mem) return mem;
  const session = readSessionSummaryCache(key);
  if (session) {
    memorySummaryCache.set(key, session);
    return session;
  }
  return null;
}

export function setCachedJournalSummary(page: JournalSummaryPage, userKey?: string): void {
  const key = resolveCacheKey(userKey);
  memorySummaryCache.set(key, page);
  writeSessionSummaryCache(key, page);
}

function mutateCachedSummary(
  updater: (items: JournalEntry[]) => JournalEntry[],
  deltaTotal = 0
): void {
  memorySummaryCache.forEach((cached, key) => {
    const nextItems = updater(cached.items);
    const nextTotal = Math.max(nextItems.length, cached.totalCount + deltaTotal);
    const nextPage: JournalSummaryPage = {
      items: nextItems,
      totalCount: nextTotal,
      hasMore: nextItems.length < nextTotal,
    };
    memorySummaryCache.set(key, nextPage);
    writeSessionSummaryCache(key, nextPage);
  });
}

function readLocalJournals(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_JOURNAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  const starter: JournalEntry = {
    id: `local-journal-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    title: 'Trang nhật ký đầu tiên: Khởi đầu một chặng đường',
    mood: 'peaceful',
    weather: 'night',
    content:
      'Hôm nay là một ngày đặc biệt. Khi đặt bút viết lại những suy nghĩ và khoảng lặng sau giờ làm việc, lòng thấy nhẹ nhõm hơn nhiều.',
    positives: ['Uống một tách trà nóng buổi chiều', 'Không gian làm việc gọn gàng, ấm cúng'],
    negatives: [],
    photos: [],
    photoCount: 0,
    isBurnedNegative: false,
  };
  writeLocalJournals([starter]);
  return [starter];
}

function writeLocalJournals(entries: JournalEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_JOURNAL_KEY, JSON.stringify(entries));
  } catch {}
}

export async function fetchJournalSummaryPage(options?: {
  limit?: number;
  skip?: number;
  userKey?: string;
}): Promise<JournalSummaryPage> {
  const limit = options?.limit ?? 18;
  const skip = options?.skip ?? 0;

  if (!authService.getToken()) {
    const all = readLocalJournals();
    const sorted = [...all].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const items = sorted.slice(skip, skip + limit).map((j) => ({
      ...j,
      photoCount: j.photos?.length || 0,
    }));
    const page: JournalSummaryPage = {
      items,
      totalCount: sorted.length,
      hasMore: skip + items.length < sorted.length,
    };
    if (skip === 0) setCachedJournalSummary(page, options?.userKey || 'guest');
    return page;
  }

  try {
    const params = new URLSearchParams({
      summary: '1',
      paginated: '1',
      limit: String(limit),
      skip: String(skip),
    });
    const res = await fetch(`${API_BASE}/journals?${params.toString()}`, {
      cache: 'no-store',
      headers: {
        ...authService.getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error('Failed to fetch journals summary');
    const data = (await res.json()) as JournalSummaryPage;
    if (skip === 0 && Array.isArray(data.items)) {
      setCachedJournalSummary(data, options?.userKey);
    }
    return data;
  } catch (err) {
    console.error('fetchJournalSummaryPage error:', err);
    const fallback = skip === 0 ? getCachedJournalSummary(options?.userKey) : null;
    return fallback || { items: [], totalCount: 0, hasMore: false };
  }
}

export async function fetchJournalCoverUrl(
  id: string,
  version = ''
): Promise<string | null> {
  if (!id || id.startsWith('local-journal-') || !authService.getToken()) {
    return null;
  }

  const cacheKey = `${id}:${version}`;
  const cached = coverBlobCache.get(cacheKey);
  if (cached) return cached;

  const existingPromise = coverInFlight.get(cacheKey);
  if (existingPromise) return existingPromise;

  const request = (async () => {
    try {
      const res = await fetch(`${API_BASE}/journals/${id}/cover`, {
        headers: {
          ...authService.getAuthHeaders(),
        },
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      coverBlobCache.set(cacheKey, objectUrl);
      return objectUrl;
    } catch {
      return null;
    } finally {
      coverInFlight.delete(cacheKey);
    }
  })();

  coverInFlight.set(cacheKey, request);
  return request;
}

export async function fetchJournalById(id: string): Promise<JournalEntry | null> {
  if (!id) return null;
  if (!authService.getToken() || id.startsWith('local-journal-')) {
    return readLocalJournals().find((j) => j.id === id) || null;
  }

  const existing = fullEntryInFlight.get(id);
  if (existing) return existing;

  const request = (async () => {
    try {
      const res = await fetch(`${API_BASE}/journals/${id}`, {
        cache: 'no-store',
        headers: {
          ...authService.getAuthHeaders(),
        },
      });
      if (!res.ok) return null;
      const full = (await res.json()) as JournalEntry;
      mutateCachedSummary((items) =>
        items.map((item) =>
          item.id === full.id
            ? {
                ...item,
                ...full,
                photoCount: full.photos?.length || 0,
                hasDeferredCover: false,
              }
            : item
        )
      );
      return full;
    } catch (err) {
      console.error('fetchJournalById error:', err);
      return null;
    } finally {
      fullEntryInFlight.delete(id);
    }
  })();

  fullEntryInFlight.set(id, request);
  return request;
}

export async function fetchJournals(): Promise<JournalEntry[]> {
  if (!authService.getToken()) {
    return readLocalJournals();
  }

  try {
    const res = await fetch(`${API_BASE}/journals`, {
      cache: 'no-store',
      headers: {
        ...authService.getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error('Failed to fetch journals');
    return await res.json();
  } catch (err) {
    console.error('fetchJournals error:', err);
    return [];
  }
}

export async function createJournal(entry: Partial<JournalEntry>): Promise<JournalEntry> {
  if (!authService.getToken()) {
    const list = readLocalJournals();
    const created: JournalEntry = {
      id: `local-journal-${Date.now()}`,
      date: entry.date || new Date().toISOString().split('T')[0],
      title: entry.title?.trim() || 'Nhật ký hôm nay',
      mood: entry.mood || 'peaceful',
      weather: entry.weather || 'night',
      content: entry.content || '',
      positives: Array.isArray(entry.positives) ? entry.positives : [],
      negatives: Array.isArray(entry.negatives) ? entry.negatives : [],
      photos: Array.isArray(entry.photos) ? entry.photos : [],
      photoCount: Array.isArray(entry.photos) ? entry.photos.length : 0,
      isBurnedNegative: false,
      createdAt: new Date().toISOString(),
    };
    writeLocalJournals([created, ...list]);
    mutateCachedSummary((items) => [created, ...items], 1);
    return created;
  }

  const res = await fetch(`${API_BASE}/journals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to create journal entry');
  const created = (await res.json()) as JournalEntry;
  const enriched: JournalEntry = {
    ...created,
    photoCount: created.photos?.length || 0,
    hasDeferredCover: false,
  };
  mutateCachedSummary((items) => [enriched, ...items], 1);
  return enriched;
}

export async function updateJournal(id: string, entry: Partial<JournalEntry>): Promise<JournalEntry> {
  if (!authService.getToken() || id.startsWith('local-journal-')) {
    const list = readLocalJournals();
    let updatedItem: JournalEntry | null = null;
    const next = list.map((j) => {
      if (j.id === id) {
        updatedItem = {
          ...j,
          ...entry,
          photoCount: Array.isArray(entry.photos) ? entry.photos.length : j.photos?.length || 0,
          updatedAt: new Date().toISOString(),
        };
        return updatedItem;
      }
      return j;
    });
    writeLocalJournals(next);
    if (!updatedItem) throw new Error('Journal entry not found');
    mutateCachedSummary((items) => items.map((i) => (i.id === id ? updatedItem! : i)));
    return updatedItem;
  }

  const res = await fetch(`${API_BASE}/journals/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to update journal entry');
  const updated = (await res.json()) as JournalEntry;
  const enriched: JournalEntry = {
    ...updated,
    photoCount: updated.photos?.length || 0,
    hasDeferredCover: false,
  };
  mutateCachedSummary((items) => items.map((i) => (i.id === id ? enriched : i)));
  return enriched;
}

export async function burnNegatives(id: string): Promise<JournalEntry> {
  if (!authService.getToken() || id.startsWith('local-journal-')) {
    return await updateJournal(id, { negatives: [], isBurnedNegative: true });
  }

  const res = await fetch(`${API_BASE}/journals/${id}/burn-negatives`, {
    method: 'POST',
    headers: {
      ...authService.getAuthHeaders(),
    },
  });
  if (!res.ok) throw new Error('Failed to burn negatives');
  const data = await res.json();
  return data.journal;
}

export async function deleteJournal(id: string): Promise<boolean> {
  if (!authService.getToken() || id.startsWith('local-journal-')) {
    const list = readLocalJournals();
    writeLocalJournals(list.filter((j) => j.id !== id));
    mutateCachedSummary((items) => items.filter((i) => i.id !== id), -1);
    return true;
  }

  const res = await fetch(`${API_BASE}/journals/${id}`, {
    method: 'DELETE',
    headers: {
      ...authService.getAuthHeaders(),
    },
  });
  if (!res.ok) throw new Error('Failed to delete journal entry');
  const data = await res.json();
  mutateCachedSummary((items) => items.filter((i) => i.id !== id), -1);
  return data.success;
}
