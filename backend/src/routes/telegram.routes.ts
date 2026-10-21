import { Router, Request, Response } from 'express';
import { telegramService } from '../services/telegram.service';
import { ReminderSettingModel } from '../models/ReminderSetting.model';
import { TaskModel } from '../models/Task.model';

export const telegramRouter = Router();

// Test Connection (Ping user's Telegram)
telegramRouter.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { chatId, botToken } = req.body;
    if (!chatId) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp Telegram Chat ID' });
    }

    const result = await telegramService.testConnection(chatId, botToken);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      message: 'Đã gửi tin nhắn kiểm tra thành công! Vui lòng kiểm tra điện thoại của bạn.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send Today's Schedule to Telegram on-demand
telegramRouter.post('/send-schedule', async (req: Request, res: Response) => {
  try {
    const { chatId, botToken, customNote, tasks } = req.body;
    if (!chatId) {
      return res.status(400).json({ success: false, error: 'Chưa có Telegram Chat ID' });
    }

    let targetTasks = tasks;
    if (!targetTasks || targetTasks.length === 0) {
      const dbTasks = await TaskModel.find({ column: { $ne: 'done' } }).limit(20);
      targetTasks = dbTasks.map((t) => ({
        title: t.title,
        time: `${t.time_box.start} - ${t.time_box.end}`,
        priority: t.priority,
        category: t.category,
        note: t.note,
        column: t.column,
      }));
    }

    const result = await telegramService.sendScheduleBriefing(chatId, targetTasks, undefined, customNote, botToken);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      message: 'Đã gửi toàn bộ lịch trình công việc sang Telegram thành công!',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Telegram Settings
telegramRouter.get('/settings', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    let query: any = {};
    if (email) query.targetEmail = String(email).trim().toLowerCase();

    const setting = await ReminderSettingModel.findOne(query).sort({ updatedAt: -1 });

    res.json({
      success: true,
      telegram: setting?.telegram || {
        enabled: false,
        botToken: '',
        chatId: '',
        autoMorningBriefing: true,
        autoUpcomingReminder: true,
        upcomingMinutesBefore: 30,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save Telegram Settings
telegramRouter.post('/settings', async (req: Request, res: Response) => {
  try {
    const {
      targetEmail,
      chatId,
      botToken,
      enabled,
      autoMorningBriefing,
      autoUpcomingReminder,
      upcomingMinutesBefore,
    } = req.body;

    const email = (targetEmail && String(targetEmail).trim().toLowerCase()) || 'default@cbp.ai';

    const updated = await ReminderSettingModel.findOneAndUpdate(
      { targetEmail: email },
      {
        targetEmail: email,
        telegram: {
          enabled: enabled ?? true,
          chatId: String(chatId || '').trim(),
          botToken: String(botToken || '').trim(),
          autoMorningBriefing: autoMorningBriefing ?? true,
          autoUpcomingReminder: autoUpcomingReminder ?? true,
          upcomingMinutesBefore: upcomingMinutesBefore || 30,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Đã lưu cấu hình thông báo Telegram thành công!',
      telegram: updated.telegram,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
