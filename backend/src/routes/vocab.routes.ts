import { Router, Response } from 'express';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { vocabService, ReviewRating } from '../services/vocab.service';

export const vocabRouter = Router();

// GET /api/vocab - Fetch all vocab words for user
vocabRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const words = await vocabService.getAllVocab(req.user?.id);
    res.json(words);
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể tải danh sách từ vựng', details: err.message });
  }
});

// POST /api/vocab - Create a single vocab card
vocabRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { word, meaning } = req.body;
    if (!word?.trim() || !meaning?.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập từ tiếng Anh và nghĩa tiếng Việt.' });
    }
    const created = await vocabService.createSingleVocab(req.body, req.user?.id);
    res.status(201).json(created);
  } catch (err: any) {
    const isDuplicate = err.message?.includes('đã có trong kho');
    res.status(isDuplicate ? 400 : 500).json({ error: err.message || 'Không thể lưu từ vựng' });
  }
});

// POST /api/vocab/bulk - Bulk insert imported vocab words
vocabRouter.post('/bulk', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { words } = req.body;
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'Danh sách từ vựng import đang trống.' });
    }
    const result = await vocabService.bulkInsertVocab(words, req.user?.id);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi khi lưu danh sách từ vựng', details: err.message });
  }
});

// POST /api/vocab/ai-extract - AI auto-extract from text/paragraph OR image
vocabRouter.post('/ai-extract', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, imageBase64, mimeType, topic, customApiKey } = req.body;

    if (imageBase64) {
      const words = await vocabService.extractFromImage({
        imageBase64,
        mimeType,
        topic: topic || 'Từ ảnh',
        customApiKey,
      });
      return res.json({ success: true, words });
    }

    if (text && typeof text === 'string' && text.trim()) {
      const words = await vocabService.extractFromText({
        text,
        topic: topic || 'Chung',
        customApiKey,
      });
      return res.json({ success: true, words });
    }

    return res.status(400).json({
      success: false,
      error: 'Vui lòng nhập văn bản, danh sách từ hoặc tải ảnh cần trích xuất từ vựng.',
    });
  } catch (err: any) {
    console.error('Vocab AI extract error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Không thể tự động trích xuất từ vựng lúc này.',
    });
  }
});

// POST /api/vocab/:id/review - Record SRS review rating
vocabRouter.post('/:id/review', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rating = req.body?.rating as ReviewRating;
    if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
      return res.status(400).json({ error: 'Đánh giá ôn tập không hợp lệ.' });
    }
    const updated = await vocabService.reviewVocab(req.params.id, rating, req.user?.id);
    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy từ vựng.' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi cập nhật tiến độ ôn tập', details: err.message });
  }
});

// PUT /api/vocab/:id - Update vocab card
vocabRouter.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await vocabService.updateVocab(req.params.id, req.body, req.user?.id);
    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy từ vựng.' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể cập nhật từ vựng', details: err.message });
  }
});

// POST /api/vocab/auto-tag - Auto-classify existing uncategorized words into domain tags
vocabRouter.post('/auto-tag', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await vocabService.autoTagExistingVocab(req.user?.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể tự động phân loại chủ đề', details: err.message });
  }
});

// DELETE /api/vocab/all - Clear all vocab words for current user
vocabRouter.delete('/all', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deletedCount = await vocabService.deleteAllVocab(req.user?.id);
    res.json({ success: true, deletedCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể xóa toàn bộ từ vựng', details: err.message });
  }
});

// DELETE /api/vocab/:id - Delete vocab card
vocabRouter.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await vocabService.deleteVocab(req.params.id, req.user?.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Không tìm thấy từ vựng.' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể xóa từ vựng', details: err.message });
  }
});

