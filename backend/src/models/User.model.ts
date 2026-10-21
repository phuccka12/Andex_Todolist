import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  coverImage?: string;
  title?: string;
  bio?: string;
  wallpaper?: string;
  pomodoroStats?: {
    sessionsCompleted: number;
    totalMinutes: number;
  };
  streak?: number;
  role: 'user' | 'admin';
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    title: { type: String, default: 'CBP Atelier Specialist' },
    bio: { type: String, default: 'Crafting thoughtful routines and time blocks in CBP OS.' },
    wallpaper: { type: String, default: '' },
    pomodoroStats: {
      sessionsCompleted: { type: Number, default: 0 },
      totalMinutes: { type: Number, default: 0 },
    },
    streak: { type: Number, default: 1 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    resetPasswordCode: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc: any, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password; // Do not return password hash to client
      },
    },
  }
);

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
