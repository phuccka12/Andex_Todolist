import mongoose from 'mongoose';
import { EdgeTTS } from '@andresaya/edge-tts';
import { VocabModel } from '../models/Vocab.model';

export interface ExtractedVocabItem {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  topic: string;
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

const SRS_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60];

const TOPIC_KEYWORD_RULES: Array<{ topic: string; keywords: string[] }> = [
  {
    topic: 'IT & Tech',
    keywords: [
      'code', 'coding', 'software', 'server', 'database', 'api', 'deploy', 'bug', 'algorithm',
      'framework', 'frontend', 'backend', 'cloud', 'network', 'cyber', 'security', 'encrypt',
      'debug', 'compile', 'latency', 'cache', 'query', 'interface', 'system', 'hardware',
      'lập trình', 'phần mềm', 'dữ liệu', 'máy chủ', 'thuật toán', 'bảo mật', 'hệ thống', 'mạng',
    ],
  },
  {
    topic: 'Kinh doanh',
    keywords: [
      'business', 'company', 'client', 'customer', 'deadline', 'meeting', 'strategy', 'startup',
      'negotiate', 'negotiation', 'contract', 'marketing', 'brand', 'sales', 'product', 'launch',
      'workflow', 'streamline', 'manage', 'leadership', 'stakeholder', 'enterprise', 'pitch',
      'kinh doanh', 'khách hàng', 'chiến lược', 'hợp đồng', 'họp', 'thương lượng', 'lãnh đạo', 'dự án',
    ],
  },
  {
    topic: 'Tài chính',
    keywords: [
      'finance', 'financial', 'invest', 'investment', 'stock', 'market', 'budget', 'revenue',
      'profit', 'loss', 'inflation', 'debt', 'asset', 'equity', 'tax', 'bank', 'interest',
      'tài chính', 'đầu tư', 'ngân sách', 'doanh thu', 'lợi nhuận', 'lạm phát', 'cổ phiếu', 'thuế',
    ],
  },
  {
    topic: 'Cảm xúc & Tâm lý',
    keywords: [
      'resilient', 'resilience', 'empathy', 'anxious', 'anxiety', 'burnout', 'stress', 'calm',
      'grateful', 'gratitude', 'mindset', 'emotion', 'confidence', 'overwhelm', 'procrastinate',
      'motivation', 'inspire', 'frustrated', 'peaceful', 'nostalgic', 'optimistic',
      'kiên cường', 'đồng cảm', 'lo âu', 'căng thẳng', 'trì hoãn', 'biết ơn', 'tâm lý', 'cảm xúc', 'tự tin',
    ],
  },
  {
    topic: 'Sức khỏe',
    keywords: [
      'health', 'healthy', 'workout', 'exercise', 'nutrition', 'diet', 'sleep', 'fatigue',
      'therapy', 'medicine', 'doctor', 'hospital', 'immune', 'vitamin', 'fitness', 'yoga',
      'sức khỏe', 'dinh dưỡng', 'tập luyện', 'giấc ngủ', 'bệnh', 'bác sĩ', 'thể chất',
    ],
  },
  {
    topic: 'Du lịch',
    keywords: [
      'travel', 'trip', 'itinerary', 'flight', 'airport', 'hotel', 'luggage', 'passport',
      'visa', 'destination', 'tour', 'tourist', 'embark', 'journey', 'commute', 'cruise',
      'du lịch', 'chuyến bay', 'hành trình', 'khách sạn', 'hộ chiếu', 'hành lý', 'điểm đến',
    ],
  },
  {
    topic: 'IELTS & Học thuật',
    keywords: [
      'mitigate', 'exacerbate', 'ubiquitous', 'paradigm', 'empirical', 'sustainable', 'phenomenon',
      'hypothesis', 'methodology', 'significant', 'fluctuate', 'consequently', 'ambiguous',
      'eloquent', 'comprehensive', 'preliminary', 'curriculum', 'dissertation', 'research',
      'học thuật', 'nghiên cứu', 'giảm thiểu', 'trầm trọng', 'phổ biến', 'bền vững', 'giả thuyết', 'luận văn',
    ],
  },
  {
    topic: 'Giao tiếp',
    keywords: [
      'greet', 'apologize', 'compliment', 'persuade', 'fluent', 'conversation', 'discuss',
      'clarify', 'respond', 'feedback', 'polite', 'casual', 'colleague', 'acquaintance',
      'giao tiếp', 'xin lỗi', 'khen ngợi', 'thuyết phục', 'trò chuyện', 'phản hồi', 'lịch sự',
    ],
  },
];

export function classifyTopicByKeywords(
  word: string,
  meaning = '',
  example = '',
  requestedTopic?: string
): string {
  const cleanReq = (requestedTopic || '').trim();
  if (cleanReq && !['chung', 'tự động', 'auto'].includes(cleanReq.toLowerCase())) {
    return cleanReq;
  }

  const haystack = `${word} ${meaning} ${example}`.toLowerCase();
  let bestTopic = 'Đời sống';
  let bestScore = 0;

  for (const rule of TOPIC_KEYWORD_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (haystack.includes(kw)) {
        score += kw.includes(' ') ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = rule.topic;
    }
  }

  return bestTopic;
}

