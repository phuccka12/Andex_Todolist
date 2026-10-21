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
  | 'twilight'
  | 'deep_forest'
  | 'sunset_amber'
  | 'sage_mint'
  | 'ocean_slate'
  | 'cyan_azure'
  | 'retro_coral'
  | 'terracotta'
  | 'sunset_plum'
  | 'cyber_lime'
  | 'blue'
  | 'purple'
  | 'amber'
  | 'rose'
  | 'mint'
  | 'lavender'
  | 'periwinkle'
  | 'peach'
  | 'magenta'
  | 'sky'
  | 'cream';

export interface DefinitionOfDone {
  id: string;
  text: string;
  completed: boolean;
}

export interface TimeBox {
  start: string; // HH:MM
  end: string;   // HH:MM
  duration_minutes: number;
}

export interface Collaborator {
  name: string;
  avatar: string;
}

export interface TaskItem {
  id: string;
  title: string;
  category: TaskCategory;
  priority: string;
  color_theme: string;
  column: 'draft' | 'in_progress' | 'editing' | 'done' | 'todo' | 'in_review';
  day_index?: number;
  scheduled_date?: string; // YYYY-MM-DD for scheduling in future/past
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

export interface PostcardEmail {
  recipient: string;
  type: 'sunrise' | 'sunset';
  title: string;
  haiku: string;
  weather: string;
  tasksSummary: string[];
  streakDays: number;
}

export interface UserProfileData {
  name: string;
  email: string;
  title: string;
  avatar: string;
  cover: string;
  background: string;
  applyAppBackground: boolean;
  backgroundBlur: number;
  backgroundOpacity: number;
  bio?: string;
  dailyGoalHours: number;
}
