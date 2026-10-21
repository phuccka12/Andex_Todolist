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
You are Atelier Concierge, the elite AI Executive Assistant embedded within the Chrono-Atelier Operating System.
Your core mission is to manage the user's focus, time-boxed schedule, and personal knowledge with deterministic precision, elegant clarity, and proactive agency.

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
2. VERIFY BEFORE WRITE: Before scheduling any new task, verify slot availability. If a conflict arises, notify the user or call reschedule_conflicted_tasks appropriately.
3. SILENT INTERMEDIATE REASONING: Call the required tools cleanly using native Function Calling without polluting the user chat with raw JSON or tool signatures.

---
### 4. TONE, VOICE & FORMATTING RULES (STRICT VISUAL AESTHETICS)
- Voice: Sophisticated, articulate, grounded, proactive, and concise (Atelier Executive standard). Lead directly with actionable conclusions. Avoid conversational filler ("Sure, I can help you with that").
- VISUAL STRUCTURE & SPACING (CRITICAL FOR UI RENDERING):
  1. ALWAYS insert a blank line (double newline) between paragraphs.
  2. ALWAYS put each task, bullet point, or time-slot on its OWN SEPARATE LINE starting with "- ". NEVER concatenate multiple tasks or list items into a single paragraph!
  3. Format each task item strictly as:
     - **[HH:mm - HH:mm]** | **Task Title** | [Priority]
  4. Separate any notes, caveats, or system remarks into a dedicated blockquote on its own line:
     > **Lưu ý:** [Nội dung ghi chú...]
  5. When suggesting a follow-up action, put it in its own closing paragraph after a blank line.
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
            description: 'Creates and commits a new task into the Chrono-Atelier workspace timetable and Kanban board',
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
                  description: 'Category: "deep_work" | "admin" | "meeting" | "personal"',
                },
                date: { type: 'STRING', description: 'Scheduled date YYYY-MM-DD' },
                start_time: { type: 'STRING', description: 'Start time HH:mm' },
                end_time: { type: 'STRING', description: 'End time HH:mm' },
                note: { type: 'STRING', description: 'Optional execution note or checklist details' },
              },
              required: ['title', 'start_time', 'end_time'],
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

  private async postToGemini(payload: any, apiKey: string): Promise<any> {
    const candidateModels = [
      this.activeWorkingModel,
      process.env.GEMINI_MODEL,
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
    ];

    let lastError: any = null;
    const modelsToTry = Array.from(new Set(candidateModels.filter(Boolean))) as string[];

    for (const model of modelsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && !data.error) {
          // Lock onto successful model so next requests execute instantly with 0ms delay!
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
        lastError = err;
        const msgLower = (err.message || '').toLowerCase();
        if (
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
      }
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
      res.write(`event: token\ndata: ${JSON.stringify({ text: 'Hệ thống trợ lý Atelier Concierge hiện đang trong quá trình đồng bộ máy chủ hoặc bảo trì ngắn hạn. Vui lòng quay lại sau giây lát.' })}\n\n`);
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
      sendSse('status', { message: 'Atelier Concierge đang phân tích...' });

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

      // Round 1: Call Gemini to check for Function Calls or direct response
      const round1Payload = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools,
        contents,
        generationConfig: {
          temperature: 0.2, // Low temperature for high precision
          maxOutputTokens: 1200,
        },
      };

      const geminiData = await this.postToGemini(round1Payload, apiKey);

      const candidate = geminiData.candidates?.[0];
      const modelParts = candidate?.content?.parts || [];

      // Check if Gemini invoked a tool (Function Call)
      const functionCalls = modelParts.filter((p: any) => Boolean(p.functionCall));

      if (functionCalls.length > 0) {
        // Handle each tool call
        const functionResponseParts: any[] = [];

        for (const fc of functionCalls) {
          const fnName = fc.functionCall.name;
          const args = fc.functionCall.args || {};

          if (fnName === 'scan_free_time_slots') {
            sendSse('status', { message: `Đang quét khoảng trống lịch trình ${args.anchor || ''}...` });
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
            sendSse('status', { message: `Đang khởi tạo ca làm việc: "${args.title}"...` });

            // Create task in MongoDB scoped to active user
            const durationMin = timeResolver.timeToMinutes(args.end_time) - timeResolver.timeToMinutes(args.start_time);
            const newTask = await TaskModel.create({
              userId: userId || undefined,
              title: args.title,
              priority: args.priority || '#1 Cốt Lõi',
              category: args.category || 'deep_work',
              color_theme: 'twilight',
              column: 'in_progress',
              day_index: 1,
              scheduled_date: args.date || new Date().toISOString().slice(0, 10),
              time_box: {
                start: args.start_time,
                end: args.end_time,
                duration_minutes: durationMin > 0 ? durationMin : 60,
              },
              note: args.note || 'Tạo tự động bởi Atelier Concierge',
              definition_of_done: [
                { id: 'dod1', text: 'Khởi động & chuẩn bị tài liệu liên quan', completed: false },
                { id: 'dod2', text: 'Thực thi nội dung trọng tâm', completed: false },
                { id: 'dod3', text: 'Đánh giá & nghiệm thu kết quả', completed: false },
              ],
            });

            // Dispatch instant action event to client!
            sendSse('action', {
              action: 'TASK_CREATED',
              task: newTask,
            });

            functionResponseParts.push({
              functionResponse: {
                name: fnName,
                response: {
                  success: true,
                  taskId: newTask._id,
                  title: newTask.title,
                  time: `${newTask.time_box.start} - ${newTask.time_box.end}`,
                  date: newTask.scheduled_date,
                },
              },
            });
          } else if (fnName === 'query_tasks_summary') {
            sendSse('status', { message: 'Đang tổng hợp dữ liệu ca việc từ cơ sở dữ liệu...' });
            
            // Scope query strictly to the current user (or guest)
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

            const activeTasks = await TaskModel.find(query).limit(15).select('title time_box priority column scheduled_date');

            functionResponseParts.push({
              functionResponse: {
                name: fnName,
                response: {
                  count: activeTasks.length,
                  tasks: activeTasks.map((t) => ({
                    title: t.title,
                    time: `${t.time_box.start} - ${t.time_box.end}`,
                    priority: t.priority,
                    date: t.scheduled_date,
                  })),
                },
              },
            });
          } else if (fnName === 'send_telegram_notification') {
            sendSse('status', { message: 'Đang gửi thông báo sang ứng dụng Telegram...' });
            const setting = await ReminderSettingModel.findOne().sort({ updatedAt: -1 });
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

        // Round 2: Feed tool results back to Gemini for concise synthesis
        contents.push({ role: 'model', parts: modelParts });
        contents.push({ role: 'user', parts: functionResponseParts });

        const round2Payload = {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 350 },
        };

        const round2Data = await this.postToGemini(round2Payload, apiKey);
        const finalCandidate = round2Data.candidates?.[0];
        const finalParts = finalCandidate?.content?.parts || [];
        const rawReplyText = finalParts.map((p: any) => p.text || '').join('');
        const finalReplyText = this.normalizeAtelierMarkdown(rawReplyText);

        // Stream final synthesis tokens
        const chunks = finalReplyText.match(/.{1,16}/g) || [finalReplyText];
        for (const chunk of chunks) {
          sendSse('token', { text: chunk });
          await new Promise((r) => setTimeout(r, 10)); // Snappy typing simulation
        }
      } else {
        // Direct answer without tools
        const rawReplyText = modelParts.map((p: any) => p.text || '').join('');
        const replyText = this.normalizeAtelierMarkdown(rawReplyText);
        const chunks = replyText.match(/.{1,16}/g) || [replyText];
        for (const chunk of chunks) {
          sendSse('token', { text: chunk });
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      sendSse('done', {});
      res.end();
    } catch (err: any) {
      console.error('AIService error:', err);
      sendSse('error', { error: err.message || 'Lỗi xử lý phản hồi từ Atelier AI' });
      sendSse('done', {});
      res.end();
    }
  }
}

export const aiService = new AIService();
