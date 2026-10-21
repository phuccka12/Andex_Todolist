import mongoose, { Schema, Document } from 'mongoose';

export interface IJournalDocument extends Document {
  userId?: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  title: string;
  mood: 'grateful' | 'happy' | 'venting' | 'exhausted' | 'peaceful' | 'nostalgic';
  weather?: 'sunny' | 'rainy' | 'cloudy' | 'windy' | 'night';
  content: string;
  positives: string[]; // Những điều tích cực, niềm vui
  negatives: string[]; // Những điều uất ức, trút giận
  photos: string[]; // Ảnh Polaroid (Base64 hoặc URL)
  isBurnedNegative?: boolean; // Đã hóa giải uất ức
  createdAt: Date;
  updatedAt: Date;
}

const JournalSchema = new Schema<IJournalDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    date: { type: String, required: true },
    title: { type: String, required: true, default: 'Ký ức ngày trôi' },
    mood: {
      type: String,
      enum: ['grateful', 'happy', 'venting', 'exhausted', 'peaceful', 'nostalgic'],
      default: 'peaceful',
    },
    weather: {
      type: String,
      enum: ['sunny', 'rainy', 'cloudy', 'windy', 'night'],
      default: 'night',
    },
    content: { type: String, default: '' },
    positives: [{ type: String }],
    negatives: [{ type: String }],
    photos: [{ type: String }],
    isBurnedNegative: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc: any, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const JournalModel = mongoose.model<IJournalDocument>('Journal', JournalSchema);
