export type TaskCategory =
  | 'deep_work'
  | 'research'
  | 'in_progress'
  | 'optimization'
  | 'in_review'
  | 'done'
  | 'meeting'
  | 'urgent';

export type TaskColorTheme =
  | 'lavender'
  | 'periwinkle'
  | 'peach'
  | 'mint'
  | 'magenta'
  | 'sky'
  | 'cream'
  | 'rose';

export interface DefinitionOfDone {
  id: string;
  text: string;
  completed: boolean;
}

export interface TimeBox {
  start: string;
  end: string;
  duration_minutes: number;
}

export interface Collaborator {
  name: string;
  avatar: string;
}

export interface TaskItem {
  id: string;
  userId?: string;
  title: string;
  category: TaskCategory;
  priority: string;
  color_theme: string;
  column: 'draft' | 'in_progress' | 'editing' | 'done' | 'todo' | 'in_review';
  day_index: number; // 0: Mon, 1: Tue, ... 6: Sun
  scheduled_date?: string;
  time_box: TimeBox;
  note?: string;
  progress_percentage: number;
  definition_of_done: DefinitionOfDone[];
  collaborators: Collaborator[];
  stats: {
    comments_count: number;
    attachments_count: number;
  };
  punctuality_status: 'on_track' | 'active_now' | 'overdue' | 'past';
  associated_canvas_stroke?: {
    color_palette: string;
    stroke_intensity: number;
  };
  email_reminder_sent?: boolean;
}

export interface PostcardEmailRequest {
  recipient: string;
  type: 'sunrise' | 'sunset';
  title: string;
  haiku: string;
  weather: string;
  tasksSummary: string[];
  streakDays: number;
}
