import mongoose from 'mongoose';
import {
  WritingAttemptModel,
  IWritingAnnotation,
  IWritingBandCeiling,
  IWritingWeakSentence,
  IWritingRecommendedVocab,
  IWritingUpgradeHighlight,
} from '../models/WritingAttempt.model';
import { VocabModel } from '../models/Vocab.model';

export type WritingTaskType = 'task1' | 'task2';
export type UpgradeMode = 'preserve_voice' | 'band_85';

export interface LocalWritingDiagnostics {
  wordCount: number;
  effectiveWordCount: number;
  paragraphCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  repeatedWords: Array<{ word: string; count: number }>;
  promptOverlapRatio: number;
  warnings: string[];
}

export interface PersonalVocabHint {
  id: string;
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning: string;
  topic: string;
  srsLevel: number;
}

export interface WeaknessRadarSummary {
  totalAttempts: number;
  avgOverall: number;
  latestOverall: number;
  weakestCriterion: { key: 'TR/TA' | 'CC' | 'LR' | 'GRA'; label: string; avgScore: number } | null;
  recurringPatterns: Array<{ label: string; count: number }>;
  recurringRepeatedWords: Array<{ word: string; count: number }>;
  preWriteChecklist: string[];
  recentTrend: Array<{ id: string; date: string; taskType: string; overall: number }>;
}

const ENGLISH_STOP_WORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'all', 'almost', 'alone', 'along', 'already', 'also',
  'although', 'always', 'among', 'another', 'any', 'are', 'around', 'because', 'been', 'before',
  'being', 'below', 'between', 'both', 'but', 'can', 'cannot', 'could', 'did', 'does', 'doing',
  'done', 'down', 'during', 'each', 'either', 'enough', 'even', 'ever', 'every', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'however', 'into', 'its', 'itself', 'just', 'less', 'like', 'likely', 'made',
  'make', 'many', 'may', 'might', 'more', 'most', 'much', 'must', 'myself', 'near', 'need',
  'neither', 'never', 'none', 'nor', 'not', 'now', 'often', 'once', 'only', 'other', 'others',
  'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'perhaps', 'quite', 'rather', 'really',
  'same', 'several', 'shall', 'she', 'should', 'since', 'some', 'someone', 'something', 'still',
  'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'though', 'through', 'thus', 'too', 'toward', 'towards', 'under',
  'unless', 'until', 'upon', 'very', 'was', 'way', 'well', 'were', 'what', 'whatever', 'when',
  'where', 'whereas', 'whether', 'which', 'while', 'who', 'whom', 'whose', 'why', 'will', 'with',
  'within', 'without', 'would', 'your', 'yours', 'yourself',
]);

/**
 * Official IELTS Band rounding:
 * Nearest 0.5 boundary where .25 rounds up to .5 and .75 rounds up to next whole band.
 */
export function roundIeltsBand(raw: number): number {
  const clamped = Math.max(0, Math.min(9, Number(raw) || 0));
  const halfFloor = Math.floor(clamped * 2) / 2;
  const remainder = clamped - halfFloor;
  // Use small epsilon for floating point safety on exact .25 / .75
  return remainder >= 0.249 ? Math.min(9, halfFloor + 0.5) : halfFloor;
}

export function roundIeltsInteger(raw: number): number {
  const num = Number(raw);
  if (!Number.isFinite(num)) return 5;
  return Math.max(1, Math.min(9, Math.round(num)));
}

function buildScopeFilter(userId?: string): Record<string, any> {
  if (!userId) {
    return { $or: [{ userId: null }, { userId: { $exists: false } }] };
  }
  if (mongoose.Types.ObjectId.isValid(userId)) {
    return { userId: new mongoose.Types.ObjectId(userId) };
  }
  return { userId };
}

class WritingService {
  private getApiKey(customApiKey?: string): string {
    return (
      (customApiKey && customApiKey.trim()) ||
      process.env.GEMINI_WRITING_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      ''
    );
  }

  private activeWorkingModel: string = process.env.GEMINI_WRITING_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  private async callGemini(
    payload: any,
    options: { customApiKey?: string; preferAccuracy?: boolean; timeoutMs?: number } = {}
  ): Promise<any> {
    const apiKey = this.getApiKey(options.customApiKey);
    if (!apiKey) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY hoặc GEMINI_WRITING_API_KEY trên máy chủ.');
    }

    const accuracyOrder = [
      this.activeWorkingModel,
      process.env.GEMINI_WRITING_MODEL,
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
    ];
    const speedOrder = [
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash-lite',
      this.activeWorkingModel,
      'gemini-2.5-flash',
      'gemini-flash-lite-latest',
    ];

    const candidateModels = Array.from(
      new Set((options.preferAccuracy ? accuracyOrder : speedOrder).filter(Boolean))
    ) as string[];

    const timeoutMs = options.timeoutMs ?? 24000;
    let lastError: any = null;

