export interface TelegramMessageOptions {
  parseMode?: 'HTML' | 'MarkdownV2' | 'Markdown';
  replyMarkup?: any;
}

export interface TaskSummaryItem {
  title: string;
  time?: string;
  priority?: string;
  category?: string;
  note?: string;
  column?: string;
}

class TelegramService {
  private defaultBotToken = process.env.TELEGRAM_BOT_TOKEN || '';

  public getBotToken(customToken?: string): string {
    return (customToken && customToken.trim()) || this.defaultBotToken || '';
  }

  /**
   * Send text message to Telegram Chat
   */
  public async sendMessage(
    chatId: string | number,
    text: string,
    options?: {
      botToken?: string;
      parseMode?: 'HTML' | 'MarkdownV2';
      replyMarkup?: any;
    }
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const token = this.getBotToken(options?.botToken);
    if (!token) {
      return { success: false, error: 'Chưa cấu hình Telegram Bot Token.' };
    }
    if (!chatId) {
      return { success: false, error: 'Chưa có Telegram Chat ID.' };
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const body: any = {
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || 'HTML',
      };

      if (options?.replyMarkup) {
        body.reply_markup = options.replyMarkup;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.ok) {
        console.error('Telegram API Error:', data);
        return { success: false, error: data.description || 'Lỗi gửi tin nhắn Telegram' };
      }

      console.log(`[Telegram ✈️] Dispatched message to Chat ID ${chatId}`);
      return { success: true, messageId: data.result?.message_id };
    } catch (err: any) {
      console.error('Telegram send error:', err);
      return { success: false, error: err.message || 'Không thể kết nối máy chủ Telegram' };
    }
  }

  /**
   * Test connection with a welcome notification
   */
  public async testConnection(
    chatId: string | number,
    customToken?: string
  ): Promise<{ success: boolean; error?: string }> {
    const text = `
⚡ <b>CBP ATELIER OS • KẾT NỐI THÀNH CÔNG</b>
━━━━━━━━━━━━━━━━━━━━
Chào bạn! Kênh thông báo Telegram đã được kích hoạt thành công cho không gian làm việc của bạn.

🔔 <b>Tính năng tự động hoạt động:</b>
• Báo cáo tổng kết ca việc mỗi sáng
• Rung chuông cảnh báo trước giờ bắt đầu 15 - 30 phút
• Đồng bộ trạng thái trực tiếp với MongoDB Atlas

<i>Thời gian kết nối: ${new Date().toLocaleTimeString('vi-VN')}</i>
    `.trim();

    return await this.sendMessage(chatId, text, {
      botToken: customToken,
    });
  }

  /**
   * Send Today's Schedule Briefing
   */
  public async sendScheduleBriefing(
    chatId: string | number,
    tasks: TaskSummaryItem[],
    dateStr?: string,
    customNote?: string,
    customToken?: string
  ): Promise<{ success: boolean; error?: string }> {
    const todayText = dateStr || new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const totalTasks = tasks.length;
    const p1Tasks = tasks.filter((t) => t.priority?.includes('Cốt Lõi') || t.priority?.includes('P1')).length;
    const doneTasks = tasks.filter((t) => t.column === 'done').length;

    let taskListText = '';
    if (tasks.length === 0) {
      taskListText = '<i>Hôm nay chưa có ca làm việc nào được xếp lịch.</i>';
    } else {
      taskListText = tasks
        .map((t, idx) => {
          const isDone = t.column === 'done';
          const statusIcon = isDone ? '✅' : '⏳';
          const priorityTag = t.priority?.includes('Cốt Lõi') || t.priority?.includes('P1') ? ' [P1 Cốt Lõi]' : '';
          const noteText = t.note ? `\n   └ <i>${t.note}</i>` : '';
          return `${idx + 1}. ${statusIcon} <b>${t.time || 'Cả ngày'}</b> — <b>${t.title}</b>${priorityTag}${noteText}`;
        })
        .join('\n\n');
    }

    const noteSection = customNote ? `\n\n💬 <b>Ghi chú:</b> <i>"${customNote}"</i>` : '';

    const text = `
🌅 <b>LỊCH TRÌNH CÔNG VIỆC • CBP ATELIER</b>
📅 <i>${todayText}</i>
━━━━━━━━━━━━━━━━━━━━
📊 <b>Tổng quan:</b> ${totalTasks} mục tiêu | ${p1Tasks} P1 Cốt lõi | ${doneTasks} hoàn tất${noteSection}

📋 <b>Danh sách ca việc:</b>
${taskListText}
━━━━━━━━━━━━━━━━━━━━
<i>Hệ thống tự động nhắc nhở từ CBP Atelier OS</i>
    `.trim();

    return await this.sendMessage(chatId, text, {
      botToken: customToken,
    });
  }

  /**
   * Send Alert for upcoming task starting in X minutes
   */
  public async sendUpcomingAlert(
    chatId: string | number,
    task: TaskSummaryItem,
    minutesBefore: number,
    customToken?: string
  ): Promise<{ success: boolean; error?: string }> {
    const text = `
⏰ <b>NHẮC VIỆC: SẮP BẮT ĐẦU TRONG ${minutesBefore} PHÚT</b>
━━━━━━━━━━━━━━━━━━━━
📌 <b>Nhiệm vụ:</b> <b>${task.title}</b>
⏱ <b>Khung giờ:</b> <code>${task.time || 'Sắp diễn ra'}</code>
🎯 <b>Mức ưu tiên:</b> ${task.priority || 'Tiêu chuẩn'}
${task.note ? `📝 <b>Ghi chú:</b> <i>${task.note}</i>\n` : ''}
━━━━━━━━━━━━━━━━━━━━
<i>Hãy chuẩn bị sẵn sàng không gian tập trung Deep Work!</i>
    `.trim();

    return await this.sendMessage(chatId, text, {
      botToken: customToken,
    });
  }
}

export const telegramService = new TelegramService();
