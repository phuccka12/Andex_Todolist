import { TaskItem, PostcardEmail } from './types';
import { authService } from './authService';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchTasks(): Promise<TaskItem[]> {
  try {
    const headers: Record<string, string> = {
      ...authService.getAuthHeaders(),
    };
    const res = await fetch(`${API_BASE}/tasks`, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return [];
  }
}

export async function createTask(taskData: Partial<TaskItem>): Promise<TaskItem> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authService.getAuthHeaders(),
  };
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(taskData),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return await res.json();
}

export async function updateTask(id: string, updates: Partial<TaskItem>): Promise<TaskItem> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authService.getAuthHeaders(),
  };
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return await res.json();
}

export async function completeTask(id: string): Promise<TaskItem> {
  const headers: Record<string, string> = {
    ...authService.getAuthHeaders(),
  };
  const res = await fetch(`${API_BASE}/tasks/${id}/complete`, {
    method: 'PUT',
    headers,
  });
  if (!res.ok) throw new Error('Failed to complete task');
  return await res.json();
}

export async function toggleChecklistItem(taskId: string, checklistId: string): Promise<TaskItem> {
  const headers: Record<string, string> = {
    ...authService.getAuthHeaders(),
  };
  const res = await fetch(`${API_BASE}/tasks/${taskId}/checklist/${checklistId}`, {
    method: 'PATCH',
    headers,
  });
  if (!res.ok) throw new Error('Failed to toggle checklist item');
  return await res.json();
}

export async function deleteTask(id: string): Promise<boolean> {
  const headers: Record<string, string> = {
    ...authService.getAuthHeaders(),
  };
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete task');
  const data = await res.json();
  return data.success;
}

export async function sendPostcardEmail(payload: PostcardEmail): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/email/send-postcard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to send postcard email');
  return await res.json();
}

export interface ScheduleReminderPayload {
  recipient: string;
  subject?: string;
  dateStr?: string;
  customMessage?: string;
  tasks?: Array<{
    title: string;
    time?: string;
    priority?: string;
    category?: string;
    note?: string;
    column?: string;
    scheduled_date?: string;
  }>;
}

export async function sendScheduleReminderEmail(payload: ScheduleReminderPayload): Promise<{
  success: boolean;
  message: string;
  previewUrl?: string;
  recipient: string;
}> {
  const res = await fetch(`${API_BASE}/email/send-schedule-reminder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to send schedule reminder email');
  }
  return await res.json();
}

export async function getReminderSettings(email?: string) {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  const res = await fetch(`${API_BASE}/email/settings${query}`, {
    headers: {
      ...authService.getAuthHeaders(),
    },
  });
  if (!res.ok) throw new Error('Failed to fetch reminder settings');
  return await res.json();
}

export async function saveReminderSettings(settings: {
  targetEmail: string;
  autoMorningBriefing: boolean;
  morningBriefingTime: string;
  autoUpcomingReminder: boolean;
  upcomingMinutesBefore: number;
  customSmtp?: any;
}) {
  const res = await fetch(`${API_BASE}/email/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save reminder settings');
  return await res.json();
}

export async function testTelegramConnection(payload: { chatId: string; botToken?: string }) {
  const res = await fetch(`${API_BASE}/telegram/test-connection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Lỗi gửi tin nhắn thử nghiệm Telegram');
  return data;
}

export async function sendTelegramSchedule(payload: {
  chatId: string;
  botToken?: string;
  customNote?: string;
  tasks?: any[];
}) {
  const res = await fetch(`${API_BASE}/telegram/send-schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Lỗi gửi lịch sang Telegram');
  return data;
}

export async function getTelegramSettings(email?: string) {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  const res = await fetch(`${API_BASE}/telegram/settings${query}`, {
    headers: {
      ...authService.getAuthHeaders(),
    },
  });
  if (!res.ok) throw new Error('Failed to fetch Telegram settings');
  return await res.json();
}

export async function saveTelegramSettings(settings: {
  targetEmail?: string;
  chatId: string;
  botToken?: string;
  enabled: boolean;
  autoMorningBriefing: boolean;
  autoUpcomingReminder: boolean;
  upcomingMinutesBefore: number;
}) {
  const res = await fetch(`${API_BASE}/telegram/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify(settings),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Lỗi lưu cấu hình Telegram');
  return data;
}

export async function getAiStatus(): Promise<{ isReady: boolean; model: string }> {
  try {
    const res = await fetch(`${API_BASE}/ai/status`);
    if (!res.ok) return { isReady: false, model: 'gemini-3.8-flash' };
    return await res.json();
  } catch {
    return { isReady: false, model: 'gemini-3.8-flash' };
  }
}

export interface AiStreamCallbacks {
  onStatus?: (status: { message: string }) => void;
  onAction?: (action: { action: string; task: TaskItem }) => void;
  onToken?: (token: { text: string }) => void;
  onError?: (err: { error: string }) => void;
  onDone?: () => void;
}

export async function streamAiChat(
  prompt: string,
  conversationHistory: any[],
  callbacks: AiStreamCallbacks,
  customApiKey?: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authService.getAuthHeaders(),
  };

  const response = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      conversationHistory,
      customApiKey,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || `HTTP error ${response.status}`);
  }

  if (!response.body) {
    throw new Error('ReadableStream not supported in browser environment');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || ''; // Keep partial chunk in buffer

    for (const eventBlock of events) {
      if (!eventBlock.trim() || eventBlock.startsWith(':')) continue;

      const lines = eventBlock.split('\n');
      let eventType = '';
      let eventDataStr = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.replace('event:', '').trim();
        } else if (line.startsWith('data:')) {
          eventDataStr = line.replace('data:', '').trim();
        }
      }

      if (!eventDataStr) continue;

      try {
        const parsed = JSON.parse(eventDataStr);
        if (eventType === 'status') {
          callbacks.onStatus?.(parsed);
        } else if (eventType === 'action') {
          callbacks.onAction?.(parsed);
        } else if (eventType === 'token') {
          callbacks.onToken?.(parsed);
        } else if (eventType === 'error') {
          callbacks.onError?.(parsed);
        } else if (eventType === 'done') {
          callbacks.onDone?.();
        }
      } catch (err) {
        console.warn('SSE parse error:', err, eventDataStr);
      }
    }
  }

  callbacks.onDone?.();
}



