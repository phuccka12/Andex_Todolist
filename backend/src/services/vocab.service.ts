import mongoose from 'mongoose';
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
  private activeWorkingModel: string = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

  private async callGemini(payload: any, customApiKey?: string): Promise<any> {
    const apiKey = (customApiKey && customApiKey.trim()) || this.defaultApiKey;
    if (!apiKey) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trên máy chủ.');
    }

    const candidateModels = Array.from(
      new Set(
        [
          this.activeWorkingModel,
          process.env.GEMINI_MODEL,
          'gemini-flash-lite-latest',
          'gemini-3.5-flash-lite',
          'gemini-flash-latest',
        ].filter(Boolean)
      )
    ) as string[];

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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
        lastError = err;
        await new Promise((r) => setTimeout(r, 30));
      }
    }

    throw lastError || new Error('Dịch vụ AI tạm thời quá tải, vui lòng thử lại sau giây lát.');
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

    const isAutoTopic = !topic || ['chung', 'tự động', 'auto'].includes(topic.trim().toLowerCase());
    const topicInstruction = isAutoTopic
      ? `Classify EACH word individually into the single best-fitting tag from: ["IT & Tech", "Kinh doanh", "Tài chính", "IELTS & Học thuật", "Cảm xúc & Tâm lý", "Sức khỏe", "Du lịch", "Giao tiếp", "Đời sống"]. Different words in the list SHOULD get different tags if they belong to different domains!`
      : `Set "topic" to "${topic.trim()}".`;

    const prompt = `
You are an expert English-Vietnamese lexicographer for the Gencoore learning app.
Analyze the user's input below. It may be:
- A list of English words/phrases (comma, newline, or space separated)
- An English paragraph or article excerpt (extract the 6-20 most valuable, learnable English words/phrases from it; skip trivial words like "the, is, a, and, of")
- A topic request in Vietnamese or English (e.g., "10 từ vựng IELTS chủ đề môi trường" -> generate 10 useful words)
- Word + rough meaning pairs (keep/improve the Vietnamese meaning and fill missing phonetic, partOfSpeech, example)

Return ONLY a valid JSON array (no markdown commentary) of up to 25 objects, each with exact keys:
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

  public async createSingleVocab(payload: Partial<ExtractedVocabItem>, userId?: string) {
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
}

export const vocabService = new VocabService();

