import { TaskItem } from './types';

const STREAK_KEY = 'cbp_streak_activity_v1';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  lastActiveDate: string;
}

export function recordStreakActivity(): void {
  if (typeof window === 'undefined') return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = localStorage.getItem(STREAK_KEY);
    const activeDates: string[] = raw ? JSON.parse(raw) : [];

    if (!activeDates.includes(today)) {
      activeDates.push(today);
      localStorage.setItem(STREAK_KEY, JSON.stringify(activeDates));
    }
  } catch (e) {
    console.error('Failed to record streak:', e);
  }
}

export function calculateRealStreak(tasks: TaskItem[]): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    const recordedDates: string[] = raw ? JSON.parse(raw) : [];

    // Also collect dates from real completed tasks in MongoDB
    const completedTasks = tasks.filter((t) => t.column === 'done');
    completedTasks.forEach((t: any) => {
      if (t.updatedAt) {
        const d = new Date(t.updatedAt).toISOString().split('T')[0];
        if (!recordedDates.includes(d)) recordedDates.push(d);
      }
    });

    if (recordedDates.length === 0) {
      // If completed tasks exist, base streak on completed count
      return completedTasks.length > 0 ? Math.min(completedTasks.length, 5) : 0;
    }

    // Sort dates ascending
    recordedDates.sort();

    // Check consecutive days ending today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let checkDate = new Date(today);

    // If today is not in recorded dates, check from yesterday
    const todayStr = checkDate.toISOString().split('T')[0];
    if (!recordedDates.includes(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (recordedDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Fallback: If streak is 0 but there are completed tasks, credit 1 streak for having done work
    if (streak === 0 && completedTasks.length > 0) {
      return 1;
    }

    return streak;
  } catch (e) {
    console.error('Failed to compute streak:', e);
    return 0;
  }
}
