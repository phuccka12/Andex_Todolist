import nodemailer, { Transporter } from 'nodemailer';
import { EmailLogModel } from '../models/EmailLog.model';
import { ReminderSettingModel } from '../models/ReminderSetting.model';
import { TaskModel } from '../models/Task.model';
import { PostcardEmailRequest } from '../types/index';
import { telegramService } from './telegram.service';


export interface ScheduleReminderRequest {
  recipient: string;
  subject?: string;
  dateStr?: string; // YYYY-MM-DD or display date
  customMessage?: string;
  tasks?: Array<{
    title: string;
    time?: string;
    priority?: string;
    category?: string;
    note?: string;
    column?: string;
    scheduled_date?: string;
  }>;
}

class EmailService {
  private defaultTransporter: Transporter | null = null;

  private isSchedulerRunning = false;

  constructor() {
    this.initDefaultTransporter();
  }

  private initDefaultTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      this.defaultTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      console.log(`[Email Service ✉️] Configured primary SMTP via ${host}:${port} for ${user}`);
    } else {
      console.log('[Email Service ✉️] SMTP credentials not set in .env. Will use dynamic test transporter or preview mode.');
    }
  }

  private async getTransporter(customSmtp?: {
    enabled: boolean;
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
  }): Promise<{ transporter: Transporter; sender: string; isPreview: boolean }> {
    if (customSmtp?.enabled && customSmtp.user && customSmtp.pass) {
      const transporter = nodemailer.createTransport({
        host: customSmtp.host || 'smtp.gmail.com',
        port: customSmtp.port || 465,
        secure: customSmtp.secure,
        auth: {
          user: customSmtp.user,
          pass: customSmtp.pass,
        },
      });
      return {
        transporter,
        sender: `CBP Atelier OS <${customSmtp.user}>`,
        isPreview: false,
      };
    }

    if (this.defaultTransporter && process.env.SMTP_USER) {
      return {
        transporter: this.defaultTransporter,
        sender: process.env.SMTP_FROM || `CBP Atelier OS <${process.env.SMTP_USER}>`,
        isPreview: false,
      };
    }

    // Fallback: Create ethereal test account for real delivery preview
    try {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      return {
        transporter: testTransporter,
        sender: `"CBP Atelier OS (Test)" <${testAccount.user}>`,
        isPreview: true,
      };
    } catch {
      // In-memory dummy transport fallback if network blocks Ethereal
      const dummyTransporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return {
        transporter: dummyTransporter,
        sender: '"CBP Atelier OS" <noreply@atelier.cbp.internal>',
        isPreview: true,
      };
    }
  }

  /**
   * Generates a Google Calendar single-event URL for task
   */
  public generateGoogleCalendarUrl(task: {
    title: string;
    date?: string;
    time?: string;
    note?: string;
  }): string {
    const title = encodeURIComponent(task.title || 'Nhiệm vụ CBP Atelier');
    const details = encodeURIComponent(task.note ? `${task.note}\n\n(Lên lịch từ CBP Atelier OS)` : 'Lên lịch từ CBP Atelier OS');
    
    // Attempt parse date and time
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let datePart = todayStr;
    if (task.date && task.date.includes('-')) {
      datePart = task.date.replace(/-/g, '');
    }

    let startHour = '090000';
    let endHour = '100000';
    if (task.time) {
      const match = task.time.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const hh = match[1].padStart(2, '0');
        const mm = match[2];
        startHour = `${hh}${mm}00`;
        const endH = (parseInt(hh, 10) + 1).toString().padStart(2, '0');
        endHour = `${endH}${mm}00`;
      }
    }

    const dates = `${datePart}T${startHour}Z/${datePart}T${endHour}Z`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
  }

  /**
   * Dispatches a bespoke luxury schedule reminder email
   */
  public async sendScheduleReminder(req: ScheduleReminderRequest): Promise<{
    success: boolean;
    message: string;
    previewUrl?: string;
    recipient: string;
  }> {
    try {
      const tasks = req.tasks || [];
      const dateText = req.dateStr || new Date().toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const { transporter, sender, isPreview } = await this.getTransporter();

      const htmlContent = this.renderScheduleHtmlTemplate({
        dateText,
        recipient: req.recipient,
        customMessage: req.customMessage,
        tasks,
      });

      const subject = req.subject || `[CBP Atelier] Nhắc Lịch Làm Việc & Ca Trọng Tâm: ${dateText}`;

      const info = await transporter.sendMail({
        from: sender,
        to: req.recipient,
        subject,
        html: htmlContent,
      });

      let previewUrl = '';
      if (isPreview && info && nodemailer.getTestMessageUrl(info)) {
        previewUrl = nodemailer.getTestMessageUrl(info) as string;
        console.log(`[Email Service ✉️] Test Preview URL: ${previewUrl}`);
      }

      console.log(`[Email Service ✉️] Schedule reminder dispatched to ${req.recipient}`);

      return {
        success: true,
        message: isPreview
          ? 'Đã tạo và gửi email giả lập thành công (Chế độ xem trước Ethereal)'
          : `Đã gửi email nhắc lịch thành công đến ${req.recipient}`,
        previewUrl,
        recipient: req.recipient,
      };
    } catch (error: any) {
      console.error('❌ Failed to send schedule reminder email:', error);
      throw new Error(error.message || 'Lỗi gửi email nhắc lịch');
    }
  }

  /**
   * HTML Template with Swiss luxury minimalist aesthetic
   */
  private renderScheduleHtmlTemplate(data: {
    dateText: string;
    recipient: string;
    customMessage?: string;
    tasks: Array<{
      title: string;
      time?: string;
      priority?: string;
      category?: string;
      note?: string;
      column?: string;
      scheduled_date?: string;
    }>;
  }): string {
    const totalTasks = data.tasks.length;
    const completedTasks = data.tasks.filter((t) => t.column === 'done').length;
    const criticalTasks = data.tasks.filter((t) => t.priority?.includes('Cốt Lõi') || t.priority?.includes('P1')).length;

    const taskRows = data.tasks.map((task, idx) => {
      const isDone = task.column === 'done';
      const gcalUrl = this.generateGoogleCalendarUrl(task);
      const priorityColor = task.priority?.includes('Cốt Lõi') || task.priority?.includes('P1')
        ? '#AE445A'
        : task.priority?.includes('Quan Trọng') || task.priority?.includes('P2')
        ? '#446592'
        : '#709078';

      return `
        <tr>
          <td style="padding: 14px 16px; border-bottom: 1px solid #1E293B; vertical-align: top;">
            <div style="font-family: monospace; font-size: 12px; font-weight: 700; color: #94A3B8; background: #0F172A; padding: 4px 8px; border-radius: 6px; display: inline-block; border: 1px solid #334155;">
              ${task.time || 'Cả ngày'}
            </div>
          </td>
          <td style="padding: 14px 16px; border-bottom: 1px solid #1E293B; vertical-align: top;">
            <div style="font-size: 14px; font-weight: 700; color: ${isDone ? '#64748B' : '#F8FAFC'}; text-decoration: ${isDone ? 'line-through' : 'none'}; margin-bottom: 4px;">
              ${task.title}
            </div>
            ${task.note ? `<div style="font-size: 12px; color: #94A3B8; margin-top: 4px; line-height: 1.4;">${task.note}</div>` : ''}
            <div style="margin-top: 8px;">
              <a href="${gcalUrl}" target="_blank" style="font-size: 11px; color: #38BDF8; text-decoration: none; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2);">
                + Thêm vào Google Calendar
              </a>
            </div>
          </td>
          <td style="padding: 14px 16px; border-bottom: 1px solid #1E293B; vertical-align: top; text-align: right;">
            <span style="display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 8px; border-radius: 9999px; background: ${priorityColor}22; color: ${priorityColor}; border: 1px solid ${priorityColor}44;">
              ${task.priority || 'Tiêu chuẩn'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Lịch Trình CBP Atelier OS</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #07090E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F1F5F9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07090E; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0F172A; border-radius: 20px; overflow: hidden; border: 1px solid #1E293B; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
              
              <!-- Header Bar -->
              <tr>
                <td style="padding: 28px 32px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-bottom: 1px solid #334155;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #D4AF37;">
                          CBP ATELIER OS • HỆ THỐNG NHẮC LỊCH TỰ ĐỘNG
                        </div>
                        <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">
                          Lịch Trình Công Việc
                        </h1>
                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #94A3B8;">
                          ${data.dateText}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Custom Note (if any) -->
              ${data.customMessage ? `
              <tr>
                <td style="padding: 16px 32px; background-color: #162032; border-bottom: 1px solid #1E293B;">
                  <div style="font-size: 13px; color: #E2E8F0; line-height: 1.5; font-style: italic;">
                    "${data.customMessage}"
                  </div>
                </td>
              </tr>
              ` : ''}

              <!-- 3 Key Metric Strips -->
              <tr>
                <td style="padding: 20px 32px; background-color: #0B1120; border-bottom: 1px solid #1E293B;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center" style="padding: 8px;">
                        <div style="font-size: 22px; font-weight: 800; color: #F8FAFC;">${totalTasks}</div>
                        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; font-weight: 600;">Tổng Mục Tiêu</div>
                      </td>
                      <td align="center" style="padding: 8px; border-left: 1px solid #1E293B; border-right: 1px solid #1E293B;">
                        <div style="font-size: 22px; font-weight: 800; color: #AE445A;">${criticalTasks}</div>
                        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; font-weight: 600;">P1 Cốt Lõi</div>
                      </td>
                      <td align="center" style="padding: 8px;">
                        <div style="font-size: 22px; font-weight: 800; color: #10B981;">${completedTasks}</div>
                        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; font-weight: 600;">Đã Hoàn Thành</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Task Timeline Table -->
              <tr>
                <td style="padding: 24px 32px;">
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B; margin-bottom: 12px;">
                    Chi Tiết Ca Việc Hôm Nay (${totalTasks})
                  </div>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    ${totalTasks > 0 ? taskRows : `
                      <tr>
                        <td colspan="3" style="text-align: center; padding: 32px 16px; color: #64748B; font-size: 13px;">
                          Không có ca làm việc nào được xếp lịch cho thời điểm này.
                        </td>
                      </tr>
                    `}
                  </table>
                </td>
              </tr>

              <!-- Primary CTA Action -->
              <tr>
                <td style="padding: 0 32px 32px 32px; text-align: center;">
                  <a href="http://localhost:3000" target="_blank" style="display: inline-block; padding: 12px 28px; background: #2563EB; color: #FFFFFF; font-weight: 700; font-size: 13px; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                    Mở Bàn Làm Việc CBP Atelier OS &rarr;
                  </a>
                  <div style="margin-top: 14px; font-size: 11px; color: #64748B;">
                    Thư tự động nhắc việc gửi tới <strong>${data.recipient}</strong>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 16px 32px; background-color: #07090E; border-top: 1px solid #1E293B; text-align: center;">
                  <p style="margin: 0; font-size: 10px; color: #475569; letter-spacing: 0.04em;">
                    CBP Atelier Studio OS • Swiss Minimalist Productivity Suite • Synchronized with MongoDB Atlas
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }

  /**
   * Dispatches legacy postcard email
   */
  public async dispatchPostcard(req: PostcardEmailRequest): Promise<boolean> {
    try {
      const emailLog = new EmailLogModel({
        recipient: req.recipient,
        type: req.type,
        title: req.title,
        haiku: req.haiku,
        weather: req.weather,
        tasksSummary: req.tasksSummary,
        streakDays: req.streakDays || 14,
      });

      await emailLog.save();
      console.log(`[MongoDB Atlas 🍃] Dispatched & saved ${req.type} Postcard to ${req.recipient}`);

      // Attempt actual email dispatch if SMTP available
      try {
        const { transporter, sender } = await this.getTransporter();
        await transporter.sendMail({
          from: sender,
          to: req.recipient,
          subject: `[CBP Atelier Postcard] ${req.title}`,
          html: `
            <div style="font-family: serif; background: #FFFBF0; padding: 24px; border: 1px solid #FDE68A; border-radius: 16px; max-width: 500px; margin: 0 auto; color: #1E293B;">
              <h2 style="color: #D97706; margin-top: 0;">${req.title}</h2>
              <p style="font-style: italic; color: #78350F; border-left: 3px solid #F59E0B; padding-left: 12px;">"${req.haiku}"</p>
              <div style="margin-top: 16px; font-size: 12px; color: #64748B;">
                <strong>Thời tiết:</strong> ${req.weather} | <strong>Chuỗi kỷ luật:</strong> ${req.streakDays} ngày
              </div>
              <ul style="margin-top: 12px; font-size: 13px; color: #334155;">
                ${(req.tasksSummary || []).map((t) => `<li>${t}</li>`).join('')}
              </ul>
            </div>
          `,
        });
      } catch (sendErr) {
        console.warn('Postcard direct mailer notice:', sendErr);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to save EmailLog to MongoDB Atlas:', error);
      return false;
    }
  }

  /**
   * Starts the automatic background reminder poller (Runs every 60s)
   */
  public startReminderScheduler() {
    if (this.isSchedulerRunning) return;
    this.isSchedulerRunning = true;
    console.log('⏰ [Email Service] Background Schedule Reminder Worker initialized (Interval: 60s)');

    setInterval(async () => {
      try {
        await this.checkAndTriggerAutomatedReminders();
      } catch (err) {
        console.error('Reminder scheduler tick error:', err);
      }
    }, 60 * 1000);
  }

  private async checkAndTriggerAutomatedReminders() {
    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayYmd = now.toISOString().slice(0, 10);

    // 1. Check Morning Daily Briefings
    const settingsForBriefing = await ReminderSettingModel.find({
      autoMorningBriefing: true,
      morningBriefingTime: currentTimeStr,
      lastBriefingDate: { $ne: todayYmd },
    });

    for (const setting of settingsForBriefing) {
      try {
        // Query tasks for this user or general tasks for today
        const query: any = {
          $or: [
            { scheduled_date: todayYmd },
            { scheduled_date: { $exists: false } },
            { scheduled_date: '' },
          ],
        };
        if (setting.userId) query.userId = setting.userId;

        const tasks = await TaskModel.find(query).limit(20);
        if (tasks.length > 0) {
          await this.sendScheduleReminder({
            recipient: setting.targetEmail,
            subject: `[CBP Atelier] Báo Cáo Buổi Sáng & Lịch Trình Ngày Hôm Nay (${todayYmd})`,
            dateStr: todayYmd,
            customMessage: 'Chào buổi sáng! Đây là danh sách các ca công việc trọng tâm được lên lịch cho ngày hôm nay của bạn.',
            tasks: tasks.map((t) => ({
              title: t.title,
              time: `${t.time_box.start} - ${t.time_box.end}`,
              priority: t.priority,
              category: t.category,
              note: t.note,
              column: t.column,
            })),
          });

          // Dispatch to Telegram if configured
          if (setting.telegram?.enabled && setting.telegram?.chatId) {
            await telegramService.sendScheduleBriefing(
              setting.telegram.chatId,
              tasks.map((t) => ({
                title: t.title,
                time: `${t.time_box.start} - ${t.time_box.end}`,
                priority: t.priority,
                category: t.category,
                note: t.note,
                column: t.column,
              })),
              todayYmd,
              undefined,
              setting.telegram.botToken
            );
          }
        }

        setting.lastBriefingDate = todayYmd;
        await setting.save();
        console.log(`[Auto-Reminder] Sent daily morning briefing to ${setting.targetEmail}`);
      } catch (briefingErr) {
        console.error(`Failed morning briefing for ${setting.targetEmail}:`, briefingErr);
      }
    }

    // 2. Check Upcoming Task Reminders (e.g. within 15/30/60 minutes)
    const activeSettings = await ReminderSettingModel.find({
      autoUpcomingReminder: true,
    });

    for (const setting of activeSettings) {
      const minutesBefore = setting.upcomingMinutesBefore || 30;
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

      // Query active, unsent tasks for today
      const upcomingQuery: any = {
        column: { $ne: 'done' },
        email_reminder_sent: { $ne: true },
        $or: [
          { scheduled_date: todayYmd },
          { scheduled_date: { $exists: false } },
          { scheduled_date: '' },
        ],
      };
      if (setting.userId) upcomingQuery.userId = setting.userId;

      const candidateTasks = await TaskModel.find(upcomingQuery);
      const matchedTasks = candidateTasks.filter((t) => {
        if (!t.time_box?.start) return false;
        const m = t.time_box.start.match(/(\d{1,2}):(\d{2})/);
        if (!m) return false;
        const taskStartMinutes = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        const diffMinutes = taskStartMinutes - currentTotalMinutes;
        // Trigger if task starts within the reminder window (0 < diffMinutes <= minutesBefore)
        return diffMinutes > 0 && diffMinutes <= minutesBefore;
      });

      if (matchedTasks.length > 0) {
        await this.sendScheduleReminder({
          recipient: setting.targetEmail,
          subject: `[CBP Atelier Nhắc Nhở] Sắp bắt đầu ca việc trong ${minutesBefore} phút: ${matchedTasks[0].title}`,
          dateStr: todayYmd,
          customMessage: `Nhắc nhở tự động: Bạn có ${matchedTasks.length} ca làm việc sắp bắt đầu trong ${minutesBefore} phút tới.`,
          tasks: matchedTasks.map((t) => ({
            title: t.title,
            time: `${t.time_box.start} - ${t.time_box.end}`,
            priority: t.priority,
            category: t.category,
            note: t.note,
            column: t.column,
          })),
        });

        // Dispatch to Telegram if configured
        if (setting.telegram?.enabled && setting.telegram?.chatId) {
          for (const item of matchedTasks) {
            await telegramService.sendUpcomingAlert(
              setting.telegram.chatId,
              {
                title: item.title,
                time: `${item.time_box.start} - ${item.time_box.end}`,
                priority: item.priority,
                category: item.category,
                note: item.note,
                column: item.column,
              },
              minutesBefore,
              setting.telegram.botToken
            );
          }
        }

        // Mark as sent so we don't spam
        await TaskModel.updateMany(
          { _id: { $in: matchedTasks.map((t) => t._id) } },
          { $set: { email_reminder_sent: true } }
        );
        console.log(`[Auto-Reminder] Successfully triggered reminder for ${matchedTasks.length} task(s) to ${setting.targetEmail}`);
      }
    }
  }

  public isRealSmtpConfigured(): boolean {
    return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  /**
   * Send Password Reset OTP Email
   */
  public async sendPasswordResetEmail(
    email: string,
    code: string,
    name: string
  ): Promise<{ success: boolean; isRealEmailSent: boolean; previewUrl?: string; error?: string }> {
    try {
      if (!this.isRealSmtpConfigured()) {
        console.warn(`[Email Service ✉️] Cannot dispatch real OTP to ${email}: SMTP credentials (SMTP_USER, SMTP_PASS) are not set in .env!`);
        return {
          success: false,
          isRealEmailSent: false,
          error: 'NO_SMTP',
        };
      }

      const { transporter, sender } = await this.getTransporter();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #0f172a; padding: 28px 24px; text-align: center; color: #ffffff; }
            .badge { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; background: rgba(56,189,248,0.2); color: #38bdf8; padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px; }
            .title { font-size: 20px; font-weight: 800; margin: 0; color: #ffffff; }
            .body { padding: 32px 24px; }
            .greeting { font-size: 14px; line-height: 1.6; margin-bottom: 16px; color: #334155; }
            .otp-card { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; text-align: center; padding: 20px; margin: 24px 0; }
            .otp-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 8px; letter-spacing: 0.08em; }
            .otp-code { font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0284c7; }
            .note { font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 14px; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="badge">Chrono-Atelier OS</div>
              <h1 class="title">Khôi Phục Mật Khẩu</h1>
            </div>
            <div class="body">
              <p class="greeting">Xin chào <strong>${name || 'Thành viên Atelier'}</strong>,</p>
              <p class="greeting">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${email}</strong> của bạn trên hệ điều hành Chrono-Atelier.</p>
              
              <div class="otp-card">
                <div class="otp-label">MÃ XÁC THỰC BẢO MẬT (OTP)</div>
                <div class="otp-code">${code}</div>
              </div>

              <p class="note">Mã xác thực này có hiệu lực trong vòng <strong>15 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai khác.</p>
              <p class="note">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email và mật khẩu của bạn vẫn được giữ an toàn tuyệt đối.</p>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} Chrono-Atelier Operating System. Designed for Focus & Elegance.
            </div>
          </div>
        </body>
        </html>
      `;

      const info = await transporter.sendMail({
        from: sender,
        to: email,
        subject: `[Chrono-Atelier] Mã xác nhận đặt lại mật khẩu: ${code}`,
        html: htmlContent,
      });

      console.log(`[Email Service ✉️] Real password reset OTP sent to ${email}. MessageId: ${info.messageId}`);
      return { success: true, isRealEmailSent: true };
    } catch (err: any) {
      console.error('[Email Service ✉️] Failed to send reset OTP email:', err);
      return { success: false, isRealEmailSent: false, error: err.message };
    }
  }
}

export const emailService = new EmailService();
