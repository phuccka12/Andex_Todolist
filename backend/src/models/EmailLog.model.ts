import mongoose, { Schema, Document } from 'mongoose';
import { PostcardEmailRequest } from '../types/index';

export interface IEmailLogDocument extends PostcardEmailRequest, Document {}

const EmailLogSchema = new Schema<IEmailLogDocument>(
  {
    recipient: { type: String, required: true },
    type: { type: String, enum: ['sunrise', 'sunset'], required: true },
    title: { type: String, required: true },
    haiku: { type: String, required: true },
    weather: { type: String, required: true },
    tasksSummary: [{ type: String }],
    streakDays: { type: Number, default: 14 },
  },
  {
    timestamps: true,
  }
);

export const EmailLogModel = mongoose.model<IEmailLogDocument>('EmailLog', EmailLogSchema);
