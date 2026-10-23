import { Router, Request, Response } from 'express';
import { taskService } from '../services/task.service';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

export const taskRouter = Router();

// GET all tasks (scoped to logged in user, or legacy public tasks)
taskRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tasks = await taskService.getAllTasks(req.user?.id);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch tasks from MongoDB Atlas', details: err.message });
  }
});

// GET single task
taskRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch task', details: err.message });
  }
});

// CREATE new task
taskRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const newTask = await taskService.createTask(req.body, req.user?.id);
    res.status(201).json(newTask);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create task in MongoDB Atlas', details: err.message });
  }
});

// UPDATE task
taskRouter.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await taskService.updateTask(req.params.id, req.body, req.user?.id);
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update task', details: err.message });
  }
});

// COMPLETE task
taskRouter.put('/:id/complete', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const completedTask = await taskService.completeTask(req.params.id, req.user?.id);
    if (!completedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(completedTask);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to complete task in MongoDB Atlas', details: err.message });
  }
});

// TOGGLE checklist item
taskRouter.patch('/:id/checklist/:checklistId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await taskService.toggleChecklist(req.params.id, req.params.checklistId, req.user?.id);
    if (!updated) return res.status(404).json({ error: 'Task or checklist not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle checklist', details: err.message });
  }
});

// DELETE all tasks (clean slate)
taskRouter.delete('/all', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deletedCount = await taskService.deleteAllTasks(req.user?.id);
    res.json({ success: true, message: `Deleted ${deletedCount} tasks`, count: deletedCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete all tasks', details: err.message });
  }
});

// DELETE single task
taskRouter.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await taskService.deleteTask(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete task', details: err.message });
  }
});

// RESET clean dataset (wipes all mock data)
taskRouter.post('/seed-clean', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await taskService.deleteAllTasks(req.user?.id);
    const tasks = await taskService.getAllTasks(req.user?.id);
    res.json({ message: 'All tasks cleared successfully', tasks });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clean data', details: err.message });
  }
});

