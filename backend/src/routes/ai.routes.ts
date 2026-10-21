import { Router, Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

export const aiRouter = Router();

// In-memory Rate Limiter: 15 requests / minute per user or IP
const requestLog = new Map<string, { count: number; resetTime: number }>();

const rateLimitMiddleware = (req: Request, res: Response, next: () => void) => {
  const identifier = (req as any).user?.id || req.ip || 'anonymous';
  const now = Date.now();
  const windowMs = 60 * 1000;

  const current = requestLog.get(identifier);

  if (!current || now > current.resetTime) {
    requestLog.set(identifier, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= 15) {
    return res.status(429).json({
      success: false,
      error: 'Bạn đang thao tác quá nhanh. Atelier Concierge cần một nhịp thở trước khi tiếp tục.',
    });
  }

  current.count += 1;
  next();
};

/**
 * GET /api/ai/status
 */
aiRouter.get('/status', (req: Request, res: Response) => {
  const isReady = aiService.isReady();
  res.json({
    success: true,
    isReady,
    model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
  });
});

/**
 * POST /api/ai/chat (SSE Stream)
 */
aiRouter.post('/chat', optionalAuth, rateLimitMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { prompt, conversationHistory, customApiKey, userEmail } = req.body;
  const effectiveUserId = req.user?.id;
  const effectiveEmail = req.user?.email || userEmail;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng cung cấp nội dung câu hỏi.' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if deployed

  // Keep-alive heartbeat
  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });

  await aiService.streamChat({
    prompt: prompt.trim(),
    conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
    customApiKey,
    userId: effectiveUserId,
    userEmail: effectiveEmail,
    res,
  });

  clearInterval(heartbeat);
});