    for (const model of candidateModels) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const modelPayload =
          model.includes('2.5') && payload?.generationConfig
            ? {
                ...payload,
                generationConfig: {
                  ...payload.generationConfig,
                  thinkingConfig: { thinkingBudget: 0 },
                },
              }
            : payload;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modelPayload),
          signal: controller.signal,
        });

        const data = await res.json();
        if (res.ok && !data.error) {
          this.activeWorkingModel = model;
          return data;
        }

        const errMsg = (data?.error?.message || '').trim();
        const errLower = errMsg.toLowerCase();
        const isRetryable =
          res.status === 503 ||
          res.status === 429 ||
          res.status === 404 ||
          (res.status === 400 && (errLower.includes('thinking') || errLower.includes('unsupported'))) ||
          errLower.includes('overloaded') ||
          errLower.includes('high demand') ||
          errLower.includes('resource_exhausted') ||
          errLower.includes('not found');

        if (isRetryable) {
          lastError = new Error(errMsg);
          await new Promise((r) => setTimeout(r, 40));
          continue;
        }
        throw new Error(errMsg || `HTTP ${res.status}`);
      } catch (err: any) {
        const isAbort = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('abort');
        lastError = isAbort
          ? new Error(`AI phản hồi quá lâu (hơn ${Math.round(timeoutMs / 1000)}s), thử model khác...`)
          : err;
        await new Promise((r) => setTimeout(r, 40));
      } finally {
        clearTimeout(timer);
      }
    }

    const msgLower = String(lastError?.message || '').toLowerCase();
    if (
      msgLower.includes('high demand') ||
      msgLower.includes('overloaded') ||
      msgLower.includes('503') ||
      msgLower.includes('429') ||
      msgLower.includes('resource_exhausted')
    ) {
      throw new Error('Máy chủ AI đang quá tải tạm thời. Bạn bấm thử lại sau vài giây nhé!');
    }
    throw lastError || new Error('Không thể kết nối dịch vụ chấm Writing AI lúc này.');
  }

  private parseJsonObject(rawText: string): any {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('AI trả về định dạng chưa chuẩn JSON.');
    }
    return JSON.parse(cleaned.slice(startIdx, endIdx + 1));
  }

  /**
   * ZERO-TOKEN pre-analysis engine: counts words, detects verbatim prompt copying,
   * repeated content words, paragraph rhythm, and IELTS length checkpoints.
   */
  public runZeroTokenDiagnostics(
    prompt: string,
    essay: string,
    taskType: WritingTaskType
  ): LocalWritingDiagnostics {
    const cleanEssay = essay.trim();
    const rawWords = cleanEssay ? cleanEssay.split(/\s+/).filter(Boolean) : [];
    const wordCount = rawWords.length;

    const paragraphs = cleanEssay
      ? cleanEssay
          .split(/\r?\n\s*\r?\n|\r?\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
      : [];
    const paragraphCount = paragraphs.length;

    const sentences = cleanEssay
      ? cleanEssay
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2)
      : [];
    const sentenceCount = Math.max(sentences.length, cleanEssay ? 1 : 0);
    const avgSentenceLength = sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0;

    // Detect verbatim copied chunks (>= 5 consecutive words from prompt)
    const normalizeTokens = (str: string) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9'\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    const promptTokens = normalizeTokens(prompt);
    const essayTokens = normalizeTokens(cleanEssay);
    let copiedWordCount = 0;

    if (promptTokens.length >= 5 && essayTokens.length >= 5) {
      const promptNgrams = new Set<string>();
      for (let i = 0; i <= promptTokens.length - 5; i++) {
        promptNgrams.add(promptTokens.slice(i, i + 5).join(' '));
      }
      const copiedIndices = new Set<number>();
      for (let i = 0; i <= essayTokens.length - 5; i++) {
        const gram = essayTokens.slice(i, i + 5).join(' ');
        if (promptNgrams.has(gram)) {
          for (let k = i; k < i + 5; k++) copiedIndices.add(k);
        }
      }
      copiedWordCount = copiedIndices.size;
    }

    const effectiveWordCount = Math.max(0, wordCount - copiedWordCount);
    const promptOverlapRatio = wordCount > 0 ? Math.round((copiedWordCount / wordCount) * 100) : 0;

    // Repeated meaningful words (>= 4 letters, non-stopword, count >= 3)
    const freqMap = new Map<string, number>();
    for (const token of essayTokens) {
      if (token.length < 4 || ENGLISH_STOP_WORDS.has(token) || /^\d+$/.test(token)) continue;
      freqMap.set(token, (freqMap.get(token) || 0) + 1);
    }

    const repeatedWords = Array.from(freqMap.entries())
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word, count]) => ({ word, count }));

    const minWords = taskType === 'task1' ? 150 : 250;
    const warnings: string[] = [];

    if (effectiveWordCount < minWords) {
      warnings.push(
        `Bài còn thiếu từ (${effectiveWordCount}/${minWords} từ thực chất) — dễ bị chặn điểm phát triển ý (TA/TR).`
      );
    }
    if (promptOverlapRatio >= 12) {
      warnings.push(
        `Khoảng ${copiedWordCount} từ (~${promptOverlapRatio}%) trùng nguyên văn đề bài — giám khảo sẽ không tính vào số từ tự viết.`
      );
    }
    if (paragraphCount < 3) {
      warnings.push(
        `Bài mới có ${paragraphCount} đoạn — nên tách rõ Mở bài, Thân bài (2 đoạn) và Kết bài/Overview để tối ưu Coherence.`
      );
    }
    if (repeatedWords.length > 0 && repeatedWords[0].count >= 5) {
      warnings.push(
        `Từ "${repeatedWords[0].word}" lặp ${repeatedWords[0].count} lần — nên thay bằng từ đồng nghĩa hoặc quy chiếu.`
      );
    }

    return {
      wordCount,
      effectiveWordCount,
      paragraphCount,
      sentenceCount,
      avgSentenceLength,
      repeatedWords,
      promptOverlapRatio,
      warnings,
    };
  }

  /**
   * ZERO-TOKEN Personal Vocab Injector: finds up to 8 relevant words from user's own VocabModel
   * matching the Writing prompt/topic so user practices their own learned vocabulary.
   */
  public async getPersonalVocabSuggestions(
    prompt: string,
    userId?: string,
    limit = 8
  ): Promise<PersonalVocabHint[]> {
    const scopeFilter = buildScopeFilter(userId);
    const words = await VocabModel.find(scopeFilter, {
      word: 1,
      phonetic: 1,
      partOfSpeech: 1,
      meaning: 1,
      topic: 1,
      srsLevel: 1,
      isSaved: 1,
      nextReviewAt: 1,
    })
      .sort({ isSaved: -1, srsLevel: 1, updatedAt: -1 })
      .limit(350)
      .lean();

    if (!words || words.length === 0) return [];

    const promptKeywords = new Set(
      prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 4 && !ENGLISH_STOP_WORDS.has(t))
    );

    const nowMs = Date.now();
    const scored = words.map((w: any) => {
      let score = 0;
      const wordText = String(w.word || '').toLowerCase();
      const topicText = String(w.topic || '').toLowerCase();
      const meaningText = String(w.meaning || '').toLowerCase();

      promptKeywords.forEach((kw) => {
        if (topicText.includes(kw)) score += 6;
        if (wordText.includes(kw)) score += 4;
        if (meaningText.includes(kw)) score += 2;
      });

      if (topicText.includes('ielts') || topicText.includes('học thuật')) score += 3;
      if (w.isSaved) score += 2;
      if (w.nextReviewAt && new Date(w.nextReviewAt).getTime() <= nowMs) score += 2;
      if ((w.srsLevel || 0) >= 1 && (w.srsLevel || 0) <= 3) score += 1.5;
      if (wordText.length >= 6) score += 0.5;

      return { item: w, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item }) => ({
        id: item._id.toString(),
        word: item.word,
        phonetic: item.phonetic || '',
        partOfSpeech: item.partOfSpeech || '',
        meaning: item.meaning,
        topic: item.topic || 'Chung',
        srsLevel: item.srsLevel || 0,
      }));
  }

  /**
   * ZERO-TOKEN Weakness Radar across past graded attempts for this userId.
   */
  public async getWeaknessRadar(userId?: string): Promise<WeaknessRadarSummary> {
    const scopeFilter = buildScopeFilter(userId);
    const attempts = await WritingAttemptModel.find(scopeFilter, {
      taskType: 1,
      scores: 1,
      bandCeilings: 1,
      'localDiagnostics.repeatedWords': 1,
      createdAt: 1,
    })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    if (!attempts || attempts.length === 0) {
      return {
        totalAttempts: 0,
        avgOverall: 0,
        latestOverall: 0,
        weakestCriterion: null,
        recurringPatterns: [],
        recurringRepeatedWords: [],
        preWriteChecklist: [
          'Kiểm tra trả lời đủ mọi vế đề bài (hoặc có Overview rõ nếu là Task 1).',
          'Mỗi đoạn Thân bài giữ 1 luận điểm chính + 1 ví dụ cụ thể.',
          'Soát chia thì, mạo từ (a/an/the) và tránh lặp từ khóa hơn 3 lần.',
        ],
        recentTrend: [],
      };
    }

    const totalAttempts = attempts.length;
    const sum = { ta: 0, cc: 0, lr: 0, gra: 0, overall: 0 };
    const ceilingCounts = new Map<string, number>();
    const repeatedCounts = new Map<string, number>();

    attempts.forEach((a: any) => {
      sum.ta += Number(a.scores?.taskAchievement) || 0;
      sum.cc += Number(a.scores?.coherenceCohesion) || 0;
      sum.lr += Number(a.scores?.lexicalResource) || 0;
      sum.gra += Number(a.scores?.grammaticalRange) || 0;
      sum.overall += Number(a.scores?.overall) || 0;

      if (Array.isArray(a.bandCeilings)) {
        a.bandCeilings.forEach((c: any) => {
          const label = `${c.criterion}: ${String(c.reasonVi || '').split(/[.;]/)[0].trim()}`;
          if (label.length > 6) {
            ceilingCounts.set(label, (ceilingCounts.get(label) || 0) + 1);
          }
        });
      }

      const repList = a.localDiagnostics?.repeatedWords;
      if (Array.isArray(repList)) {
        repList.forEach((rw: any) => {
          if (rw?.word) {
            repeatedCounts.set(rw.word, (repeatedCounts.get(rw.word) || 0) + (Number(rw.count) || 1));
          }
        });
      }
    });

    const criteriaAvgs = [
      { key: 'TR/TA' as const, label: 'Đáp ứng đề bài (TA/TR)', avgScore: Math.round((sum.ta / totalAttempts) * 10) / 10 },
      { key: 'CC' as const, label: 'Mạch lạc & Liên kết (CC)', avgScore: Math.round((sum.cc / totalAttempts) * 10) / 10 },
      { key: 'LR' as const, label: 'Vốn từ vựng (LR)', avgScore: Math.round((sum.lr / totalAttempts) * 10) / 10 },
      { key: 'GRA' as const, label: 'Ngữ pháp & Cấu trúc (GRA)', avgScore: Math.round((sum.gra / totalAttempts) * 10) / 10 },
    ].sort((a, b) => a.avgScore - b.avgScore);

    const recurringPatterns = Array.from(ceilingCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label, count }));

    const recurringRepeatedWords = Array.from(repeatedCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    const preWriteChecklist: string[] = [];
    if (criteriaAvgs[0]) {
      preWriteChecklist.push(
        `Ưu tiên kéo tiêu chí yếu nhất: ${criteriaAvgs[0].label} (TB ${criteriaAvgs[0].avgScore}).`
      );
    }
    if (recurringPatterns[0]) {
      preWriteChecklist.push(`Cảnh giác lỗi hay lặp lại: ${recurringPatterns[0].label}`);
    }
    if (recurringRepeatedWords.length > 0) {
      preWriteChecklist.push(
        `Chuẩn bị sẵn từ thay thế cho: ${recurringRepeatedWords
          .slice(0, 3)
          .map((w) => `"${w.word}"`)
          .join(', ')}.`
      );
    }

    return {
      totalAttempts,
      avgOverall: roundIeltsBand(sum.overall / totalAttempts),
      latestOverall: Number(attempts[0]?.scores?.overall) || 0,
      weakestCriterion: criteriaAvgs[0] || null,
      recurringPatterns,
      recurringRepeatedWords,
      preWriteChecklist,
      recentTrend: attempts
        .slice(0, 8)
        .reverse()
        .map((a: any) => ({
          id: a._id.toString(),
          date: new Date(a.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
          taskType: a.taskType,
          overall: Number(a.scores?.overall) || 0,
        })),
    };
  }

  /**
   * SINGLE-PASS EXAMINER CALL: Grades 4 IELTS criteria with Examiner Ceiling Audit,
   * returns interactive X-Ray annotations, 3 weak sentences for Rewrite Lab, & topic vocab.
   */
  public async gradeWritingAttempt(
    input: {
      taskType: WritingTaskType;
      essayType?: string;
      prompt: string;
      promptImage?: string;
      essay: string;
      elapsedSeconds?: number;
      customApiKey?: string;
    },
    userId?: string
  ) {
    const taskType: WritingTaskType = input.taskType === 'task1' ? 'task1' : 'task2';
    const essayType = (input.essayType || (taskType === 'task1' ? 'chart_graph' : 'opinion')).trim();
    const promptText = (input.prompt || '').trim();
    const essay = (input.essay || '').trim();

    if (!essay || essay.split(/\s+/).filter(Boolean).length < 15) {
      throw new Error('Bài viết cần ít nhất 15 từ để Giám khảo AI có đủ dữ liệu chấm điểm.');
    }
    if (!promptText && !input.promptImage) {
      throw new Error('Vui lòng nhập đề bài (hoặc dán ảnh đề Task 1) trước khi chấm.');
    }

    const diagnostics = this.runZeroTokenDiagnostics(promptText, essay, taskType);
    const personalVocab = await this.getPersonalVocabSuggestions(promptText, userId, 10);

    let resolvedImagePart: { inlineData: { mimeType: string; data: string } } | null = null;
    if (input.promptImage && input.promptImage.trim()) {
      const trimmedImg = input.promptImage.trim();
      const match = trimmedImg.match(/^data:([^;]+);base64,([\s\S]+)$/);
      const mimeType = match ? match[1].trim() : 'image/jpeg';
      const rawBase64 = (match ? match[2] : trimmedImg).replace(/\s+/g, '');
      if (rawBase64.length > 20) {
        resolvedImagePart = { inlineData: { mimeType, data: rawBase64 } };
      }
    }

    const vocabListStr =
      personalVocab.length > 0
        ? personalVocab.map((v) => `${v.word} (${v.meaning})`).join(', ')
        : 'Chưa có danh sách từ vựng cá nhân';

    const examinerPrompt = `
Bạn là **Giám khảo IELTS Writing chính thức (IDP / British Council Examiner)** với tiêu chuẩn chấm **KHẮT KHE, CHÍNH XÁC, KHÔNG NỊNH ĐIỂM**.
Hãy chấm bài ${taskType === 'task1' ? 'IELTS Writing Task 1' : 'IELTS Writing Task 2'} (Dạng: ${essayType}).

=== ĐỀ BÀI ===
${promptText || '(Xem trực tiếp trong hình ảnh biểu đồ/đề đính kèm)'}

=== DỮ LIỆU ĐO LƯỜNG TỰ ĐỘNG (0-TOKEN ENGINE) ===
- Tổng số từ: ${diagnostics.wordCount} | Số từ thực chất (đã trừ đoạn chép đề): ${diagnostics.effectiveWordCount} (Mốc tối thiểu: ${taskType === 'task1' ? 150 : 250} từ)
- Số đoạn: ${diagnostics.paragraphCount} | Số câu: ${diagnostics.sentenceCount} | TB ${diagnostics.avgSentenceLength} từ/câu
- Từ lặp nhiều (>=3 lần): ${diagnostics.repeatedWords.map((r) => `${r.word}(${r.count}x)`).join(', ') || 'Không đáng kể'}
- Kho từ vựng người học đang ôn: ${vocabListStr}

=== BÀI VIẾT CỦA THÍ SINH ===
"""
${essay}
"""

=== LUẬT CHẤM & CHẶN TRẦN BAND (CHUẨN IDP / BC — BẮT BUỘC TUÂN THỦ) ===
1. BẮT BUỘC phân tích dẫn chứng ("reasoning") TRƯỚC khi chốt điểm ("band") cho từng tiêu chí. KHÔNG tự tính điểm Overall (hệ thống sẽ tự cộng chia 4 và làm tròn chuẩn 0.5).
2. Chấm khách quan theo chuẩn IDP/BC: không nịnh điểm bài yếu, nhưng PHẢI mạnh dạn cho Band 7.5 – 8.5 (hoặc Band 8 / 9 ở từng tiêu chí thành phần) với các bài đáp ứng đủ vế, diễn đạt tự nhiên, collocation chuẩn và tỷ lệ câu không lỗi ngữ pháp cao. Giám khảo thật chấm SỐ NGUYÊN (1–9, vd 5, 6, 7, 8) cho mỗi tiêu chí:
   - **taskAchievement** (${taskType === 'task1' ? 'Task Achievement' : 'Task Response'}):
     * Task 1 THIẾU Overview rõ ràng hoặc sai số liệu so với biểu đồ → chặn trần TA <= 5.
     * Task 2 thiếu 1 vế câu hỏi / lập trường mờ nhạt hoặc mâu thuẫn → chặn trần TR <= 5 hoặc 6.
     * Dưới mốc từ thực chất (${taskType === 'task1' ? 150 : 250} từ) → trừ nặng TA/TR vì ý phát triển chưa đủ sâu.
     * Lạc đề hoàn toàn hoặc chép lại đề quá nhiều (>=45% bài) → chặn trần TA/TR <= 4.
   - **coherenceCohesion**:
     * Nếu paragraphCount <= 1 (viết thành 1 khối chữ, không chia đoạn) → chặn trần CC <= 5.
     * Nếu lạm dụng máy móc "Moreover/Furthermore/Firstly/Secondly" đầu mọi câu → CC tối đa 6.
   - **lexicalResource**: Đánh giá collocation tự nhiên, chính xác ngữ cảnh, word form, chính tả, tránh lặp từ. PHẠT NẶNG lỗi nhồi từ khó C1/C2 nhưng sai sắc thái hoặc gượng gạo (unnatural/forced academic words) — luôn ưu tiên dùng đúng ngữ cảnh hơn là từ hiếm.
   - **grammaticalRange**: Đánh giá tỷ lệ câu không lỗi (error-free sentences) và độ đa dạng cấu trúc; nếu còn nhiều lỗi thì, hòa hợp S-V, mạo từ a/an/the, dấu phẩy nối 2 mệnh đề (comma splice) → GRA tối đa 6.
3. **annotations** (tối đa 12 mục, gọn nhưng sắc):
   - Gồm **2 nhóm**:
     a) **Điểm hay ăn điểm ("category": "strength") — 3 đến 4 mục**: Gạch chân những câu/cụm đắt giá nhất của thí sinh (paraphrase mượt, collocation tự nhiên, câu phức chuẩn xác, topic sentence hay). Trường "suggestion" để rỗng "" (hoặc ghi ngắn "Giữ vững cách viết này"), "explanationVi" giải thích rõ **vì sao cụm này ghi điểm Band 7.5–8.5+** (1–2 câu súc tích), "bandImpact" ghi tiêu chí được cộng (vd "LR Band 8" hoặc "GRA +1").
     b) **Lỗi / Điểm cần nâng cấp ("grammar" | "lexical" | "cohesion" | "logic") — tối đa 8 mục**: Chỉ ra chính xác chỗ sai hoặc chỗ kéo band kèm gợi ý sửa cụ thể.
   - BẮT BUỘC trong trường "quote", copy-paste **NGUYÊN VĂN 100% từng ký tự** từ bài viết gốc — GIỮ NGUYÊN cả lỗi chính tả, viết hoa, dấu câu sai (tuyệt đối không tự sửa) để frontend khớp chuỗi chính xác!
   - KHÔNG gợi ý thay thế các từ/cụm từ paraphrase tốt (Band 7.5+) quay ngược về từ vựng có sẵn trong đề bài gốc. Nếu bài viết ít lỗi, chấp nhận ít mục sửa lỗi và tập trung nêu rõ các "strength".
4. **criteriaDetails**: Trong strengthsVi và weaknessesVi, viết ngắn gọn nhưng **chi tiết có dẫn chứng** (trích dẫn cụm ngắn thực tế trong bài thay vì nhận xét chung chung).
5. **unlockNextBand** ('Cách phá trần +0.5 Band'): PHẢI chỉ rõ 1 điểm yếu cụ thể có thật trong bài viết (kèm trích dẫn ngắn nguyên văn), tuyệt đối không viết lời khuyên chung chung kiểu "dùng thêm câu phức" hay "học thêm từ vựng".
6. **weakSentences**: chọn đúng 3 câu yếu hoặc lủng củng nhất (nguyên văn 100%) kèm gợi ý ngắn cách tự viết lại để nâng band (KHÔNG viết sẵn câu trả lời hoàn chỉnh trong hintVi). Nếu bài xuất sắc gần như không có câu lỗi, chỉ chọn câu có thể nâng cấp sắc thái rõ rệt nhất (hoặc ít hơn 3 câu).
7. **injectedVocabUsed**: lọc các từ thuộc "Kho từ vựng người học đang ôn" nếu xuất hiện trong bài viết, đánh dấu chặt chẽ "isCorrectlyUsed": true/false dựa trên ngữ cảnh & collocation thật (chỉ true khi dùng đúng ngữ pháp và tự nhiên).
8. **recommendedVocab**: gợi ý 4 từ vựng / collocation Band 7.5–8.5 sát chủ đề bài viết để người học lưu vào kho SRS.

Trả về DUY NHẤT JSON thuần túy (KHÔNG bọc markdown \`\`\`), đặt "reasoning" TRƯỚC "band" đúng schema:
{
  "criteriaDetails": {
    "taskAchievement": { "reasoningVi": "Phân tích chi tiết dẫn chứng trong bài...", "strengthsVi": ["Điểm tốt kèm dẫn chứng ngắn..."], "weaknessesVi": ["Điểm yếu kèm dẫn chứng ngắn..."], "band": 6 },
    "coherenceCohesion": { "reasoningVi": "Phân tích bố cục, chia đoạn, mạch liên kết...", "strengthsVi": ["..."], "weaknessesVi": ["..."], "band": 6 },
    "lexicalResource": { "reasoningVi": "Phân tích collocation, sắc thái từ vựng...", "strengthsVi": ["..."], "weaknessesVi": ["..."], "band": 6 },
    "grammaticalRange": { "reasoningVi": "Phân tích tỷ lệ câu không lỗi và cấu trúc phức...", "strengthsVi": ["..."], "weaknessesVi": ["..."], "band": 6 }
  },
  "overallSummaryVi": "Nhận xét tổng quan ngắn gọn 2-3 câu bằng tiếng Việt về mức năng lực thật của bài.",
  "bandCeilings": [
    { "criterion": "TR/TA" | "CC" | "LR" | "GRA", "cappedAt": "Band 5", "reasonVi": "Lý do bị chặn trần cụ thể..." }
  ],
  "unlockNextBand": [
    { "actionVi": "Hành động sửa cụ thể gắn trích dẫn ngắn từ bài để phá trần (vd: sửa cụm '...' thành '...')", "estimatedGain": "+0.5 Overall" }
  ],
  "annotations": [
    {
      "category": "strength" | "grammar" | "lexical" | "cohesion" | "logic",
      "quote": "Copy nguyên văn y hệt ký tự trong bài (giữ cả lỗi sai)",
      "suggestion": "Cách viết sửa chuẩn hơn (để rỗng nếu category là strength)",
      "explanationVi": "Giải thích chi tiết nhưng gọn gàng 1-2 câu vì sao hay hoặc vì sao cần sửa",
      "bandImpact": "LR Band 8 hoặc GRA +1"
    }
  ],
  "injectedVocabUsed": [
    { "word": "từ từ kho", "meaning": "nghĩa ngắn", "isCorrectlyUsed": true, "noteVi": "Nhận xét ngắn về ngữ cảnh dùng từ này" }
  ],
  "recommendedVocab": [
    {
      "word": "collocation / từ hay",
      "phonetic": "/ipa/",
      "partOfSpeech": "verb / noun / phrase",
      "meaning": "nghĩa tiếng Việt",
      "example": "1 câu ví dụ chuẩn IELTS",
      "exampleTranslation": "Dịch nghĩa ví dụ",
      "topic": "IELTS & Học thuật"
    }
  ],
  "weakSentences": [
    { "original": "Câu yếu nguyên văn trong bài", "hintVi": "Gợi ý cấu trúc/từ nối để tự viết lại câu này hay hơn" }
  ]
}
`.trim();

    const parts: any[] = [{ text: examinerPrompt }];
    if (resolvedImagePart) {
      parts.push(resolvedImagePart);
    }

    const aiResponse = await this.callGemini(
      {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 3400,
          responseMimeType: 'application/json',
        },
      },
      {
        customApiKey: input.customApiKey,
        preferAccuracy: true,
        timeoutMs: resolvedImagePart ? 30000 : 25000,
      }
    );

    const rawText = aiResponse.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    const parsed = this.parseJsonObject(rawText);

    let ta = roundIeltsInteger(parsed?.criteriaDetails?.taskAchievement?.band ?? parsed?.scores?.taskAchievement ?? 5);
    let cc = roundIeltsInteger(parsed?.criteriaDetails?.coherenceCohesion?.band ?? parsed?.scores?.coherenceCohesion ?? 5);
    const lr = roundIeltsInteger(parsed?.criteriaDetails?.lexicalResource?.band ?? parsed?.scores?.lexicalResource ?? 5);
    const gra = roundIeltsInteger(parsed?.criteriaDetails?.grammaticalRange?.band ?? parsed?.scores?.grammaticalRange ?? 5);

    const bandCeilings: IWritingBandCeiling[] = Array.isArray(parsed?.bandCeilings)
      ? parsed.bandCeilings.slice(0, 4).map((c: any) => ({
          criterion: ['TR/TA', 'CC', 'LR', 'GRA'].includes(c.criterion) ? c.criterion : 'TR/TA',
          cappedAt: String(c.cappedAt || '').trim(),
          reasonVi: String(c.reasonVi || '').trim(),
        }))
      : [];

    // Deterministic Examiner Ceiling Enforcement (0-token programmatic safeguards)
    if (diagnostics.paragraphCount <= 1 && cc > 5) {
      cc = 5;
      if (!bandCeilings.some((b) => b.criterion === 'CC')) {
        bandCeilings.push({
          criterion: 'CC',
          cappedAt: 'Band 5',
          reasonVi: 'Bài viết mới chỉ có 1 khối văn bản (chưa chia đoạn Mở – Thân – Kết), chặn trần Coherence & Cohesion tối đa Band 5.',
        });
      }
    }
    if (diagnostics.promptOverlapRatio >= 45 && ta > 4) {
      ta = 4;
      if (!bandCeilings.some((b) => b.criterion === 'TR/TA')) {
        bandCeilings.push({
          criterion: 'TR/TA',
          cappedAt: 'Band 4',
          reasonVi: 'Tỷ lệ chép nguyên văn đề bài quá cao (>=45%), chặn trần Task Response/Achievement tối đa Band 4.',
        });
      }
    }

    const overall = roundIeltsBand((ta + cc + lr + gra) / 4);

    const normalizeCriterionDetail = (node: any) => ({
      summaryVi: String(node?.reasoningVi || node?.summaryVi || '').trim(),
      strengthsVi: Array.isArray(node?.strengthsVi) ? node.strengthsVi.map(String).slice(0, 4) : [],
      weaknessesVi: Array.isArray(node?.weaknessesVi) ? node.weaknessesVi.map(String).slice(0, 4) : [],
    });

    const normalizedInjected = Array.isArray(parsed?.injectedVocabUsed)
      ? parsed.injectedVocabUsed.slice(0, 8).map((v: any) => {
          const ok = Boolean(v.isCorrectlyUsed ?? v.usedCorrectly);
          return {
            word: String(v.word || '').trim(),
            meaning: String(v.meaning || '').trim(),
            usedCorrectly: ok,
            noteVi: String(v.noteVi || '').trim(),
          };
        })
      : [];

    // Only promote SRS level in VocabModel for personal words verified as isCorrectlyUsed === true
    const correctlyUsedWords = normalizedInjected
      .filter((v: any) => v.usedCorrectly && v.word)
      .map((v: any) => v.word.toLowerCase());

    if (correctlyUsedWords.length > 0 && userId) {
      try {
        const srsIntervals = [1, 3, 7, 14, 30, 60];
        const scopeFilter = buildScopeFilter(userId);
        const matchingDocs = await VocabModel.find({
          ...scopeFilter,
          word: { $in: correctlyUsedWords.map((w: string) => new RegExp(`^${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) },
        });
        for (const doc of matchingDocs) {
          const nextLevel = Math.min(5, (doc.srsLevel || 0) + 1);
          const days = srsIntervals[Math.max(0, nextLevel - 1)] || 1;
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + days);
          doc.srsLevel = nextLevel;
          doc.correctCount = (doc.correctCount || 0) + 1;
          doc.reviewCount = (doc.reviewCount || 0) + 1;
          doc.lastReviewedAt = new Date();
          doc.nextReviewAt = nextReview;
          await doc.save();
        }
      } catch (srsErr) {
        console.warn('Writing->SRS vocab promotion warning:', srsErr);
      }
    }

    const annotations: IWritingAnnotation[] = Array.isArray(parsed?.annotations)
      ? parsed.annotations
          .filter((a: any) => a?.quote && String(a.quote).trim().length >= 3)
          .slice(0, 12)
          .map((a: any, i: number) => ({
            id: `ann-${Date.now()}-${i}`,
            category: ['grammar', 'lexical', 'cohesion', 'logic', 'strength'].includes(a.category)
              ? a.category
              : 'grammar',
            quote: String(a.quote).trim(),
            suggestion: String(a.suggestion || '').trim(),
            explanationVi: String(a.explanationVi || '').trim(),
            bandImpact: String(a.bandImpact || '').trim(),
          }))
      : [];

    const weakSentences: IWritingWeakSentence[] = Array.isArray(parsed?.weakSentences)
      ? parsed.weakSentences
          .filter((w: any) => w?.original)
          .slice(0, 3)
          .map((w: any, i: number) => ({
            id: `weak-${Date.now()}-${i}`,
            original: String(w.original).trim(),
            hintVi: String(w.hintVi || '').trim(),
          }))
      : [];

    const recommendedVocab: IWritingRecommendedVocab[] = Array.isArray(parsed?.recommendedVocab)
      ? parsed.recommendedVocab
          .filter((v: any) => v?.word && v?.meaning)
          .slice(0, 5)
          .map((v: any) => ({
            word: String(v.word).trim(),
            phonetic: String(v.phonetic || '').trim(),
            partOfSpeech: String(v.partOfSpeech || '').trim(),
            meaning: String(v.meaning).trim(),
            example: String(v.example || '').trim(),
            exampleTranslation: String(v.exampleTranslation || '').trim(),
            topic: String(v.topic || 'IELTS & Học thuật').trim(),
          }))
      : [];

    const attempt = await WritingAttemptModel.create({
      userId: userId || undefined,
      taskType,
      essayType,
      prompt: promptText || 'Bài viết theo hình ảnh đính kèm',
      promptImage: input.promptImage || '',
      essay,
      elapsedSeconds: Number(input.elapsedSeconds) || 0,
      localDiagnostics: diagnostics,
      scores: {
        taskAchievement: ta,
        coherenceCohesion: cc,
        lexicalResource: lr,
        grammaticalRange: gra,
        overall,
      },
      overallSummaryVi: String(parsed?.overallSummaryVi || '').trim(),
      bandCeilings,
      unlockNextBand: Array.isArray(parsed?.unlockNextBand)
        ? parsed.unlockNextBand.slice(0, 4).map((u: any) => ({
            actionVi: String(u.actionVi || '').trim(),
            estimatedGain: String(u.estimatedGain || '+0.5').trim(),
          }))
        : [],
      criteriaDetails: {
        taskAchievement: normalizeCriterionDetail(parsed?.criteriaDetails?.taskAchievement),
        coherenceCohesion: normalizeCriterionDetail(parsed?.criteriaDetails?.coherenceCohesion),
        lexicalResource: normalizeCriterionDetail(parsed?.criteriaDetails?.lexicalResource),
        grammaticalRange: normalizeCriterionDetail(parsed?.criteriaDetails?.grammaticalRange),
      },
      annotations,
      injectedVocabUsed: normalizedInjected,
      recommendedVocab,
      weakSentences,
      upgradedVersions: {},
    });

    const json = attempt.toJSON() as any;
    return {
      ...json,
      id: json.id || attempt._id.toString(),
      userId: json.userId ? json.userId.toString() : undefined,
    };
  }

  /**
   * LAZY GENERATE UPGRADE: Only runs when user explicitly clicks "Sửa giữ giọng văn" or "Bài mẫu Band 8.5".
   * Results are persisted to MongoDB so re-viewing costs 0 tokens.
   */
  public async generateBandUpgrade(
    attemptId: string,
    mode: UpgradeMode,
    userId?: string,
    customApiKey?: string,
    force = false
  ) {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw new Error('ID bài viết không hợp lệ.');
    }

    const query: any = { _id: attemptId };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }
    const attempt = await WritingAttemptModel.findOne(query);
    if (!attempt) {
      throw new Error('Không tìm thấy bài viết.');
    }

    // Return cached version immediately ONLY when both essay and highlights exist (and not forced)
    if (
      !force &&
      mode === 'preserve_voice' &&
      attempt.upgradedVersions?.preserveVoiceEssay &&
      Array.isArray(attempt.upgradedVersions.preserveVoiceHighlights) &&
      attempt.upgradedVersions.preserveVoiceHighlights.length > 0
    ) {
      return {
        mode,
        essay: attempt.upgradedVersions.preserveVoiceEssay,
        notesVi: attempt.upgradedVersions.preserveVoiceNotesVi || '',
        highlights: attempt.upgradedVersions.preserveVoiceHighlights,
        cached: true,
      };
    }
    if (
      !force &&
      mode === 'band_85' &&
      attempt.upgradedVersions?.band85Essay &&
      Array.isArray(attempt.upgradedVersions.band85Highlights) &&
      attempt.upgradedVersions.band85Highlights.length > 0
    ) {
      return {
        mode,
        essay: attempt.upgradedVersions.band85Essay,
        notesVi: attempt.upgradedVersions.band85NotesVi || '',
        highlights: attempt.upgradedVersions.band85Highlights,
        cached: true,
      };
    }

    const personalVocab = await this.getPersonalVocabSuggestions(attempt.prompt, userId, 6);
    const personalWordsStr = personalVocab.map((v) => v.word).join(', ');

    const instruction =
      mode === 'preserve_voice'
        ? `Hãy sửa và nâng cấp bài viết dưới đây lên mức cao hơn (+1.0 band so với hiện tại, mục tiêu 7.0–7.5+) NHƯNG PHẢI GIỮ NGUYÊN Ý TƯỞNG VÀ MẠCH VĂN CỦA THÍ SINH (Surgical Rewrite — chỉ sửa câu lỗi/lủng củng, nâng collocation). ${
            personalWordsStr ? `Ưu tiên lồng ghép khéo léo 2-3 từ người học đang ôn: ${personalWordsStr}.` : ''
          }`
        : `Hãy viết lại một phiên bản **IELTS Band 8.5+ mẫu mực** cho đề bài này dựa trên ý chính của thí sinh, sử dụng từ vựng học thuật tinh tế, lập luận sắc bén và liên kết mượt mà. ${
            personalWordsStr ? `Có thể kết hợp tự nhiên các từ: ${personalWordsStr}.` : ''
          }`;

    const prompt = `
${instruction}

Đề bài (${attempt.taskType}): "${attempt.prompt}"
Bài gốc của thí sinh:
"""
${attempt.essay}
"""

QUAN TRỌNG:
- Trong trường "highlights", hãy chọn 5 đến 7 cụm từ / cấu trúc ĐẮT GIÁ NHẤT bạn vừa nâng cấp trong "essay" mới.
- Trường "upgradedPhrase" BẮT BUỘC copy **NGUYÊN VĂN 100% từng ký tự** từ bài "essay" bạn vừa viết ra để frontend highlight đúng chỗ trên văn bản.
- Trường "importanceVi" phải giải thích rõ: **Tại sao điểm sửa này lại quan trọng đối với giám khảo IELTS và giúp tăng band tiêu chí nào** (1-2 câu sắc bén).

Trả về DUY NHẤT JSON:
{
  "essay": "Bài viết tiếng Anh đã nâng cấp, chia đoạn chuẩn bằng \\n\\n",
  "notesVi": "Tóm tắt 2-3 câu tổng quan sự khác biệt giữa bản nâng cấp và bài gốc.",
  "highlights": [
    {
      "upgradedPhrase": "Copy nguyên văn cụm/câu đã nâng cấp trong bài mới",
      "originalPhrase": "Cụm cũ trong bài gốc (nếu thay thế trực tiếp, hoặc để rỗng nếu là ý bổ sung mới)",
      "category": "lexical" | "grammar" | "cohesion" | "logic",
      "importanceVi": "Giải thích rõ vì sao phần này quan trọng & giúp nâng điểm band (vd: tránh lặp từ, tạo collocation tự nhiên, hoặc bổ sung mệnh đề nhượng bộ tăng điểm GRA...)",
      "bandBoost": "LR +1 / GRA +0.5"
    }
  ]
}
`.trim();

    const data = await this.callGemini(
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 2400,
          responseMimeType: 'application/json',
        },
      },
      { customApiKey, preferAccuracy: true, timeoutMs: 28000 }
    );

    const rawText = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    const parsed = this.parseJsonObject(rawText);
    const upgradedEssay = String(parsed.essay || '').trim();
    const notesVi = String(parsed.notesVi || '').trim();
    const highlights: IWritingUpgradeHighlight[] = Array.isArray(parsed?.highlights)
      ? parsed.highlights
          .filter((h: any) => h?.upgradedPhrase && String(h.upgradedPhrase).trim().length >= 3)
          .slice(0, 8)
          .map((h: any, i: number) => ({
            id: `uh-${Date.now()}-${i}`,
            upgradedPhrase: String(h.upgradedPhrase).trim(),
            originalPhrase: String(h.originalPhrase || '').trim(),
            category: ['grammar', 'lexical', 'cohesion', 'logic'].includes(h.category) ? h.category : 'lexical',
            importanceVi: String(h.importanceVi || '').trim(),
            bandBoost: String(h.bandBoost || '').trim(),
          }))
      : [];

    if (!attempt.upgradedVersions) {
      attempt.upgradedVersions = {};
    }
    if (mode === 'preserve_voice') {
      attempt.upgradedVersions.preserveVoiceEssay = upgradedEssay;
      attempt.upgradedVersions.preserveVoiceNotesVi = notesVi;
      attempt.upgradedVersions.preserveVoiceHighlights = highlights;
    } else {
      attempt.upgradedVersions.band85Essay = upgradedEssay;
      attempt.upgradedVersions.band85NotesVi = notesVi;
      attempt.upgradedVersions.band85Highlights = highlights;
    }
    await attempt.save();

    return { mode, essay: upgradedEssay, notesVi, highlights, cached: false };
  }

  /**
   * REWRITE LAB: User actively rewrites the 1-3 weakest sentences from their essay and gets quick feedback.
   */
  public async evaluateRewriteLab(
    attemptId: string,
    rewrites: Array<{ id: string; userRewrite: string }>,
    userId?: string,
    customApiKey?: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw new Error('ID bài viết không hợp lệ.');
    }
    const query: any = { _id: attemptId };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }
    const attempt = await WritingAttemptModel.findOne(query);
    if (!attempt) {
      throw new Error('Không tìm thấy bài viết.');
    }

    const pairs = rewrites
      .map((r) => {
        const target = attempt.weakSentences.find((ws) => ws.id === r.id);
        return target && r.userRewrite?.trim()
          ? { id: r.id, original: target.original, userRewrite: r.userRewrite.trim() }
          : null;
      })
      .filter(Boolean) as Array<{ id: string; original: string; userRewrite: string }>;

    if (pairs.length === 0) {
      throw new Error('Hãy viết lại ít nhất 1 câu trước khi bấm chấm.');
    }

    const prompt = `
Bạn là Giám khảo IELTS Writing. Chấm nhanh các câu học viên vừa tự viết lại (từ câu gốc yếu):
${pairs.map((p, idx) => `${idx + 1}. [id=${p.id}]\n- Câu cũ: "${p.original}"\n- Học viên viết lại: "${p.userRewrite}"`).join('\n\n')}

Trả về DUY NHẤT JSON:
{
  "results": [
    {
      "id": "weak-...",
      "rewriteScore": "Ví dụ: Đạt Band 7.5 (+1.5)",
      "rewriteFeedbackVi": "Nhận xét ngắn gọn 1-2 câu bằng tiếng Việt về độ tự nhiên, ngữ pháp và cách cải thiện thêm nếu cần."
    }
  ]
}
`.trim();

    const data = await this.callGemini(
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 900,
          responseMimeType: 'application/json',
        },
      },
      { customApiKey, preferAccuracy: false, timeoutMs: 18000 }
    );

    const rawText = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    const parsed = this.parseJsonObject(rawText);
    const resultList: any[] = Array.isArray(parsed?.results) ? parsed.results : [];

    attempt.weakSentences = attempt.weakSentences.map((ws) => {
      const submitted = pairs.find((p) => p.id === ws.id);
      const graded = resultList.find((r) => r.id === ws.id);
      if (!submitted) return ws;
      return {
        ...ws,
        userRewrite: submitted.userRewrite,
        rewriteScore: graded ? String(graded.rewriteScore || 'Đã cải thiện tốt').trim() : 'Đã chấm',
        rewriteFeedbackVi: graded ? String(graded.rewriteFeedbackVi || '').trim() : '',
      };
    });

    await attempt.save();
    return attempt.weakSentences;
  }

  public async getHistory(userId?: string, limit = 20) {
    const scopeFilter = buildScopeFilter(userId);
    const items = await WritingAttemptModel.find(scopeFilter, {
      promptImage: 0, // Omit heavy chart images in history list for fast loading
    })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .lean();

    return items.map((item: any) => ({
      ...item,
      id: item._id.toString(),
      userId: item.userId ? item.userId.toString() : undefined,
    }));
  }

  public async getAttemptById(id: string, userId?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const query: any = { _id: id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }
    const item = await WritingAttemptModel.findOne(query).lean();
    if (!item) return null;
    return {
      ...item,
      id: (item as any)._id.toString(),
      userId: item.userId ? item.userId.toString() : undefined,
    };
  }

  public async deleteAttempt(id: string, userId?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const query: any = { _id: id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }
    const deleted = await WritingAttemptModel.findOneAndDelete(query);
    return Boolean(deleted);
  }
}

export const writingService = new WritingService();