class VocabService {
  private defaultApiKey = process.env.GEMINI_API_KEY || '';
  private activeWorkingModel: string = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  private ttsCache = new Map<string, Buffer>();
  private dictionaryCache = new Map<string, any>();
  private extractCache = new Map<string, ExtractedVocabItem[]>();

  private async callGemini(
    payload: any,
    customApiKey?: string,
    timeoutMs: number = 14000
  ): Promise<any> {
    const apiKey = (customApiKey && customApiKey.trim()) || this.defaultApiKey;
    if (!apiKey) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trên máy chủ.');
    }

    const candidateModels = Array.from(
      new Set(
        [
          this.activeWorkingModel,
          process.env.GEMINI_MODEL,
          'gemini-2.5-flash-lite',
          'gemini-flash-lite-latest',
          'gemini-2.0-flash',
          'gemini-flash-latest',
        ].filter(Boolean)
      )
    ) as string[];

    let lastError: any = null;

    for (const model of candidateModels) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Disable hidden thinking tokens on Gemini 2.5 models for much faster JSON extraction
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
          (res.status === 400 && (errLower.includes('thinking') || errLower.includes('unsupported') || errLower.includes('not supported'))) ||
          errLower.includes('overloaded') ||
          errLower.includes('high demand') ||
          errLower.includes('resource_exhausted') ||
          errLower.includes('not found');

        if (isRetryable) {
          lastError = new Error(errMsg);
          await new Promise((r) => setTimeout(r, 30));
          continue;
        }

