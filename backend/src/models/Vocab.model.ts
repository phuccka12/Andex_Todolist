import mongoose, { Schema, Document } from 'mongoose';

export interface IVocabDocument extends Document {
  userId?: mongoose.Types.ObjectId;
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning: string;
  example?: string;
  exampleTranslation?: string;
  topic: string;
  isSaved?: boolean;
  srsLevel: number;
  nextReviewAt: Date;
  lastReviewedAt?: Date;
  reviewCount: number;
  correctCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const VocabSchema = new Schema<IVocabDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    word: { type: String, required: true, trim: true },
    phonetic: { type: String, default: '', trim: true },
    partOfSpeech: { type: String, default: '', trim: true },
    meaning: { type: String, required: true, trim: true },
    example: { type: String, default: '', trim: true },
    exampleTranslation: { type: String, default: '', trim: true },
    topic: { type: String, default: 'Chung', trim: true },
    isSaved: { type: Boolean, default: false, index: true },
    srsLevel: { type: Number, default: 0, min: 0, max: 5 },
    nextReviewAt: { type: Date, default: () => new Date(), index: true },
    lastReviewedAt: { type: Date, default: null },
    reviewCount: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: any, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

VocabSchema.index({ userId: 1, nextReviewAt: 1 });
VocabSchema.index({ userId: 1, word: 1 });

export const VocabModel = mongoose.model<IVocabDocument>('Vocab', VocabSchema);

