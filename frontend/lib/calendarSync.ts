import { TaskItem } from './types';

/**
 * Generates direct Google Calendar single event URL
 * Clicking this URL opens Google Calendar web with pre-filled title, time, notes, and details.
 */
export function generateGoogleCalendarUrl(task: {
  title: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm or HH:mm - HH:mm
  notes?: string;
  priority?: string;
}): string {
  const title = encodeURIComponent(task.title || 'Nhiệm vụ CBP Atelier');
  
  let detailsText = '';
  if (task.priority) detailsText += `Mức độ ưu tiên: ${task.priority}\n`;
  if (task.notes) detailsText += `Ghi chú: ${task.notes}\n`;
  detailsText += '\n(Tạo từ hệ thống CBP Atelier OS)';
  const details = encodeURIComponent(detailsText);

  // Date parsing
  let baseDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  if (task.date && task.date.includes('-')) {
    baseDate = task.date.replace(/-/g, '');
  }

  // Time parsing
  let startH = '090000';
  let endH = '100000';

  if (task.time) {
    const parts = task.time.split('-').map((s) => s.trim());
    const m1 = parts[0]?.match(/(\d{1,2}):(\d{2})/);
    if (m1) {
      startH = `${m1[1].padStart(2, '0')}${m1[2]}00`;
    }
    if (parts[1]) {
      const m2 = parts[1].match(/(\d{1,2}):(\d{2})/);
      if (m2) {
        endH = `${m2[1].padStart(2, '0')}${m2[2]}00`;
      }
    } else if (m1) {
      const nextH = (parseInt(m1[1], 10) + 1).toString().padStart(2, '0');
      endH = `${nextH}${m1[2]}00`;
    }
  }

  const dates = `${baseDate}T${startH}/${baseDate}T${endH}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
}

/**
 * Builds standard RFC 5545 iCalendar (.ics) string for tasks
 */
export function generateIcsContent(tasks: TaskItem[], calendarTitle = 'CBP Atelier Schedule'): string {
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CBP Atelier OS//Timebox Task Suite//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarTitle}`,
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
  ];

  tasks.forEach((task) => {
    let dateStr = task.scheduled_date;
    if (!dateStr || !dateStr.includes('-')) {
      dateStr = new Date().toISOString().slice(0, 10);
    }
    const cleanDate = dateStr.replace(/-/g, '');

    let startH = '090000';
    let endH = '100000';

    if (task.time_box?.start) {
      const m = task.time_box.start.match(/(\d{1,2}):(\d{2})/);
      if (m) startH = `${m[1].padStart(2, '0')}${m[2]}00`;
    }
    if (task.time_box?.end) {
      const m = task.time_box.end.match(/(\d{1,2}):(\d{2})/);
      if (m) endH = `${m[1].padStart(2, '0')}${m[2]}00`;
    }

    const uid = `task-${task.id || Math.random().toString(36).slice(2)}@cbpatelier.internal`;
    const cleanTitle = (task.title || 'Nhiệm vụ CBP').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const desc = `${task.note || ''}\nƯu tiên: ${task.priority}\nTrạng thái: ${task.column}`
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${cleanDate}T${startH}`);
    lines.push(`DTEND:${cleanDate}T${endH}`);
    lines.push(`SUMMARY:${cleanTitle}`);
    lines.push(`DESCRIPTION:${desc}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Downloads .ics file to user's computer
 */
export function downloadIcsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens Google Calendar import page in a new browser tab
 */
export function openGoogleCalendarImportPage() {
  window.open('https://calendar.google.com/calendar/u/0/r/settings/export', '_blank');
}
