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
  isBurnedNegative?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const GUEST_JOURNAL_KEY = 'gencoore_guest_journals_v1';

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
      isBurnedNegative: false,
      createdAt: new Date().toISOString(),
    };
    writeLocalJournals([created, ...list]);
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
  return await res.json();
}

export async function updateJournal(id: string, entry: Partial<JournalEntry>): Promise<JournalEntry> {
  if (!authService.getToken() || id.startsWith('local-journal-')) {
    const list = readLocalJournals();
    let updatedItem: JournalEntry | null = null;
    const next = list.map((j) => {
      if (j.id === id) {
        updatedItem = { ...j, ...entry, updatedAt: new Date().toISOString() };
        return updatedItem;
      }
      return j;
    });
    writeLocalJournals(next);
    if (!updatedItem) throw new Error('Journal entry not found');
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
  return await res.json();
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
  return data.success;
}
