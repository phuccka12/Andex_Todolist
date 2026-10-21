import mongoose, { Schema, Document } from 'mongoose';

export interface IReminderSettingDocument extends Document {
  userId?: mongoose.Types.ObjectId;
  targetEmail: string;
  autoMorningBriefing: boolean;
  morningBriefingTime: string; // e.g. "07:00"
  autoUpcomingReminder: boolean;
  upcomingMinutesBefore: number; // e.g. 30
  customSmtp?: {
    enabled: boolean;
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
  };
  lastBriefingDate?: string; // YYYY-MM-DD
  telegram?: {
    enabled: boolean;
    botToken?: string;
    chatId: string;
    autoMorningBriefing: boolean;
    autoUpcomingReminder: boolean;
    upcomingMinutesBefore: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSettingSchema = new Schema<IReminderSettingDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    targetEmail: { type: String, required: true, trim: true },
    autoMorningBriefing: { type: Boolean, default: true },
    morningBriefingTime: { type: String, default: '07:00' },
    autoUpcomingReminder: { type: Boolean, default: true },
    upcomingMinutesBefore: { type: Number, default: 30 },
    customSmtp: {
      enabled: { type: Boolean, default: false },
      host: { type: String, default: '' },
      port: { type: Number, default: 465 },
      user: { type: String, default: '' },
      pass: { type: String, default: '' },
      secure: { type: Boolean, default: true },
    },
    lastBriefingDate: { type: String, default: '' },
    telegram: {
      enabled: { type: Boolean, default: false },
      botToken: { type: String, default: '' },
      chatId: { type: String, default: '' },
      autoMorningBriefing: { type: Boolean, default: true },
      autoUpcomingReminder: { type: Boolean, default: true },
      upcomingMinutesBefore: { type: Number, default: 30 },
    },
  },
  {
    timestamps: true,
  }
);

export const ReminderSettingModel = mongoose.model<IReminderSettingDocument>(
  'ReminderSetting',
  ReminderSettingSchema
);
