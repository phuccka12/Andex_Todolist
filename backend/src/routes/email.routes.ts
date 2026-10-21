import { Router, Request, Response } from 'express';
import { emailService } from '../services/email.service';
import { ReminderSettingModel } from '../models/ReminderSetting.model';
import { TaskModel } from '../models/Task.model';

export const emailRouter = Router();

// Dispatch Postcard
const handleDispatch = async (req: Request, res: Response) => {
  try {
    const success = await emailService.dispatchPostcard(req.body);
    res.json({
      success,
      message: 'Artisan Postcard Email saved & dispatched via MongoDB Atlas!',
      recipient: req.body.recipient,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to dispatch email postcard', details: err.message });
  }
};

emailRouter.post('/dispatch', handleDispatch);
emailRouter.post('/send-postcard', handleDispatch);

// Send Instant Schedule Reminder Email
emailRouter.post('/send-schedule-reminder', async (req: Request, res: Response) => {
  try {
    const { recipient, subject, dateStr, customMessage, tasks } = req.body;
    if (!recipient) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp địa chỉ email người nhận (recipient).' });
    }

    let finalTasks = tasks;
    if (!finalTasks || finalTasks.length === 0) {
      // If client didn't supply tasks, query from MongoDB
      const dbTasks = await TaskModel.find({ column: { $ne: 'done' } }).limit(20);
      finalTasks = dbTasks.map((t) => ({
        title: t.title,
        time: `${t.time_box.start} - ${t.time_box.end}`,
        priority: t.priority,
        category: t.category,
        note: t.note,
        column: t.column,
      }));
    }

    const result = await emailService.sendScheduleReminder({
      recipient,
      subject,
      dateStr,
      customMessage,
      tasks: finalTasks,
    });

    res.json(result);
  } catch (err: any) {
    console.error('send-schedule-reminder error:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi gửi email nhắc lịch' });
  }
});

// Get or Create Reminder Settings
emailRouter.get('/settings', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    let query: any = {};
    if (email) query.targetEmail = String(email).trim().toLowerCase();

    let setting = await ReminderSettingModel.findOne(query).sort({ updatedAt: -1 });
    if (!setting && email) {
      setting = await ReminderSettingModel.create({
        targetEmail: String(email).trim().toLowerCase(),
        autoMorningBriefing: true,
        morningBriefingTime: '07:00',
        autoUpcomingReminder: true,
        upcomingMinutesBefore: 30,
      });
    }

    res.json({
      success: true,
      setting: setting || {
        targetEmail: '',
        autoMorningBriefing: true,
        morningBriefingTime: '07:00',
        autoUpcomingReminder: true,
        upcomingMinutesBefore: 30,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save or Update Reminder Settings
emailRouter.post('/settings', async (req: Request, res: Response) => {
  try {
    const {
      targetEmail,
      autoMorningBriefing,
      morningBriefingTime,
      autoUpcomingReminder,
      upcomingMinutesBefore,
      customSmtp,
    } = req.body;

    if (!targetEmail) {
      return res.status(400).json({ success: false, error: 'Email không được để trống' });
    }

    const cleanEmail = String(targetEmail).trim().toLowerCase();

    const updated = await ReminderSettingModel.findOneAndUpdate(
      { targetEmail: cleanEmail },
      {
        targetEmail: cleanEmail,
        autoMorningBriefing: autoMorningBriefing ?? true,
        morningBriefingTime: morningBriefingTime || '07:00',
        autoUpcomingReminder: autoUpcomingReminder ?? true,
        upcomingMinutesBefore: upcomingMinutesBefore || 30,
        customSmtp,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Đã lưu cấu hình tự động nhắc lịch thành công',
      setting: updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export Standard RFC 5545 iCalendar (.ics) format for Google Calendar / Apple Calendar
emailRouter.get('/export-ics', async (req: Request, res: Response) => {
  try {
    const tasks = await TaskModel.find();
    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CBP Atelier OS//Timebox Task Suite//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:CBP Atelier Schedule',
      'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
    ];

    tasks.forEach((task) => {
      // Build start and end dates
      const baseDate = task.scheduled_date && task.scheduled_date.includes('-')
        ? task.scheduled_date.replace(/-/g, '')
        : new Date().toISOString().slice(0, 10).replace(/-/g, '');

      let startH = '090000';
      let endH = '100000';

      if (task.time_box?.start) {
        const m = task.time_box.start.match(/(\d{1,2}):(\d{2})/);
        if (m) {
          startH = `${m[1].padStart(2, '0')}${m[2]}00`;
        }
      }
      if (task.time_box?.end) {
        const m = task.time_box.end.match(/(\d{1,2}):(\d{2})/);
        if (m) {
          endH = `${m[1].padStart(2, '0')}${m[2]}00`;
        }
      }

      const uid = `task-${task.id || task._id}@cbpatelier.internal`;
      const cleanTitle = (task.title || 'Nhiệm vụ CBP').replace(/,/g, '\\,').replace(/;/g, '\\;');
      const cleanDesc = (task.note || `Mục tiêu ưu tiên: ${task.priority}`)
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,');

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${nowStamp}`);
      icsContent.push(`DTSTART:${baseDate}T${startH}`);
      icsContent.push(`DTEND:${baseDate}T${endH}`);
      icsContent.push(`SUMMARY:${cleanTitle}`);
      icsContent.push(`DESCRIPTION:${cleanDesc}`);
      icsContent.push('STATUS:CONFIRMED');
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const result = icsContent.join('\r\n');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cbp-atelier-schedule.ics"');
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
