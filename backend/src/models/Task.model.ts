import mongoose, { Schema, Document } from 'mongoose';
import { TaskItem } from '../types/index';

export interface ITaskDocument extends Omit<TaskItem, 'id'>, Document {}

const TimeBoxSchema = new Schema({
  start: { type: String, required: true },
  end: { type: String, required: true },
  duration_minutes: { type: Number, required: true },
});

const DefinitionOfDoneSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

const CollaboratorSchema = new Schema({
  name: { type: String, required: true },
  avatar: { type: String, required: true },
});

const TaskSchema = new Schema<ITaskDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true },
    category: { type: String, required: true, default: 'deep_work' },
    priority: { type: String, required: true, default: '#1 Cốt Lõi' },
    color_theme: { type: String, required: true, default: 'blue' },
    column: {
      type: String,
      required: true,
      enum: ['draft', 'in_progress', 'editing', 'done', 'todo', 'in_review'],
      default: 'draft',
    },
    day_index: { type: Number, default: 1 }, // 0: Mon, 1: Tue, ... 6: Sun
    scheduled_date: { type: String, default: '' },
    time_box: { type: TimeBoxSchema, required: true },
    note: { type: String, default: '' },
    progress_percentage: { type: Number, default: 0 },
    definition_of_done: [DefinitionOfDoneSchema],
    collaborators: [CollaboratorSchema],
    stats: {
      comments_count: { type: Number, default: 0 },
      attachments_count: { type: Number, default: 0 },
    },
    punctuality_status: { type: String, enum: ['on_track', 'active_now', 'overdue', 'past'], default: 'on_track' },
    associated_canvas_stroke: {
      color_palette: String,
      stroke_intensity: Number,
    },
    email_reminder_sent: { type: Boolean, default: false },
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

export const TaskModel = mongoose.model<ITaskDocument>('Task', TaskSchema);
