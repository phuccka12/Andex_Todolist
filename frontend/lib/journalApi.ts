import { authService } from './authService';

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchJournals(): Promise<JournalEntry[]> {
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
