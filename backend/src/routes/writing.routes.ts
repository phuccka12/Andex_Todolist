import { Router, Response } from 'express';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { writingService, roundIeltsBand, UpgradeMode, WritingTaskType } from '../services/writing.service';

export const writingRouter = Router();

// GET /api/writing/prep?prompt=... - 0-Token Personal Vocab Injection + Weakness Radar
writingRouter.get('/prep', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prompt = String(req.query.prompt || '');
    const [personalVocab, radar] = await Promise.all([
      writingService.getPersonalVocabSuggestions(prompt, req.user?.id, 8),
      writingService.getWeaknessRadar(req.user?.id),
    ]);
    res.json({ success: true, personalVocab, radar });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Không thể tải dữ liệu chuẩn bị Writing.' });
  }
});

// GET /api/writing/history - Fetch saved graded attempts
writingRouter.get('/history', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const history = await writingService.getHistory(req.user?.id);
    res.json({ success: true, items: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Không thể tải lịch sử Writing.' });
  }
});

// POST /api/writing/grade - Single-pass IELTS Examiner grading (with 0-token pre-analysis)
writingRouter.post('/grade', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskType, essayType, prompt, promptImage, essay, elapsedSeconds, customApiKey } = req.body || {};
    const graded = await writingService.gradeWritingAttempt(
      {
        taskType: taskType as WritingTaskType,
        essayType,
        prompt,
        promptImage,
        essay,
        elapsedSeconds,
        customApiKey,
      },
      req.user?.id
    );
    res.status(201).json({ success: true, attempt: graded });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Chưa thể chấm bài Writing lúc này.',
    });
  }
});

// POST /api/writing/:id/upgrade - Lazy-generate Preserve-Voice or Band 8.5 essay upgrade
writingRouter.post('/:id/upgrade', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mode: UpgradeMode = req.body?.mode === 'band_85' ? 'band_85' : 'preserve_voice';
    const result = await writingService.generateBandUpgrade(
      req.params.id,
      mode,
      req.user?.id,
      req.body?.customApiKey
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Chưa thể tạo bản nâng cấp bài viết.',
    });
  }
});

// POST /api/writing/:id/rewrite-lab - Evaluate user's rewritten weak sentences
writingRouter.post('/:id/rewrite-lab', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rewrites = Array.isArray(req.body?.rewrites) ? req.body.rewrites : [];
    const weakSentences = await writingService.evaluateRewriteLab(
      req.params.id,
      rewrites,
      req.user?.id,
      req.body?.customApiKey
    );
    res.json({ success: true, weakSentences });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Chưa thể chấm câu sửa lúc này.',
    });
  }
});

// POST /api/writing/mock-overall - 0-token IELTS Task 1 + 2x Task 2 official rounding calculator
writingRouter.post('/mock-overall', async (req, res: Response) => {
  const t1 = Number(req.body?.task1);
  const t2 = Number(req.body?.task2);
  if (!Number.isFinite(t1) || !Number.isFinite(t2)) {
    return res.status(400).json({ success: false, error: 'Cần nhập điểm hợp lệ cho cả Task 1 và Task 2.' });
  }
  const overall = roundIeltsBand((t1 + 2 * t2) / 3);
  return res.json({ success: true, task1: t1, task2: t2, overall });
});

// GET /api/writing/:id - Fetch single attempt details
writingRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const attempt = await writingService.getAttemptById(req.params.id, req.user?.id);
    if (!attempt) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết.' });
    res.json({ success: true, attempt });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi tải chi tiết bài viết.' });
  }
});

// DELETE /api/writing/:id - Delete attempt
writingRouter.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ok = await writingService.deleteAttempt(req.params.id, req.user?.id);
    if (!ok) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Không thể xóa bài viết.' });
  }
});

