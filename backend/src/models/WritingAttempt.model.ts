import mongoose, { Schema, Document } from 'mongoose';

export interface IWritingAnnotation {
  id: string;
  category: 'grammar' | 'lexical' | 'cohesion' | 'logic' | 'strength';
  quote: string;
  suggestion: string;
  explanationVi: string;
  bandImpact?: string;
}

export interface IWritingBandCeiling {
  criterion: 'TR/TA' | 'CC' | 'LR' | 'GRA';
  cappedAt: string;
  reasonVi: string;
}

export interface IWritingWeakSentence {
  id: string;
  original: string;
  hintVi: string;
  userRewrite?: string;
  rewriteScore?: string;
  rewriteFeedbackVi?: string;
}

export interface IWritingRecommendedVocab {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning: string;
  example: string;
  exampleTranslation?: string;
  topic: string;
}

export interface IWritingAttemptDocument extends Document {
  userId?: mongoose.Types.ObjectId;
  taskType: 'task1' | 'task2';
  essayType: string;
  prompt: string;
  promptImage?: string;
  essay: string;
  elapsedSeconds: number;
  localDiagnostics: {
    wordCount: number;
    effectiveWordCount: number;
    paragraphCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    repeatedWords: Array<{ word: string; count: number }>;
    promptOverlapRatio: number;
    warnings: string[];
  };
  scores: {
    taskAchievement: number;
    coherenceCohesion: number;
    lexicalResource: number;
    grammaticalRange: number;
    overall: number;
  };
  overallSummaryVi: string;
  bandCeilings: IWritingBandCeiling[];
  unlockNextBand: Array<{ actionVi: string; estimatedGain: string }>;
  criteriaDetails: {
    taskAchievement: { summaryVi: string; strengthsVi: string[]; weaknessesVi: string[] };
    coherenceCohesion: { summaryVi: string; strengthsVi: string[]; weaknessesVi: string[] };
    lexicalResource: { summaryVi: string; strengthsVi: string[]; weaknessesVi: string[] };
    grammaticalRange: { summaryVi: string; strengthsVi: string[]; weaknessesVi: string[] };
  };
  annotations: IWritingAnnotation[];
  injectedVocabUsed: Array<{ word: string; meaning?: string; usedCorrectly: boolean; noteVi?: string }>;
  recommendedVocab: IWritingRecommendedVocab[];
  weakSentences: IWritingWeakSentence[];
  upgradedVersions: {
    preserveVoiceEssay?: string;
    preserveVoiceNotesVi?: string;
    band85Essay?: string;
    band85NotesVi?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CriterionDetailSchema = new Schema(
  {
    summaryVi: { type: String, default: '' },
    strengthsVi: [{ type: String }],
    weaknessesVi: [{ type: String }],
  },
  { _id: false }
);

const WritingAttemptSchema = new Schema<IWritingAttemptDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    taskType: { type: String, enum: ['task1', 'task2'], required: true, default: 'task2' },
    essayType: { type: String, default: 'opinion', trim: true },
    prompt: { type: String, required: true, trim: true },
    promptImage: { type: String, default: '' },
    essay: { type: String, required: true },
    elapsedSeconds: { type: Number, default: 0 },
    localDiagnostics: {
      wordCount: { type: Number, default: 0 },
      effectiveWordCount: { type: Number, default: 0 },
      paragraphCount: { type: Number, default: 0 },
      sentenceCount: { type: Number, default: 0 },
      avgSentenceLength: { type: Number, default: 0 },
      repeatedWords: [
        {
          word: String,
          count: Number,
          _id: false,
        },
      ],
      promptOverlapRatio: { type: Number, default: 0 },
      warnings: [{ type: String }],
    },
    scores: {
      taskAchievement: { type: Number, required: true, min: 0, max: 9 },
      coherenceCohesion: { type: Number, required: true, min: 0, max: 9 },
      lexicalResource: { type: Number, required: true, min: 0, max: 9 },
      grammaticalRange: { type: Number, required: true, min: 0, max: 9 },
      overall: { type: Number, required: true, min: 0, max: 9 },
    },
    overallSummaryVi: { type: String, default: '' },
    bandCeilings: [
      {
        criterion: String,
        cappedAt: String,
        reasonVi: String,
        _id: false,
      },
    ],
    unlockNextBand: [
      {
        actionVi: String,
        estimatedGain: String,
        _id: false,
      },
    ],
    criteriaDetails: {
      taskAchievement: { type: CriterionDetailSchema, default: () => ({}) },
      coherenceCohesion: { type: CriterionDetailSchema, default: () => ({}) },
      lexicalResource: { type: CriterionDetailSchema, default: () => ({}) },
      grammaticalRange: { type: CriterionDetailSchema, default: () => ({}) },
    },
    annotations: [
      {
        id: String,
        category: { type: String, enum: ['grammar', 'lexical', 'cohesion', 'logic', 'strength'] },
        quote: String,
        suggestion: String,
        explanationVi: String,
        bandImpact: String,
        _id: false,
      },
    ],
    injectedVocabUsed: [
      {
        word: String,
        meaning: String,
        usedCorrectly: Boolean,
        noteVi: String,
        _id: false,
      },
    ],
    recommendedVocab: [
      {
        word: String,
        phonetic: String,
        partOfSpeech: String,
        meaning: String,
        example: String,
        exampleTranslation: String,
        topic: String,
        _id: false,
      },
    ],
    weakSentences: [
      {
        id: String,
        original: String,
        hintVi: String,
        userRewrite: String,
        rewriteScore: String,
        rewriteFeedbackVi: String,
        _id: false,
      },
    ],
    upgradedVersions: {
      preserveVoiceEssay: String,
      preserveVoiceNotesVi: String,
      band85Essay: String,
      band85NotesVi: String,
    },
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

WritingAttemptSchema.index({ userId: 1, createdAt: -1 });

export const WritingAttemptModel = mongoose.model<IWritingAttemptDocument>(
  'WritingAttempt',
  WritingAttemptSchema
);

