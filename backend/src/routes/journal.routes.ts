import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { JournalModel } from '../models/Journal.model';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

export const journalRouter = Router();

const INLINE_BASE64_LIMIT = 120_000; // ~90KB binary; larger legacy base64 covers stream via /:id/cover

function optimizeCloudinaryThumb(url: string): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) {
    return url;
  }
  if (url.includes('/image/upload/w_') || url.includes('/image/upload/q_auto')) {
    return url;
  }
  return url.replace('/image/upload/', '/image/upload/w_640,c_limit,q_auto:good,f_auto/');
}

function buildOwnershipFilter(userId?: string): Record<string, any> {
  if (!userId) {
    return { $or: [{ userId: null }, { userId: { $exists: false } }] };
  }
  if (mongoose.Types.ObjectId.isValid(userId)) {
    return { userId: new mongoose.Types.ObjectId(userId) };
  }
  return { userId };
}

function buildSingleEntryQuery(id: string, userId?: string): Record<string, any> {
  const query: Record<string, any> = { _id: id };
  if (userId) {
    query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
  } else {
    query.$or = [{ userId: null }, { userId: { $exists: false } }];
  }
  return query;
}

// GET all journals for current user or sample guest journals
// Supports ?summary=1 (cover photo + photoCount only) & ?paginated=1&limit=18&skip=0
journalRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const isSummary = req.query.summary === '1' || req.query.summary === 'true';
    const isPaginated = req.query.paginated === '1' || req.query.paginated === 'true';
    const rawLimit = Number(req.query.limit);
    const rawSkip = Number(req.query.skip);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 0;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? rawSkip : 0;

    if (isSummary) {
      const matchQuery = buildOwnershipFilter(userId);
      const pipeline: any[] = [
        { $match: matchQuery },
        { $sort: { date: -1, createdAt: -1 } },
      ];
      if (skip > 0) pipeline.push({ $skip: skip });
      if (limit > 0) pipeline.push({ $limit: limit });
      pipeline.push({
        $project: {
          userId: 1,
          date: 1,
          title: 1,
          mood: 1,
          weather: 1,
          content: 1,
          isBurnedNegative: 1,
          createdAt: 1,
          updatedAt: 1,
          photoCount: { $size: { $ifNull: ['$photos', []] } },
          photos: { $slice: [{ $ifNull: ['$photos', []] }, 1] },
        },
      });

      const [rawItems, totalCount] = await Promise.all([
        JournalModel.aggregate(pipeline),
        isPaginated ? JournalModel.countDocuments(matchQuery) : Promise.resolve(0),
      ]);

      let journals = rawItems;

      // Seed starter entry if user has zero journals on initial page
      if (journals.length === 0 && skip === 0 && (!isPaginated || totalCount === 0)) {
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

        const obj = initialEntry.toObject() as any;
        journals = [{ ...obj, photoCount: 0, photos: [] }];
      }

      const items = journals.map((j: any) => {
        const firstPhoto: string | undefined = Array.isArray(j.photos) ? j.photos[0] : undefined;
        let outPhotos: string[] = [];
        let hasDeferredCover = false;

        if (firstPhoto) {
          if (firstPhoto.startsWith('http://') || firstPhoto.startsWith('https://')) {
            outPhotos = [optimizeCloudinaryThumb(firstPhoto)];
          } else if (firstPhoto.length <= INLINE_BASE64_LIMIT) {
            outPhotos = [firstPhoto];
          } else {
            hasDeferredCover = true;
          }
        }

        return {
          id: j._id.toString(),
          userId: j.userId ? j.userId.toString() : undefined,
          date: j.date,
          title: j.title,
          mood: j.mood,
          weather: j.weather,
          content: j.content,
          positives: [],
          negatives: [],
          photos: outPhotos,
          photoCount: typeof j.photoCount === 'number' ? j.photoCount : outPhotos.length,
          hasDeferredCover,
          isBurnedNegative: Boolean(j.isBurnedNegative),
          createdAt: j.createdAt,
          updatedAt: j.updatedAt,
        };
      });

      if (isPaginated) {
        const resolvedTotal = Math.max(totalCount, skip + items.length);
        return res.json({
          items,
          totalCount: resolvedTotal,
          hasMore: limit > 0 ? skip + items.length < resolvedTotal : false,
        });
      }

      return res.json(items);
    }

    const query: any = userId
      ? { userId }
      : { $or: [{ userId: null }, { userId: { $exists: false } }] };

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
        photoCount: Array.isArray(j.photos) ? j.photos.length : 0,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể lấy dữ liệu nhật ký', details: err.message });
  }
});

// GET binary cover photo for lazy card rendering (avoids massive base64 payloads in list JSON)
journalRouter.get('/:id/cover', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID nhật ký không hợp lệ' });
    }
    const query = buildSingleEntryQuery(req.params.id, req.user?.id);
    const journal = await JournalModel.findOne(query, { photos: { $slice: 1 } }).lean();
    if (!journal || !Array.isArray(journal.photos) || journal.photos.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy ảnh bìa nhật ký' });
    }

    const firstPhoto = journal.photos[0];
    if (firstPhoto.startsWith('http://') || firstPhoto.startsWith('https://')) {
      return res.redirect(optimizeCloudinaryThumb(firstPhoto));
    }

    const match = firstPhoto.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      return res.status(415).json({ error: 'Định dạng ảnh không hỗ trợ' });
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: 'Không thể tải ảnh bìa nhật ký', details: err.message });
  }
});

// GET single full journal entry (including all photos) on demand when opening editor
journalRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID nhật ký không hợp lệ' });
    }
    const query = buildSingleEntryQuery(req.params.id, req.user?.id);
    const journal = await JournalModel.findOne(query).lean();
    if (!journal) {
      return res.status(404).json({ error: 'Không tìm thấy trang nhật ký' });
    }

    return res.json({
      ...journal,
      id: (journal as any)._id.toString(),
      userId: journal.userId ? journal.userId.toString() : undefined,
      photoCount: Array.isArray(journal.photos) ? journal.photos.length : 0,
      hasDeferredCover: false,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Không thể tải chi tiết nhật ký', details: err.message });
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
