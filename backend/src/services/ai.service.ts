import mongoose from 'mongoose';
import { Response } from 'express';
import { TaskModel } from '../models/Task.model';
import { timeResolver } from './timeResolver.service';
import { telegramService } from './telegram.service';
import { ReminderSettingModel } from '../models/ReminderSetting.model';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>;
}

export interface StreamChatOptions {
  prompt: string;
  conversationHistory?: ChatMessage[];
  customApiKey?: string;
  userId?: string;
  userEmail?: string;
  res: Response;
}

class AIService {
  private defaultApiKey = process.env.GEMINI_API_KEY || '';
  private defaultModel = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  private activeWorkingModel: string = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

  /**
   * Check if Gemini API is ready
   */
  public isReady(customKey?: string): boolean {
    return Boolean((customKey && customKey.trim()) || this.defaultApiKey);
  }

  /**
   * Build System Instruction with dynamic temporal grounding
   */
  private buildSystemInstruction(userTimezone: string = 'Asia/Ho_Chi_Minh'): string {
    const now = new Date();
    // Offset for Vietnam / specified timezone
    const nowIso = now.toISOString();

    // Calculate Monday of current week
    const dayOfWeek = now.getUTCDay(); // 0 is Sun, 1 is Mon
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now);
    startOfWeek.setUTCDate(now.getUTCDate() + diffToMonday);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    return `
You are Gencoore AI, a warm, supportive, and intelligent personal time-management companion embedded within the Gencoore operating system.
Your core mission is to help the user organize their focus, time-boxed schedule, and daily tasks with calm clarity, accuracy, and friendly encouragement.

---
### 1. DYNAMIC SYSTEM TEMPORAL GROUNDING (STRICT GROUND TRUTH)
Current System Timestamp: ${nowIso}
User Timezone: ${userTimezone}
Start of Current Week (Monday): ${startOfWeek.toISOString()}
End of Current Week (Sunday): ${endOfWeek.toISOString()}

CRITICAL TIME RULES:
- You DO NOT possess internal time awareness. The dynamic values injected above are your ONLY source of truth for "now", "today", "tomorrow", "this week", or relative dates.
- All date-time arguments supplied to tools or reflected back to the user MUST strictly adhere to ISO 8601 format with the correct timezone offset (e.g., YYYY-MM-DDTHH:mm:ss+07:00).
- NEVER guess or assume an hour is free without querying tools.

---
### 2. THE THREE DATA DOMAINS (DECISION MATRIX)
You interact with three distinct data domains. Identify the user's intent and route accordingly:

1. STRUCTURED TEMPORAL DOMAIN (Tasks, Time-boxes, Kanban status, Priorities P1-P3):
   - Scope: Queries like "Am I free at 15:00?", "List my P1 tasks", "How many tasks are in progress?".
   - Protocol: NEVER hallucinate schedule data. You MUST call tools like query_tasks_summary or scan_free_time_slots before answering.

2. UNSTRUCTURED NARRATIVE DOMAIN (Journals, Reflections, Moods, Deep Thoughts):
   - Scope: Queries like "What did I write about focus last month?", "Find my notes on database optimization".
   - Protocol: Rely on semantic context provided or request knowledge search if available. Synthesize nuanced reflections without inventing facts.

3. AGENTIC ACTION DOMAIN (Mutations: Task creation, Rescheduling, Alerts):
   - Scope: "Schedule a 1-hour session tomorrow at 14:00", "Send this urgent note to my Telegram".
   - Protocol: Execute appropriate mutating tools. For destructive or conflict-resolving actions, propose a confirmation draft unless explicitly told to override.

---
### 3. DECOMPOSITION & TOOL EXECUTION WORKFLOW
When presented with complex, multi-intent prompts:
1. DECOMPOSE: Split the request into (a) Knowledge Retrieval, (b) Time Availability Check, (c) Action Execution.
2. VERIFY BEFORE WRITE: Before scheduling any new task, verify slot availability. If a conflict arises, notify the user kindly and suggest a free alternative slot.
3. SILENT INTERMEDIATE REASONING: Call the required tools cleanly using native Function Calling without polluting the user chat with raw JSON or tool signatures.

---
### 4. TONE, VOICE & FORMATTING RULES (WARM, FRIENDLY & HUMAN)
- Personality: Talk like a warm, cheerful, caring close friend & productivity buddy ("bạn đồng hành") in Vietnamese. ALWAYS call yourself "mình" and the user "bạn".
- Warm & Natural Speech:
  - NEVER sound stiff, robotic, bureaucratic, or like a database report (avoid dry words like "cơ sở dữ liệu", "khởi tạo ca làm việc", "truy vấn", "nghiệm thu").
  - Open naturally with a friendly reaction to what the user shared (e.g., "Chào bạn nha! Để mình ngó qua lịch giúp bạn ngay nhé ✨", "Xong xuôi rồi nè! Mình đã ghim việc này lên lịch cho bạn rồi 🎯", "Hôm nay lịch hơi dày chút, nhớ tranh thủ nghỉ tay uống ngụm nước nhé ☕").
  - Write conversationally with light warmth and 1-3 natural emojis per response when appropriate (never spam).
- VISUAL STRUCTURE & SPACING (CRITICAL FOR UI RENDERING):
  1. Insert a blank line (double newline) between paragraphs so answers read cleanly and warmly.
  2. When listing tasks or free time slots, put each item on its own line starting with "- ":
     - **[HH:mm - HH:mm]** | **Task Title** | [Priority]
     (Use clear friendly priority labels like "P1 Cốt lõi", "P2 Quan trọng", "P3 Nhẹ nhàng".)
  3. Put helpful tips, reminders, or gentle caveats in a dedicated blockquote on its own line:
     > **Mẹo nhỏ:** [Nội dung gợi ý nhẹ nhàng, gần gũi...]
  4. End with a short, encouraging closing question or friendly next step in its own paragraph.
`.trim();
  }

  /**
   * Tool Declarations for Gemini Function Calling
   */
  private getToolDeclarations() {
    return [
      {
        functionDeclarations: [
          {
            name: 'scan_free_time_slots',
            description: 'Scans for free non-conflicting time slots on a given date or anchor day (e.g. today, tomorrow, YYYY-MM-DD)',
            parameters: {
              type: 'OBJECT',
              properties: {
                anchor: {
                  type: 'STRING',
                  description: 'Relative day anchor, e.g. "today", "tomorrow", "day_after_tomorrow", or exact "YYYY-MM-DD"',
                },
                window_start: {
                  type: 'STRING',
                  description: 'Start of window in HH:mm (e.g. "13:00")',
                },
                window_end: {
                  type: 'STRING',
                  description: 'End of window in HH:mm (e.g. "18:00")',
                },
                duration_minutes: {
                  type: 'INTEGER',
                  description: 'Duration needed in minutes (e.g. 60, 90, 120)',
                },
              },
              required: ['duration_minutes'],
            },
          },
          {
            name: 'create_scheduled_task',
            description: 'Creates and commits a new task into the Gencoore workspace timetable and Kanban board. If start_time/end_time are omitted, it automatically picks the best free slot on that date.',
            parameters: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Task title' },
                priority: {
                  type: 'STRING',
                  description: 'Priority: "#1 Cốt Lõi" | "#2 Quan Trọng" | "#3 Bổ Trợ"',
                },
                category: {
                  type: 'STRING',
                  description: 'Category: "deep_work" | "optimization" | "research" | "meeting"',
                },
                date: { type: 'STRING', description: 'Scheduled date YYYY-MM-DD (or anchor like "today", "tomorrow")' },
                start_time: { type: 'STRING', description: 'Optional start time HH:mm (omit to auto-pick free slot)' },
                end_time: { type: 'STRING', description: 'Optional end time HH:mm' },
                duration_minutes: { type: 'INTEGER', description: 'Duration in minutes if auto-picking slot (default 60)' },
                note: { type: 'STRING', description: 'Optional execution note or checklist details' },
              },
              required: ['title'],
            },
          },
          {
            name: 'query_tasks_summary',
            description: 'Queries active tasks and timetable summary to answer questions about workload, P1 items, or schedule',
            parameters: {
              type: 'OBJECT',
              properties: {
                scope: {
                  type: 'STRING',
                  description: '"today" | "all" | "p1_only"',
                },
              },
            },
          },
          {
            name: 'send_telegram_notification',
            description: 'Sends an urgent reminder or brief schedule alert directly to user Telegram',
            parameters: {
              type: 'OBJECT',
              properties: {
                message: { type: 'STRING', description: 'Text message to send' },
              },
              required: ['message'],
            },
          },
        ],
      },
    ];
  }

  private async postToGemini(payload: any, apiKey: string, timeoutMs: number = 14000): Promise<any> {
    const candidateModels = [
      this.activeWorkingModel,
      process.env.GEMINI_MODEL,
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
    ];

    let lastError: any = null;
    const modelsToTry = Array.from(new Set(candidateModels.filter(Boolean))) as string[];

    for (const model of modelsToTry) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Disable hidden thinking tokens on Gemini 2.5 models for instant chat latency
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

        // Check if model should fallback to next candidate
        const isFallbackEligible =
          res.status === 503 ||
          res.status === 429 ||
          res.status === 404 ||
          (res.status === 400 && (errLower.includes('thinking') || errLower.includes('unsupported') || errLower.includes('not supported'))) ||
          errLower.includes('high demand') ||
          errLower.includes('overloaded') ||
          errLower.includes('spikes in demand') ||
          errLower.includes('resource_exhausted') ||
          errLower.includes('rate limit') ||
          errLower.includes('not found') ||
          errLower.includes('no longer available') ||
          errLower.includes('unsupported');

        if (isFallbackEligible) {
          console.warn(
            `[Gemini API] Model "${model}" returned [${res.status}]: "${errMsg}". Fast-falling back to next model...`
          );
          lastError = new Error(errMsg);
          await new Promise((r) => setTimeout(r, 20));
          continue;
        }

        throw new Error(errMsg || `HTTP ${res.status}`);
      } catch (err: any) {
        const isAbort = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('abort');
        lastError = isAbort
          ? new Error(`Model "${model}" phản hồi quá lâu (${Math.round(timeoutMs / 1000)}s).`)
          : err;
        const msgLower = (lastError.message || '').toLowerCase();
        if (
          isAbort ||
          msgLower.includes('not found') ||
          msgLower.includes('no longer available') ||
          msgLower.includes('high demand') ||
          msgLower.includes('overloaded') ||
          msgLower.includes('503') ||
          msgLower.includes('429')
        ) {
          await new Promise((r) => setTimeout(r, 20));
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timeoutHandle);
      }
    }

    const finalErrLower = String(lastError?.message || '').toLowerCase();
    if (
      finalErrLower.includes('high demand') ||
      finalErrLower.includes('overloaded') ||
      finalErrLower.includes('503') ||
      finalErrLower.includes('429') ||
      finalErrLower.includes('resource_exhausted')
    ) {
      throw new Error('Máy chủ AI đang có nhiều lượt truy cập cùng lúc nên hơi bận một chút. Bạn thử nhắn lại sau vài giây nhé!');
    }

    throw lastError || new Error('Tất cả mô hình Gemini khả dụng đều đang quá tải hoặc gặp lỗi. Vui lòng thử lại sau giây lát.');
  }

  /**
   * Pre-format and enforce structured paragraphs before SSE emission
   */
  public normalizeAtelierMarkdown(raw: string): string {
    if (!raw) return '';
    return raw
      .replace(/:\s*-\s*\[/g, ':\n\n- [')
      .replace(/:\s*-\s*\*\*/g, ':\n\n- **')
      .replace(/([^\n])\s*-\s*(\[\d{1,2}:\d{2}|\*\*)/g, (m, p1, p2) => p1 + '\n- ' + p2)
      .replace(/([^\n])\s*(>|\*+)?\s*(Lưu ý:|Note:|Chú ý:)/gi, (m, p1) => p1 + '\n\n> Lưu ý: ')
      .replace(/(\.)\s*(Bạn có muốn|Tôi có thể|Hãy cho tôi biết|Bạn có cần)/gi, (m, p1, p2) => p1 + '\n\n' + p2);
  }

  /**
   * Stream Chat with SSE 2-channel Protocol (status + action + token + done)
   */
  public async streamChat(options: StreamChatOptions): Promise<void> {
    const { prompt, conversationHistory = [], customApiKey, userId, userEmail, res } = options;

    const apiKey = (customApiKey && customApiKey.trim()) || this.defaultApiKey;
    if (!apiKey) {
      console.warn('[Gemini AI] System GEMINI_API_KEY is not configured in backend/.env.');
      res.write(`event: token\ndata: ${JSON.stringify({ text: 'Trợ lý Gencoore AI hiện đang trong quá trình đồng bộ máy chủ hoặc bảo trì ngắn hạn. Bạn vui lòng quay lại sau giây lát nhé!' })}\n\n`);
      res.write(`event: done\ndata: {}\n\n`);
      res.end();
      return;
    }

    // Helper: SSE write
    const sendSse = (event: 'status' | 'action' | 'token' | 'done' | 'error', data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Immediate heartbeat status to eliminate perceived latency
      sendSse('status', { message: 'Mình đang ngó qua lịch giúp bạn chút nha...' });

      const systemInstruction = this.buildSystemInstruction();
      const tools = this.getToolDeclarations();

      // Assemble contents
      const contents: any[] = [];
      for (const h of conversationHistory) {
        contents.push(h);
      }
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });

      // Multi-round bounded agentic loop (supports up to 2 tool rounds, e.g. scan -> create -> reply)
      let modelParts: any[] = [];
      for (let step = 0; step < 3; step++) {
        const allowTools = step < 2;
        const payload: any = {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: allowTools ? 0.55 : 0.72,
            maxOutputTokens: 1000,
          },
        };
        if (allowTools) {
          payload.tools = tools;
        }

        const geminiData = await this.postToGemini(payload, apiKey, 14000);
        const candidate = geminiData.candidates?.[0];
        modelParts = candidate?.content?.parts || [];

        const functionCalls = modelParts.filter((p: any) => Boolean(p.functionCall));
        if (functionCalls.length === 0 || !allowTools) {
          break;
        }

        const functionResponseParts: any[] = [];

        for (const fc of functionCalls) {
          const fnName = fc.functionCall.name;
          const args = fc.functionCall.args || {};

          if (fnName === 'scan_free_time_slots') {
            sendSse('status', { message: `Mình đang tìm giờ trống đẹp ${args.anchor || ''} giúp bạn nè...` });
            const resolvedDate = timeResolver.resolveAnchorDate(args.anchor || 'today');
            const scan = await timeResolver.scanFreeSlots({
              date: resolvedDate,
              windowStart: args.window_start || '08:00',
              windowEnd: args.window_end || '21:00',
              durationMinutes: args.duration_minutes || 60,
              userId,
            });

            functionResponseParts.push({
              functionResponse: {
                name: fnName,
                response: { date: resolvedDate, ...scan },
              },
            });
          } else if (fnName === 'create_scheduled_task') {
            const safeTitle = String(args.title || 'Công việc mới').trim();
            sendSse('status', { message: `Đang ghim "${safeTitle}" lên lịch giúp bạn đây!` });

            const resolvedDate = timeResolver.resolveAnchorDate(args.date || 'today');
            const requestedDuration = Number(args.duration_minutes) > 0 ? Number(args.duration_minutes) : 60;

            let startTime = typeof args.start_time === 'string' && /^\d{1,2}:\d{2}$/.test(args.start_time.trim())
              ? args.start_time.trim().padStart(5, '0')
              : '';
            let endTime = typeof args.end_time === 'string' && /^\d{1,2}:\d{2}$/.test(args.end_time.trim())
              ? args.end_time.trim().padStart(5, '0')
              : '';

            // Auto-find a free slot if AI didn't supply exact start/end times
            if (!startTime || !endTime) {
              const scan = await timeResolver.scanFreeSlots({
                date: resolvedDate,
                windowStart: '08:00',
                windowEnd: '21:30',
                durationMinutes: requestedDuration,
                userId,
              });
              if (scan.selectedSlot) {
                startTime = startTime || scan.selectedSlot.start;
                endTime = endTime || timeResolver.minutesToTime(timeResolver.timeToMinutes(startTime) + requestedDuration);
              } else {
                startTime = startTime || '14:00';
                endTime = endTime || timeResolver.minutesToTime(timeResolver.timeToMinutes(startTime) + requestedDuration);
              }
            }

            const durationMin = timeResolver.timeToMinutes(endTime) - timeResolver.timeToMinutes(startTime);
            const safeDuration = durationMin > 0 ? durationMin : requestedDuration;
            const parsedDateObj = new Date(`${resolvedDate}T00:00:00Z`);
            const computedDayIndex = isNaN(parsedDateObj.getTime()) ? 1 : (parsedDateObj.getUTCDay() + 6) % 7;

            const taskDocData = {
              userId: userId || undefined,
              title: safeTitle,
              priority: args.priority || '#1 Cốt Lõi',
              category: args.category || 'deep_work',
              color_theme: 'twilight',
              column: 'in_progress' as const,
              day_index: computedDayIndex,
              scheduled_date: resolvedDate,
              time_box: {
                start: startTime,
                end: endTime,
                duration_minutes: safeDuration,
              },
              note: args.note || 'Lên lịch cùng bạn đồng hành Gencoore AI ✨',
              definition_of_done: [
                { id: 'dod1', text: 'Chuẩn bị không gian & tài liệu cần thiết', completed: false },
                { id: 'dod2', text: 'Tập trung hoàn thành phần việc chính', completed: false },
                { id: 'dod3', text: 'Xem lại kết quả & nghỉ ngơi nhẹ nhàng', completed: false },
              ],
            };

            let emittedTask: any = {
              id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              ...taskDocData,
            };

            // Persist to MongoDB only when authenticated & DB connected (fast 4s guard so it never hangs)
            if (userId && mongoose.connection.readyState === 1) {
              try {
                const dbTask = await Promise.race([
                  TaskModel.create(taskDocData),
                  new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
                ]);
                if (dbTask) {
                  emittedTask = dbTask;
                }
              } catch (dbErr) {
                console.warn('AI create_scheduled_task DB fallback:', dbErr);
              }
            }

            sendSse('action', {
              action: 'TASK_CREATED',
              task: emittedTask,
            });

            functionResponseParts.push({
              functionResponse: {
                name: fnName,
                response: {
                  success: true,
                  taskId: emittedTask._id || emittedTask.id,
                  title: emittedTask.title,
                  time: `${startTime} - ${endTime}`,
                  date: resolvedDate,
                },
              },
            });
          } else if (fnName === 'query_tasks_summary') {
            sendSse('status', { message: 'Mình đang xem lại danh sách việc của bạn chút nha...' });

            const userScope = userId
              ? { userId }
              : { $or: [{ userId: null }, { userId: { $exists: false } }] };

            const query: any = {
              ...userScope,
              column: { $ne: 'done' },
            };

            if (args.scope === 'p1_only') {
              query.priority = { $regex: 'Cốt Lõi|P1', $options: 'i' };
            }

            let activeTasks: any[] = [];
            if (mongoose.connection.readyState === 1) {
              try {
                activeTasks = await Promise.race([
                  TaskModel.find(query)
                    .limit(15)
                    .select('title time_box priority column scheduled_date')
                    .maxTimeMS(3500)
                    .lean(),
                  new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 4000)),
                ]);
              } catch {
                activeTasks = [];
              }
            }

            functionResponseParts.push({
              functionResponse: {
                name: fnName,
                response: {
                  count: activeTasks.length,
                  tasks: activeTasks.map((t) => ({
                    title: t.title,
                    time: `${t.time_box?.start || '09:00'} - ${t.time_box?.end || '10:00'}`,
                    priority: t.priority,
                    date: t.scheduled_date,
                  })),
                },
              },
            });
          } else if (fnName === 'send_telegram_notification') {
            sendSse('status', { message: 'Đang nhắn sang Telegram giúp bạn nha...' });
            let setting: any = null;
            if (mongoose.connection.readyState === 1) {
              try {
                setting = await Promise.race([
                  ReminderSettingModel.findOne().sort({ updatedAt: -1 }).maxTimeMS(3000).lean(),
                  new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
                ]);
              } catch {
                setting = null;
              }
            }
            let tgResult: { success: boolean; error?: string; messageId?: number } = {
              success: false,
              error: 'Chưa cấu hình Telegram Chat ID',
            };
            if (setting?.telegram?.chatId) {
              tgResult = await telegramService.sendMessage(setting.telegram.chatId, args.message, {
                botToken: setting.telegram.botToken,
              });
            }
            functionResponseParts.push({
              functionResponse: {
                name: fnName,
                response: tgResult,
              },
            });
          }
        }

        contents.push({ role: 'model', parts: modelParts });
        contents.push({ role: 'user', parts: functionResponseParts });
      }

      const rawReplyText = modelParts.map((p: any) => p.text || '').join('');
      const finalReplyText = this.normalizeAtelierMarkdown(
        rawReplyText || 'Mình đã xử lý xong giúp bạn rồi nha! Bạn kiểm tra lại trên lịch nhé ✨'
      );

      const chunks = finalReplyText.match(/.{1,48}/g) || [finalReplyText];
      for (const chunk of chunks) {
        sendSse('token', { text: chunk });
        await new Promise((r) => setTimeout(r, 4));
      }

      sendSse('done', {});
      res.end();
    } catch (err: any) {
      console.error('AIService error:', err);
      sendSse('error', { error: err.message || 'Lỗi xử lý phản hồi từ Gencoore AI' });
      sendSse('done', {});
      res.end();
    }
  }
}

export const aiService = new AIService();