        throw new Error(errMsg || `HTTP ${res.status}`);
      } catch (err: any) {
        const isAbort = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('abort');
        lastError = isAbort
          ? new Error(`AI phản hồi quá lâu (hơn ${Math.round(timeoutMs / 1000)}s), thử model khác...`)
          : err;
        await new Promise((r) => setTimeout(r, 30));
      } finally {
        clearTimeout(timeoutHandle);
      }
    }

    throw lastError || new Error('Dịch vụ AI tạm thời quá tải, vui lòng thử lại sau giây lát.');
  }

  private extractTextFromGemini(data: any): string {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return '';
    return parts
      .filter((p: any) => !p?.thought && typeof p?.text === 'string')
      .map((p: any) => p.text)
      .join('')
      .trim();
  }

  private parseJsonObjectFromGemini(rawText: string, friendlyError: string): any {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      throw new Error(friendlyError);
    }

    const slice = cleaned
      .slice(startIdx, endIdx + 1)
      .replace(/,\s*([}\]])/g, '$1');

    try {
      return JSON.parse(slice);
    } catch {
      throw new Error(friendlyError);
    }
  }

  private parseJsonArrayFromGemini(rawText: string, fallbackTopic: string): ExtractedVocabItem[] {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const startIdx = cleaned.indexOf('[');
    const endIdx = cleaned.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('AI không trả về đúng định dạng danh sách từ vựng.');
    }

    const parsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.word === 'string' && item.word.trim())
      .map((item) => {
        const word = String(item.word).trim();
        const meaning = String(item.meaning || '').trim() || 'Chưa có nghĩa';
        const example = String(item.example || '').trim();
        const aiTopic = String(item.topic || '').trim();
        const useAuto = !fallbackTopic || ['chung', 'tự động', 'auto'].includes(fallbackTopic.trim().toLowerCase());
        const resolvedTopic = useAuto
          ? classifyTopicByKeywords(word, meaning, example, aiTopic)
          : fallbackTopic.trim();

        return {
          word,
          phonetic: String(item.phonetic || '').trim(),
          partOfSpeech: String(item.partOfSpeech || '').trim(),
          meaning,
          example,
          exampleTranslation: String(item.exampleTranslation || '').trim(),
          topic: resolvedTopic,
        };
      });
  }

  /**
   * Auto-extract and enrich English vocabulary from raw word list, English paragraph, or topic prompt
   */
  public async extractFromText(options: {
    text: string;
    topic?: string;
    customApiKey?: string;
  }): Promise<ExtractedVocabItem[]> {
    const { text, topic = 'Tự động', customApiKey } = options;
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Vui lòng nhập danh sách từ, đoạn văn tiếng Anh hoặc chủ đề.');
    }

    const cacheKey = `${topic.trim().toLowerCase()}|${trimmed.toLowerCase()}`;
    const cached = this.extractCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const isAutoTopic = !topic || ['chung', 'tự động', 'auto'].includes(topic.trim().toLowerCase());
    const topicInstruction = isAutoTopic
      ? `Classify EACH word individually into the single best-fitting tag from: ["IT & Tech", "Kinh doanh", "Tài chính", "IELTS & Học thuật", "Cảm xúc & Tâm lý", "Sức khỏe", "Du lịch", "Giao tiếp", "Đời sống"].`
      : `Set "topic" to "${topic.trim()}".`;

    // Fast compact path when user asks AI to auto-fill a single word/short phrase
    const isSingleShortEntry = !trimmed.includes('\n') && trimmed.split(/\s+/).length <= 4 && trimmed.length <= 48;

    const prompt = isSingleShortEntry
      ? `
You are an English-Vietnamese dictionary assistant.
For the English word/phrase "${trimmed}", return a JSON array with 1 object having exact keys:
"word", "phonetic" (IPA), "partOfSpeech" (noun/verb/adj/adv/phrase), "meaning" (clear Vietnamese), "example" (1 short practical English sentence), "exampleTranslation" (Vietnamese), "topic" (${topicInstruction}).
Return ONLY raw JSON array.
`.trim()
      : `
You are an expert English-Vietnamese lexicographer for the Gencoore learning app.
Analyze the user's input below (word list, English paragraph, topic request like "10 từ vựng...", or word+meaning pairs).
Return ONLY a valid JSON array (no markdown commentary) of up to 20 objects, each with exact keys:
- "word": English word or short collocation (string)
- "phonetic": IPA pronunciation like "/rɪˈzɪl.jənt/" (string)
- "partOfSpeech": concise part of speech like "noun", "verb", "adj", "adv", "phrase" (string)
- "meaning": clear, natural Vietnamese meaning (string)
- "example": 1 short, practical English example sentence using the word (string)
- "exampleTranslation": concise Vietnamese translation of the example (string)
- "topic": ${topicInstruction}

USER INPUT:
"""
${trimmed.slice(0, 6000)}
"""
`.trim();

    const data = await this.callGemini(
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: isSingleShortEntry ? 512 : 3072,
          responseMimeType: 'application/json',
        },
      },
      customApiKey,
      isSingleShortEntry ? 10000 : 18000
    );

    const rawText =
      data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    const parsed = this.parseJsonArrayFromGemini(rawText, topic);

    if (parsed.length > 0) {
      if (this.extractCache.size >= 200) {
        const oldest = this.extractCache.keys().next().value;
        if (oldest) this.extractCache.delete(oldest);
      }
      this.extractCache.set(cacheKey, parsed);
    }

    return parsed;
  }

  /**
   * Auto-extract English vocabulary from an uploaded photo / screenshot via Gemini Vision
   */
  public async extractFromImage(options: {
    imageBase64: string;
    mimeType?: string;
    topic?: string;
    customApiKey?: string;
  }): Promise<ExtractedVocabItem[]> {
    const { imageBase64, mimeType = 'image/jpeg', topic = 'Tự động', customApiKey } = options;

    // Strip data URL prefix if present
    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    const resolvedMime = match ? match[1] : mimeType;
    const rawBase64 = match ? match[2] : imageBase64;

    if (!rawBase64) {
      throw new Error('Dữ liệu ảnh không hợp lệ.');
    }

    const isAutoTopic = !topic || ['chung', 'tự động', 'auto', 'từ ảnh'].includes(topic.trim().toLowerCase());
    const topicRule = isAutoTopic
      ? 'Classify EACH word individually into one of: ["IT & Tech", "Kinh doanh", "Tài chính", "IELTS & Học thuật", "Cảm xúc & Tâm lý", "Sức khỏe", "Du lịch", "Giao tiếp", "Đời sống"].'
      : `Set "topic" to "${topic.trim()}".`;

    const prompt = `
Read the English text or vocabulary list in this image carefully.
Extract up to 20 useful English words or short phrases to learn (skip trivial stop-words like "the, a, is, in").
If the image already shows Vietnamese meanings next to the words, preserve/refine them.
${topicRule}
Return ONLY a valid JSON array of objects with exact keys:
"word", "phonetic", "partOfSpeech", "meaning", "example", "exampleTranslation", "topic".
`.trim();

    const data = await this.callGemini(
      {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: resolvedMime,
                  data: rawBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      },
      customApiKey
    );

    const rawText =
      data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    return this.parseJsonArrayFromGemini(rawText, topic);
  }

  public async getAllVocab(userId?: string) {
    const query = userId
      ? { userId }
      : { $or: [{ userId: null }, { userId: { $exists: false } }] };

    const items = await VocabModel.find(query).sort({ nextReviewAt: 1, createdAt: -1 }).lean();
    return items.map((item: any) => ({
      ...item,
      id: item._id.toString(),
      userId: item.userId ? item.userId.toString() : undefined,
    }));
  }

  public async createSingleVocab(payload: Partial<ExtractedVocabItem> & { isSaved?: boolean }, userId?: string) {
    const cleanWord = payload.word?.trim() || '';
    const scopeQuery = userId
      ? { userId }
      : { $or: [{ userId: null }, { userId: { $exists: false } }] };

    const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await VocabModel.findOne({
      ...scopeQuery,
      word: { $regex: `^${escaped}$`, $options: 'i' },
    }).lean();

    if (existing) {
      throw new Error(`Từ "${cleanWord}" đã có trong kho từ vựng của bạn.`);
    }

    const created = await VocabModel.create({
      userId: userId || undefined,
      word: cleanWord,
      phonetic: payload.phonetic?.trim() || '',
      partOfSpeech: payload.partOfSpeech?.trim() || '',
      meaning: payload.meaning?.trim() || '',
      example: payload.example?.trim() || '',
      exampleTranslation: payload.exampleTranslation?.trim() || '',
      topic: classifyTopicByKeywords(
        cleanWord,
        payload.meaning || '',
        payload.example || '',
        payload.topic
      ),
      isSaved: Boolean(payload.isSaved),
      srsLevel: 0,
      nextReviewAt: new Date(),
    });

    const json = created.toJSON() as any;
    return {
      ...json,
      id: json.id || created._id.toString(),
    };
  }

  public async bulkInsertVocab(items: Partial<ExtractedVocabItem>[], userId?: string) {
    const scopeQuery = userId
      ? { userId }
      : { $or: [{ userId: null }, { userId: { $exists: false } }] };

    const existingDocs = await VocabModel.find(scopeQuery).select('word').lean();
    const existingSet = new Set(existingDocs.map((d: any) => String(d.word).trim().toLowerCase()));

    const toInsert: any[] = [];
    let skippedCount = 0;

    for (const item of items) {
      const cleanWord = item.word?.trim();
      const cleanMeaning = item.meaning?.trim();
      if (!cleanWord || !cleanMeaning) {
        skippedCount++;
        continue;
      }

      const key = cleanWord.toLowerCase();
      if (existingSet.has(key)) {
        skippedCount++;
        continue;
      }

      existingSet.add(key);
      toInsert.push({
        userId: userId || undefined,
        word: cleanWord,
        phonetic: item.phonetic?.trim() || '',
        partOfSpeech: item.partOfSpeech?.trim() || '',
        meaning: cleanMeaning,
        example: item.example?.trim() || '',
        exampleTranslation: item.exampleTranslation?.trim() || '',
        topic: classifyTopicByKeywords(
          cleanWord,
          cleanMeaning,
          item.example || '',
          item.topic
        ),
        srsLevel: 0,
        nextReviewAt: new Date(),
        reviewCount: 0,
        correctCount: 0,
      });
    }

    const insertedDocs = toInsert.length > 0 ? await VocabModel.insertMany(toInsert) : [];
    return {
      insertedCount: insertedDocs.length,
      skippedCount,
      words: insertedDocs.map((doc: any) => {
        const json = doc.toJSON();
        return { ...json, id: json.id || doc._id.toString() };
      }),
    };
  }

  public async reviewVocab(id: string, rating: ReviewRating, userId?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const query: any = { _id: id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }

    const vocab = await VocabModel.findOne(query);
    if (!vocab) return null;

    if (userId && !vocab.userId) {
      vocab.userId = userId as any;
    }

    const now = new Date();
    let nextLevel = vocab.srsLevel || 0;
    let nextReviewAt = new Date(now);

    if (rating === 'again') {
      nextLevel = 0;
      nextReviewAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes later
    } else if (rating === 'hard') {
      nextLevel = Math.max(1, nextLevel);
      nextReviewAt.setDate(nextReviewAt.getDate() + 1);
    } else if (rating === 'good') {
      nextLevel = Math.min(5, nextLevel + 1);
      const days = SRS_INTERVAL_DAYS[Math.max(0, nextLevel - 1)] || 1;
      nextReviewAt.setDate(nextReviewAt.getDate() + days);
      vocab.correctCount = (vocab.correctCount || 0) + 1;
    } else if (rating === 'easy') {
      nextLevel = Math.min(5, nextLevel + 2);
      const days = SRS_INTERVAL_DAYS[Math.max(0, nextLevel - 1)] || 3;
      nextReviewAt.setDate(nextReviewAt.getDate() + days);
      vocab.correctCount = (vocab.correctCount || 0) + 1;
    }

    vocab.srsLevel = nextLevel;
    vocab.nextReviewAt = nextReviewAt;
    vocab.lastReviewedAt = now;
    vocab.reviewCount = (vocab.reviewCount || 0) + 1;

    const saved = await vocab.save();
    const json = saved.toJSON() as any;
    return {
      ...json,
      id: json.id || saved._id.toString(),
    };
  }

  public async updateVocab(id: string, updates: Partial<ExtractedVocabItem>, userId?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const query: any = { _id: id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }

    const vocab = await VocabModel.findOne(query);
    if (!vocab) return null;

    if (userId && !vocab.userId) {
      vocab.userId = userId as any;
    }

    if (updates.word !== undefined) vocab.word = updates.word.trim();
    if (updates.phonetic !== undefined) vocab.phonetic = updates.phonetic.trim();
    if (updates.partOfSpeech !== undefined) vocab.partOfSpeech = updates.partOfSpeech.trim();
    if (updates.meaning !== undefined) vocab.meaning = updates.meaning.trim();
    if (updates.example !== undefined) vocab.example = updates.example.trim();
    if (updates.exampleTranslation !== undefined) vocab.exampleTranslation = updates.exampleTranslation.trim();
    if (updates.topic !== undefined) vocab.topic = updates.topic.trim() || 'Chung';
    if ((updates as any).isSaved !== undefined) vocab.isSaved = Boolean((updates as any).isSaved);

    const saved = await vocab.save();
    const json = saved.toJSON() as any;
    return {
      ...json,
      id: json.id || saved._id.toString(),
    };
  }

  public async deleteVocab(id: string, userId?: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const query: any = { _id: id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }
    const deleted = await VocabModel.findOneAndDelete(query);
    return !!deleted;
  }

  public async deleteAllVocab(userId?: string): Promise<number> {
    const scopeQuery = userId
      ? { userId }
      : { $or: [{ userId: null }, { userId: { $exists: false } }] };
    const res = await VocabModel.deleteMany(scopeQuery);
    return res.deletedCount || 0;
  }

  /**
   * Automatically re-tag existing uncategorized ("Chung" / "Đời sống" / empty) words into domain tags
   */
  public async autoTagExistingVocab(userId?: string) {
    const scopeQuery = userId
      ? { userId }
      : { $or: [{ userId: null }, { userId: { $exists: false } }] };

    const docs = await VocabModel.find(scopeQuery);
    let updatedCount = 0;

    for (const doc of docs) {
      const curr = (doc.topic || '').trim().toLowerCase();
      if (!curr || curr === 'chung' || curr === 'tự động' || curr === 'từ ảnh') {
        const nextTopic = classifyTopicByKeywords(doc.word, doc.meaning, doc.example || '');
        if (nextTopic !== doc.topic) {
          doc.topic = nextTopic;
          await doc.save();
          updatedCount++;
        }
      }
    }

    const words = await this.getAllVocab(userId);
    return { updatedCount, words };
  }

  /**
   * Evaluate a user's English sentence using a target vocabulary word via Genncore English Expert AI.
   */
  public async checkSentenceUsage(input: {
    word: string;
    meaning?: string;
    partOfSpeech?: string;
    userSentence: string;
    customApiKey?: string;
  }) {
    const word = input.word.trim();
    const userSentence = input.userSentence.trim();
    if (!word || !userSentence) {
      throw new Error('Vui lòng nhập từ vựng và câu tiếng Anh của bạn.');
    }

    const prompt = [
      `Bạn là Chuyên gia Ngôn ngữ Anh & Giám khảo IELTS/TESOL (8.5+) của hệ thống Genncore.`,
      `Nhiệm vụ: Chấm, sửa lỗi và nâng cấp câu tiếng Anh cho học viên Việt Nam đang luyện tập với từ mục tiêu:`,
      `- Từ mục tiêu: "${word}"${input.partOfSpeech ? ` (${input.partOfSpeech})` : ''}${input.meaning ? ` — nghĩa: "${input.meaning}"` : ''}.`,
      `- Câu học viên viết: "${userSentence}"`,
      ``,
      `Tiêu chí chấm chuyên sâu:`,
      `1. Ngữ pháp (thì động từ, hòa hợp chủ vị, mạo từ, giới từ, cấu trúc câu).`,
      `2. Collocation & Ngữ cảnh: từ "${word}" có được dùng đúng từ loại và tự nhiên như người bản ngữ không?`,
      `3. Gợi ý câu thay thế tự nhiên, giàu sắc thái hơn (nâng band/giao tiếp mượt mà) mà vẫn giữ nguyên ý học viên.`,
      ``,
      `Trả về DUY NHẤT JSON thuần túy (KHÔNG bọc markdown \`\`\`) đúng cấu trúc:`,
      `{`,
      `  "isCorrect": true/false,`,
      `  "score": số nguyên từ 1 đến 10,`,
      `  "feedbackVi": "Nhận xét súc tích, khích lệ bằng tiếng Việt: khen điểm đúng, chỉ rõ lỗi ngữ pháp/giới từ/collocation nếu có và giải thích ngắn vì sao",`,
      `  "correctedSentence": "Câu tiếng Anh đã sửa chuẩn xác & tự nhiên như người bản ngữ",`,
      `  "naturalTranslationVi": "Bản dịch tiếng Việt mượt mà của correctedSentence"`,
      `}`,
    ].join('\n');

    const data = await this.callGemini(
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 600,
          responseMimeType: 'application/json',
        },
      },
      input.customApiKey
    );

    const rawText = this.extractTextFromGemini(data);
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('AI chưa trả về kết quả chấm câu hợp lệ, bạn thử lại nhé.');
    }

    const parsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
    return {
      isCorrect: Boolean(parsed.isCorrect),
      score: Math.min(10, Math.max(1, Number(parsed.score) || 7)),
      feedbackVi: String(parsed.feedbackVi || '').trim() || 'Câu của bạn khá ổn!',
      correctedSentence: String(parsed.correctedSentence || userSentence).trim(),
      naturalTranslationVi: String(parsed.naturalTranslationVi || '').trim(),
    };
  }

  /**
   * Synthesize English speech MP3 using @andresaya/edge-tts neural voices with in-memory LRU cache.
   */
  public async synthesizeSpeech(input: {
    text: string;
    voice?: string;
    rate?: string;
  }): Promise<Buffer> {
    const cleanText = input.text.trim().slice(0, 400);
    if (!cleanText) {
      throw new Error('Nội dung cần đọc đang trống.');
    }

    const allowedVoices = new Set([
      'en-US-AriaNeural',
      'en-US-GuyNeural',
      'en-US-JennyNeural',
      'en-US-ChristopherNeural',
      'en-US-EmmaMultilingualNeural',
      'en-GB-SoniaNeural',
      'en-GB-RyanNeural',
      'en-AU-NatashaNeural',
      'en-AU-WilliamNeural',
      'en-CA-ClaraNeural',
    ]);

    const voice = input.voice && allowedVoices.has(input.voice) ? input.voice : 'en-US-AriaNeural';
    const rate = input.rate && /^[+-]?\d+%$/.test(input.rate) ? input.rate : '+0%';
    const cacheKey = `${voice}|${rate}|${cleanText.toLowerCase()}`;

    const cached = this.ttsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const tts = new EdgeTTS();
    const result = await tts.generate(cleanText, voice, { rate });
    const audioBuffer = result.audio;

    if (this.ttsCache.size >= 200) {
      const oldestKey = this.ttsCache.keys().next().value;
      if (oldestKey) this.ttsCache.delete(oldestKey);
    }
    this.ttsCache.set(cacheKey, audioBuffer);
    return audioBuffer;
  }

  /**
   * Smart Dictionary lookup supporting standard words, Modal Verbs, Idioms (IDM), and Phrasal Verbs.
   */
  public async lookupDictionary(input: {
    query: string;
    category?: 'auto' | 'word' | 'modal_verb' | 'idiom' | 'phrasal_verb';
    customApiKey?: string;
  }) {
    const query = input.query.trim();
    if (!query) {
      throw new Error('Vui lòng nhập từ, modal verb, idiom hoặc phrasal verb cần tra.');
    }

    const cat = input.category || 'auto';
    const cacheKey = `${cat}|${query.toLowerCase()}`;
    const cachedEntry = this.dictionaryCache.get(cacheKey);
    if (cachedEntry) {
      return cachedEntry;
    }

    const catHint =
      cat === 'modal_verb'
        ? 'CHẾ ĐỘ CHUYÊN GIA MODAL VERBS: Hãy phân tích đầy đủ công thức hiện tại/tương lai (S + modal + V0), dạng suy đoán quá khứ (S + modal + have + V3 nếu có), mức độ chắc chắn/bắt buộc/lịch sự, và phân biệt với các modal verb dễ nhầm lẫn (vd: must vs have to, may vs might).'
        : cat === 'idiom'
        ? 'CHẾ ĐỘ CHUYÊN GIA IDIOMS (THÀNH NGỮ): Hãy giải thích sắc nét nghĩa bóng thực tế, nghĩa đen/nguồn gốc ngắn giúp nhớ lâu, hoàn cảnh giao tiếp phù hợp (trang trọng hay đời thường), và cảnh báo nếu dễ dùng sai ngữ cảnh.'
        : cat === 'phrasal_verb'
        ? 'CHẾ ĐỘ CHUYÊN GIA PHRASAL VERBS: Hãy liệt kê các tầng nghĩa thông dụng nhất (nghĩa đen & nghĩa bóng), ghi rõ Separable (tách được: V + O + prep / V + prep + O) hay Inseparable (không tách được), kèm giới từ bắt buộc đi sau.'
        : cat === 'word'
        ? 'CHẾ ĐỘ TỪ ĐIỂN CHUẨN: Nêu chính xác IPA, từ loại, các nét nghĩa thông dụng nhất, collocations hay đi kèm và lỗi người Việt hay mắc phải.'
        : 'Hãy tự nhận diện chính xác xem đây là word, modal_verb, idiom hay phrasal_verb, rồi phân tích sâu đúng theo chuẩn chuyên gia TESOL.';

    const prompt = [
      `Bạn là Chuyên gia Ngôn ngữ học Song ngữ Anh-Việt & Giảng viên TESOL/IELTS 8.5+ của hệ thống Genncore.`,
      `Mục cần tra cứu (có thể là Tiếng Anh HOẶC Tiếng Việt): "${query}"`,
      catHint,
      `QUY TẮC TRA 2 CHIỀU:`,
      `- Nếu đầu vào là TIẾNG VIỆT (tra Việt → Anh): hãy chọn từ, Modal Verb, Idiom hoặc Phrasal Verb TIẾNG ANH chuẩn xác & tự nhiên nhất làm "term" (bằng tiếng Anh), điền IPA chuẩn của "term" tiếng Anh đó, giải thích thêm các cách diễn đạt tiếng Anh khác nhau trong "detailedExplanationVi", đưa các lựa chọn tiếng Anh khác vào "synonyms", và viết "examples" dùng "term" tiếng Anh đó.`,
      `- Nếu đầu vào là TIẾNG ANH (tra Anh → Việt): "term" là từ/cụm tiếng Anh chuẩn chính tả, giải thích chi tiết bằng tiếng Việt.`,
      ``,
      `Trả về DUY NHẤT một JSON object hợp lệ (KHÔNG bọc markdown \`\`\`) với cấu trúc:`,
      `{`,
      `  "term": "Từ hoặc cụm từ TIẾNG ANH chuẩn chính tả",`,
      `  "category": "word" | "modal_verb" | "idiom" | "phrasal_verb",`,
      `  "phonetic": "Phiên âm IPA chuẩn của term tiếng Anh (ví dụ /ˈɡɪv ʌp/)",`,
      `  "partOfSpeech": "Loại từ ngắn gọn (noun, verb, modal verb, idiom, phrasal verb...)",`,
      `  "shortMeaningVi": "Nghĩa tiếng Việt súc tích, chuẩn xác nhất (dùng lưu flashcard)",`,
      `  "detailedExplanationVi": "Giải thích chuyên sâu các tầng nghĩa (hoặc các từ tiếng Anh tương đương theo sắc thái nếu tra Việt → Anh) bằng tiếng Việt mạch lạc",`,
      `  "grammarFormula": "Công thức / cấu trúc sử dụng chi tiết (vd: S + must + V0 | S + must + have + V3 | Separable: give sth up)",`,
      `  "usageNotesVi": "Mẹo ghi nhớ, sắc thái trang trọng/thân mật, collocations hay dùng và lỗi người Việt hay sai",`,
      `  "synonyms": ["từ/cụm tiếng Anh đồng nghĩa tự nhiên 1", "2", "3"],`,
      `  "antonyms": ["từ/cụm tiếng Anh trái nghĩa 1", "2"],`,
      `  "examples": [`,
      `    { "en": "Câu ví dụ giao tiếp/công việc tự nhiên", "vi": "Dịch tiếng Việt tự nhiên" },`,
      `    { "en": "Câu ví dụ nâng cao / học thuật", "vi": "Dịch tiếng Việt tự nhiên" }`,
      `  ],`,
      `  "suggestedTopic": "Modal Verbs" | "Idioms" | "Phrasal Verbs" | "IT & Tech" | "Kinh doanh" | "IELTS & Học thuật" | "Giao tiếp" | "Đời sống"`,
      `}`,
    ].join('\n');

    const data = await this.callGemini(
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      },
      input.customApiKey,
      16000
    );

    const rawText = this.extractTextFromGemini(data);
    const parsed = this.parseJsonObjectFromGemini(
      rawText,
      'Không tra được định dạng từ điển hợp lệ, bạn bấm "Tra ngay" lại nhé.'
    );
    const resolvedCategory = ['word', 'modal_verb', 'idiom', 'phrasal_verb'].includes(parsed.category)
      ? parsed.category
      : cat === 'auto'
      ? 'word'
      : cat;

    const fallbackTopic =
      resolvedCategory === 'modal_verb'
        ? 'Modal Verbs'
        : resolvedCategory === 'idiom'
        ? 'Idioms'
        : resolvedCategory === 'phrasal_verb'
        ? 'Phrasal Verbs'
        : classifyTopicByKeywords(query, String(parsed.shortMeaningVi || ''), '');

    const finalEntry = {
      term: String(parsed.term || query).trim(),
      category: resolvedCategory,
      phonetic: String(parsed.phonetic || '').trim(),
      partOfSpeech: String(parsed.partOfSpeech || '').trim(),
      shortMeaningVi:
        String(parsed.shortMeaningVi || '').trim() ||
        String(parsed.detailedExplanationVi || '').trim() ||
        'Chưa có nghĩa ngắn gọn',
      detailedExplanationVi: String(parsed.detailedExplanationVi || '').trim(),
      grammarFormula: String(parsed.grammarFormula || '').trim(),
      usageNotesVi: String(parsed.usageNotesVi || '').trim(),
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.map(String).filter(Boolean).slice(0, 6) : [],
      antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms.map(String).filter(Boolean).slice(0, 6) : [],
      examples: Array.isArray(parsed.examples)
        ? parsed.examples
            .filter((ex: any) => ex && ex.en)
            .slice(0, 3)
            .map((ex: any) => ({ en: String(ex.en).trim(), vi: String(ex.vi || '').trim() }))
        : [],
      suggestedTopic: String(parsed.suggestedTopic || fallbackTopic).trim(),
    };

    if (finalEntry.term && finalEntry.shortMeaningVi) {
      if (this.dictionaryCache.size >= 300) {
        const oldest = this.dictionaryCache.keys().next().value;
        if (oldest) this.dictionaryCache.delete(oldest);
      }
      this.dictionaryCache.set(cacheKey, finalEntry);
    }
    return finalEntry;
  }

  /**
   * Friendly IELTS 8.0+ English Tutor Mini-Chatbot supporting Q&A, grammar, idioms, and roleplay.
   */
  public async englishTutorChat(input: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    activeWord?: { word: string; meaning?: string; partOfSpeech?: string } | null;
    customApiKey?: string;
  }) {
    const message = input.message.trim();
    if (!message) {
      throw new Error('Hãy nhập câu hỏi hoặc câu tiếng Anh bạn muốn luyện tập.');
    }

    const recentHistory = Array.isArray(input.history) ? input.history.slice(-6) : [];
    const historyBlock = recentHistory
      .map((m) => `${m.role === 'user' ? 'Học viên' : 'Gia sư'}: ${m.text}`)
      .join('\n');

    const activeContext = input.activeWord?.word
      ? `Từ học viên đang mở học trên thẻ: "${input.activeWord.word}"${
          input.activeWord.partOfSpeech ? ` (${input.activeWord.partOfSpeech})` : ''
        }${input.activeWord.meaning ? ` — nghĩa: "${input.activeWord.meaning}"` : ''}.`
      : '';

    const prompt = [
      `Bạn là **Genncore IELTS 8.0+ Tutor** — Gia sư tiếng Anh thông minh, tự nhiên, gần gũi (IELTS 8.0+ / TESOL).`,
      `NGUYÊN TẮC QUAN TRỌNG ĐỂ TRẢ LỜI TỰ NHIÊN (KHÔNG KHUÔN MẪU):`,
      `- KHÔNG lặp lại câu chào sáo rỗng ("Chào cậu nha!"...) ở mọi lượt. Hãy trả lời thẳng vào trọng tâm câu hỏi một cách tự nhiên, linh hoạt như người thật đang kèm 1-1.`,
      `- Nếu học viên hỏi bằng TIẾNG VIỆT (hỏi ngữ pháp, bí quyết học, phân biệt từ, Idioms, Phrasal Verbs): đặt "primaryMode": "vi_explain", giải thích mạch lạc bằng tiếng Việt trong "explanationVi", chỉ điền "replyEn" khi thực sự có 1 câu ví dụ tiếng Anh cụ thể cần luyện nghe (nếu không cần thì để "replyEn": "").`,
      `- Nếu học viên nhắn bằng TIẾNG ANH để luyện chat / roleplay: đặt "primaryMode": "en_chat", trả lời tự nhiên bằng tiếng Anh Band 8.0 ở "replyEn", và góp ý/nâng cấp câu ngắn gọn bằng tiếng Việt ở "explanationVi" (hoặc để ngắn gọn khích lệ).`,
      `- Dùng **...** để làm nổi bật các từ khóa/công thức quan trọng, và đánh số 1. 2. 3. gọn gàng khi liệt kê nhiều ý.`,
      activeContext,
      historyBlock ? `Lịch sử trò chuyện gần đây:\n${historyBlock}` : '',
      `Tin nhắn mới của học viên: "${message}"`,
      ``,
      `Trả về DUY NHẤT JSON thuần túy (KHÔNG bọc markdown \`\`\`) đúng cấu trúc:`,
      `{`,
      `  "primaryMode": "vi_explain" | "en_chat",`,
      `  "replyEn": "Câu trả lời hội thoại hoặc câu ví dụ tiếng Anh cụ thể (rỗng nếu chỉ giải thích tiếng Việt)",`,
      `  "explanationVi": "Nội dung giải thích / trả lời chính bằng tiếng Việt rõ ràng, nhấn mạnh từ khóa bằng **từ khóa**",`,
      `  "bonusVocab": { "word": "từ/cụm tiếng Anh hay", "phonetic": "/ipa/", "meaning": "nghĩa tiếng Việt ngắn", "topic": "IELTS & Học thuật" } | null`,
      `}`,
    ]
      .filter(Boolean)
      .join('\n');

    const data = await this.callGemini(
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 900,
          responseMimeType: 'application/json',
        },
      },
      input.customApiKey
    );

    const rawText = this.extractTextFromGemini(data);
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
      return {
        primaryMode: 'vi_explain' as const,
        replyEn: '',
        explanationVi: rawText.trim() || 'Mình đây! Bạn muốn hỏi ngữ pháp, từ vựng hay luyện nói tiếng Anh cùng mình nào?',
        bonusVocab: null,
      };
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
    } catch {
      return {
        primaryMode: 'vi_explain' as const,
        replyEn: '',
        explanationVi: cleaned.replace(/[{}"]/g, '').trim() || 'Mình đây! Bạn muốn hỏi gì về tiếng Anh nào?',
        bonusVocab: null,
      };
    }

    return {
      primaryMode: parsed.primaryMode === 'en_chat' ? ('en_chat' as const) : ('vi_explain' as const),
      replyEn: String(parsed.replyEn || '').trim(),
      explanationVi: String(parsed.explanationVi || '').trim(),
      bonusVocab:
        parsed.bonusVocab && parsed.bonusVocab.word && parsed.bonusVocab.meaning
          ? {
              word: String(parsed.bonusVocab.word).trim(),
              phonetic: String(parsed.bonusVocab.phonetic || '').trim(),
              meaning: String(parsed.bonusVocab.meaning).trim(),
              topic: String(parsed.bonusVocab.topic || 'IELTS & Học thuật').trim(),
            }
          : null,
    };
  }
}

export const vocabService = new VocabService();

