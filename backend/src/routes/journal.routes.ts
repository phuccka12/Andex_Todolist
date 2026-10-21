import { Router, Response } from 'express';
import { JournalModel } from '../models/Journal.model';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import mongoose from 'express';

export const journalRouter = Router();

// GET all journals for current user or sample guest journals
journalRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    let query: any = {};
    if (userId) {
      query = { userId };
    } else {
      query = { $or: [{ userId: null }, { userId: { $exists: false } }] };
    }

    let journals = await JournalModel.find(query).sort({ date: -1, createdAt: -1 }).lean();

    // If empty for logged-in or guest, provide starter vintage entry
    if (journals.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const initialEntry = await JournalModel.create({
        userId: userId || undefined,
        date: today,
        title: 'Trang nhật ký đầu tiên: Khởi đầu một chặng đường',
        mood: 'peaceful',
        weather: 'night',
        content:
          'Hôm nay là một ngày đặc biệt. Tôi bắt đầu viết lại những suy nghĩ, những khoảng lặng sau giờ làm việc bận rộn. Có những điều vui, cũng có vài điều trăn trở, nhưng khi đặt bút viết xuống, lòng thấy nhẹ nhõm hơn nhiều.',
        positives: [
          'Uống một tách trà nóng buổi chiều',
          'Hoàn thành trọn vẹn mục tiêu công việc trong ngày',
          'Không gian làm việc gọn gàng, ấm cúng',
        ],
        negatives: [
          'Có chút áp lực vì deadline dồn dập',
          'Người khác vô tình nói lời làm mình chạnh lòng',
        ],
        photos: [],
        isBurnedNegative: false,
      });

      journals = [initialEntry.toObject() as any];
    }

    res.json(
      journals.map((j: any) => ({
        ...j,
        id: j._id.toString(),
        userId: j.userId ? j.userId.toString() : undefined,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể lấy dữ liệu nhật ký', details: err.message });
  }
});

// CREATE a new journal entry
journalRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { date, title, mood, weather, content, positives, negatives, photos } = req.body;

    const newJournal = new JournalModel({
      userId: userId || undefined,
      date: date || new Date().toISOString().split('T')[0],
      title: title?.trim() || 'Nhật ký hôm nay',
      mood: mood || 'peaceful',
      weather: weather || 'night',
      content: content || '',
      positives: Array.isArray(positives) ? positives : [],
      negatives: Array.isArray(negatives) ? negatives : [],
      photos: Array.isArray(photos) ? photos : [],
      isBurnedNegative: false,
    });

    const saved = await newJournal.save();
    const json = saved.toJSON() as any;

    res.status(201).json({
      ...json,
      id: json.id || saved._id.toString(),
      userId: json.userId ? json.userId.toString() : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể lưu trang nhật ký', details: err.message });
  }
});

// UPDATE a journal entry
journalRouter.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const query: any = { _id: req.params.id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }

    const journal = await JournalModel.findOne(query);
    if (!journal) {
      return res.status(404).json({ error: 'Không tìm thấy trang nhật ký' });
    }

    if (userId && !journal.userId) {
      journal.userId = userId as any;
    }

    const { date, title, mood, weather, content, positives, negatives, photos } = req.body;
    if (date !== undefined) journal.date = date;
    if (title !== undefined) journal.title = title;
    if (mood !== undefined) journal.mood = mood;
    if (weather !== undefined) journal.weather = weather;
    if (content !== undefined) journal.content = content;
    if (positives !== undefined) journal.positives = positives;
    if (negatives !== undefined) journal.negatives = negatives;
    if (photos !== undefined) journal.photos = photos;

    const saved = await journal.save();
    const json = saved.toJSON() as any;

    res.json({
      ...json,
      id: json.id || saved._id.toString(),
      userId: json.userId ? json.userId.toString() : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể cập nhật nhật ký', details: err.message });
  }
});

// BURN NEGATIVES: "Thắp nến hóa giải uất ức"
journalRouter.post('/:id/burn-negatives', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const query: any = { _id: req.params.id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }

    const journal = await JournalModel.findOne(query);
    if (!journal) {
      return res.status(404).json({ error: 'Không tìm thấy trang nhật ký' });
    }

    journal.negatives = [];
    journal.isBurnedNegative = true;
    const saved = await journal.save();
    const json = saved.toJSON() as any;

    res.json({
      message: 'Những điều uất ức đã được hóa giải thành tro bụi, tâm trí bạn giờ đây nhẹ nhõm hơn.',
      journal: {
        ...json,
        id: json.id || saved._id.toString(),
        userId: json.userId ? json.userId.toString() : undefined,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể hóa giải uất ức', details: err.message });
  }
});

// DELETE a journal entry
journalRouter.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const query: any = { _id: req.params.id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }

    const deleted = await JournalModel.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ error: 'Không tìm thấy trang nhật ký' });
    }

    res.json({ success: true, message: 'Đã xóa trang nhật ký' });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể xóa nhật ký', details: err.message });
  }
});
