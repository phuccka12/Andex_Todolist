import { TaskModel, ITaskDocument } from '../models/Task.model';
import { TaskItem } from '../types/index';

class TaskService {
  public async getAllTasks(userId?: string): Promise<TaskItem[]> {
    if (userId) {
      // Logged in user: ONLY return tasks owned by this specific userId
      const tasks = await TaskModel.find({ userId }).sort({ createdAt: -1 }).lean();

      return tasks.map((t: any) => ({
        ...t,
        id: t._id.toString(),
        userId: t.userId ? t.userId.toString() : undefined,
      }));
    } else {
      // Guest / Logged-out user: return tasks with no userId
      const guestQuery = { $or: [{ userId: null }, { userId: { $exists: false } }] };
      const tasks = await TaskModel.find(guestQuery).sort({ createdAt: -1 }).lean();

      return tasks.map((t: any) => ({
        ...t,
        id: t._id.toString(),
        userId: undefined,
      }));
    }
  }

  public async getTaskById(id: string): Promise<TaskItem | null> {
    const task = await TaskModel.findById(id).lean();
    if (!task) return null;
    return { ...(task as any), id: (task as any)._id.toString(), userId: (task as any).userId?.toString() };
  }

  public async createTask(taskPartial: Partial<TaskItem>, userId?: string): Promise<TaskItem> {
    const effectiveUserId = userId || taskPartial.userId;
    const newTask = new TaskModel({
      userId: effectiveUserId || undefined,
      title: taskPartial.title?.trim() || 'Công việc mới',
      category: taskPartial.category || 'deep_work',
      priority: taskPartial.priority || '#1 Cốt Lõi',
      color_theme: taskPartial.color_theme || 'blue',
      column: taskPartial.column || 'draft',
      day_index: typeof taskPartial.day_index === 'number' ? taskPartial.day_index : 1,
      scheduled_date: taskPartial.scheduled_date || '',
      time_box: taskPartial.time_box || { start: '09:00', end: '10:30', duration_minutes: 90 },
      note: taskPartial.note || '',
      progress_percentage: taskPartial.progress_percentage || 0,
      definition_of_done: taskPartial.definition_of_done || [],
      collaborators: taskPartial.collaborators && taskPartial.collaborators.length > 0
        ? taskPartial.collaborators
        : [{ name: 'Cao Bảo Phúc', avatar: 'CB' }],
      stats: { comments_count: 0, attachments_count: 0 },
      punctuality_status: 'on_track',
    });

    const saved = await newTask.save();
    const json = saved.toJSON() as any;
    return {
      ...json,
      id: json.id || saved._id.toString(),
      userId: json.userId ? json.userId.toString() : undefined,
    };
  }

  public async updateTask(id: string, updates: Partial<TaskItem>, userId?: string): Promise<TaskItem | null> {
    const query: any = { _id: id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }
    const task = await TaskModel.findOne(query);
    if (!task) return null;

    // Attach userId if updating legacy task
    if (userId && !task.userId) {
      task.userId = userId as any;
    }

    if (updates.title !== undefined) task.title = updates.title;
    if (updates.column !== undefined) task.column = updates.column;
    if (updates.category !== undefined) task.category = updates.category;
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.color_theme !== undefined) task.color_theme = updates.color_theme;
    if (updates.day_index !== undefined) task.day_index = updates.day_index;
    if (updates.scheduled_date !== undefined) (task as any).scheduled_date = updates.scheduled_date;
    if (updates.time_box !== undefined) task.time_box = updates.time_box;
    if (updates.note !== undefined) task.note = updates.note;
    if (updates.progress_percentage !== undefined) task.progress_percentage = updates.progress_percentage;
    if (updates.definition_of_done !== undefined) task.definition_of_done = updates.definition_of_done as any;

    if (task.column === 'done') {
      task.progress_percentage = 100;
      task.punctuality_status = 'past';
      if (task.definition_of_done) {
        task.definition_of_done.forEach((d) => (d.completed = true));
      }
    }

    const saved = await task.save();
    const json = saved.toJSON() as any;
    return {
      ...json,
      id: json.id || saved._id.toString(),
      userId: json.userId ? json.userId.toString() : undefined,
    };
  }

  public async deleteTask(id: string, userId?: string): Promise<boolean> {
    const query: any = { _id: id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }
    const res = await TaskModel.findOneAndDelete(query);
    return !!res;
  }

  public async completeTask(id: string, userId?: string): Promise<TaskItem | null> {
    const query: any = { _id: id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }
    const task = await TaskModel.findOne(query);
    if (!task) return null;

    task.column = 'done';
    task.punctuality_status = 'past';
    task.progress_percentage = 100;
    if (task.definition_of_done) {
      task.definition_of_done.forEach((d) => (d.completed = true));
    }

    const updated = await task.save();
    const json = updated.toJSON() as any;
    return {
      ...json,
      id: json.id || updated._id.toString(),
      userId: json.userId ? json.userId.toString() : undefined,
    };
  }

  public async toggleChecklist(taskId: string, checklistId: string, userId?: string): Promise<TaskItem | null> {
    const query: any = { _id: taskId };
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
    }
    const task = await TaskModel.findOne(query);
    if (!task || !task.definition_of_done) return null;

    const item = task.definition_of_done.find((d) => d.id === checklistId);
    if (item) {
      item.completed = !item.completed;
      const total = task.definition_of_done.length;
      const completed = task.definition_of_done.filter((d) => d.completed).length;
      task.progress_percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      if (task.progress_percentage === 100) {
        task.column = 'done';
      }
    }

    const saved = await task.save();
    const json = saved.toJSON() as any;
    return {
      ...json,
      id: json.id || saved._id.toString(),
      userId: json.userId ? json.userId.toString() : undefined,
    };
  }

  public async seedInitialDataForUser(userId: string): Promise<void> {
    // Clean initial state: no mock tasks
    return;
  }

  public async seedInitialGuestData(): Promise<void> {
    // Clean initial state: no mock tasks
    return;
  }

  public async deleteAllTasks(userId?: string): Promise<number> {
    if (userId) {
      const res = await TaskModel.deleteMany({ userId });
      return res.deletedCount || 0;
    } else {
      const guestQuery = { $or: [{ userId: null }, { userId: { $exists: false } }] };
      const res = await TaskModel.deleteMany(guestQuery);
      return res.deletedCount || 0;
    }
  }
}

export const taskService = new TaskService();

