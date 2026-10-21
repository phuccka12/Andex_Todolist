import { TaskModel } from '../models/Task.model';

export interface TimeSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
  duration_minutes: number;
}

export interface ScanSlotOptions {
  date: string; // YYYY-MM-DD
  windowStart?: string; // HH:mm, default 08:00
  windowEnd?: string;   // HH:mm, default 21:00
  durationMinutes: number;
  userId?: string;
}

export interface ScanResult {
  hasSlot: boolean;
  selectedSlot?: TimeSlot;
  conflictingTasks?: Array<{ title: string; start: string; end: string }>;
  allFreeSlots?: TimeSlot[];
  message: string;
}

/**
 * TimeResolver Service - Deterministic Anchor & Slot Scanner
 * Implements interval merging algorithm to find free gaps without LLM hallucination
 */
class TimeResolverService {
  /**
   * Helper: Parse "HH:mm" to minutes from 00:00
   */
  public timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
    return (h || 0) * 60 + (m || 0);
  }

  /**
   * Helper: Convert minutes from 00:00 to "HH:mm"
   */
  public minutesToTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Resolve relative anchor string to specific YYYY-MM-DD in Vietnam timezone (+07:00)
   */
  public resolveAnchorDate(anchor: string, baseDateIso?: string): string {
    const now = baseDateIso ? new Date(baseDateIso) : new Date();
    // Offset to +07:00
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    const anchorLower = (anchor || 'today').toLowerCase().trim();

    if (anchorLower === 'tomorrow' || anchorLower === 'mai' || anchorLower === 'ngày mai') {
      vnTime.setUTCDate(vnTime.getUTCDate() + 1);
    } else if (anchorLower === 'day_after_tomorrow' || anchorLower === 'ngày mốt') {
      vnTime.setUTCDate(vnTime.getUTCDate() + 2);
    } else if (anchorLower.startsWith('next_monday') || anchorLower === 'thứ 2 tuần sau') {
      const currentDay = vnTime.getUTCDay(); // 0 is Sunday, 1 is Monday
      const daysUntilNextMonday = ((8 - currentDay) % 7) || 7;
      vnTime.setUTCDate(vnTime.getUTCDate() + daysUntilNextMonday);
    } else if (anchorLower.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return anchorLower;
    }

    return vnTime.toISOString().slice(0, 10);
  }

  /**
   * Scan for free non-conflicting time slots on a given date
   */
  public async scanFreeSlots(options: ScanSlotOptions): Promise<ScanResult> {
    const { date, durationMinutes, windowStart = '08:00', windowEnd = '21:00' } = options;

    const windowStartMin = this.timeToMinutes(windowStart);
    const windowEndMin = this.timeToMinutes(windowEnd);

    const userFilter = options.userId
      ? { userId: options.userId }
      : { $or: [{ userId: null }, { userId: { $exists: false } }] };

    // 1. Fetch all existing tasks for this date for this user
    const dayTasks = await TaskModel.find({
      ...userFilter,
      $or: [
        { scheduled_date: date },
        { scheduled_date: { $exists: false } }, // fallback daily
        { scheduled_date: '' },
      ],
      column: { $ne: 'done' }, // Ignore completed tasks
    }).select('title time_box priority column');

    // 2. Extract and merge busy intervals
    const busyIntervals: Array<{ start: number; end: number; title: string }> = [];

    for (const t of dayTasks) {
      if (t.time_box?.start && t.time_box?.end) {
        const startMin = this.timeToMinutes(t.time_box.start);
        const endMin = this.timeToMinutes(t.time_box.end);
        if (endMin > startMin) {
          busyIntervals.push({ start: startMin, end: endMin, title: t.title });
        }
      }
    }

    // Sort busy intervals by start time
    busyIntervals.sort((a, b) => a.start - b.start);

    // 3. Compute Free Intervals within [windowStartMin, windowEndMin]
    const freeGaps: Array<{ start: number; end: number }> = [];
    let currentCursor = windowStartMin;

    for (const busy of busyIntervals) {
      // If busy is before our window, clamp
      if (busy.end <= currentCursor) continue;
      // If busy starts after currentCursor, there is a gap
      if (busy.start > currentCursor) {
        const gapEnd = Math.min(busy.start, windowEndMin);
        if (gapEnd > currentCursor) {
          freeGaps.push({ start: currentCursor, end: gapEnd });
        }
      }
      currentCursor = Math.max(currentCursor, busy.end);
      if (currentCursor >= windowEndMin) break;
    }

    if (currentCursor < windowEndMin) {
      freeGaps.push({ start: currentCursor, end: windowEndMin });
    }

    // 4. Find gaps that satisfy durationMinutes
    const eligibleSlots: TimeSlot[] = [];
    for (const gap of freeGaps) {
      const gapDuration = gap.end - gap.start;
      if (gapDuration >= durationMinutes) {
        eligibleSlots.push({
          start: this.minutesToTime(gap.start),
          end: this.minutesToTime(gap.start + durationMinutes),
          duration_minutes: durationMinutes,
        });
      }
    }

    if (eligibleSlots.length > 0) {
      const chosen = eligibleSlots[0];
      return {
        hasSlot: true,
        selectedSlot: chosen,
        allFreeSlots: eligibleSlots,
        message: `Đã tìm thấy slot trống tối ưu: ${chosen.start} - ${chosen.end} (Ngày ${date}).`,
      };
    }

    return {
      hasSlot: false,
      conflictingTasks: busyIntervals.map((b) => ({
        title: b.title,
        start: this.minutesToTime(b.start),
        end: this.minutesToTime(b.end),
      })),
      allFreeSlots: [],
      message: `Khung giờ yêu cầu từ ${windowStart} đến ${windowEnd} ngày ${date} đã kín lịch.`,
    };
  }
}

export const timeResolver = new TimeResolverService();
