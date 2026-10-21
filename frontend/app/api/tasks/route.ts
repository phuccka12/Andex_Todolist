import { NextResponse } from 'next/server';
import { TaskItem } from '../../../lib/types';

let tasksStore: TaskItem[] = [
  {
    id: 'task_01',
    title: 'Deep Work: Kiến Trúc Model & Transform Data',
    category: 'deep_work',
    priority: '#1 Cốt Lõi',
    color_theme: 'deep_forest',
    column: 'in_progress',
    time_box: { start: '08:30', end: '10:00', duration_minutes: 90 },
    progress_percentage: 60,
    definition_of_done: [
      { id: 'd1', text: 'Viết xong hàm transform dữ liệu', completed: true },
      { id: 'd2', text: 'Benchmark thời gian phản hồi < 200ms', completed: false },
    ],
    collaborators: [{ name: 'Brooklyn Simmons', avatar: 'BS' }],
    stats: { comments_count: 12, attachments_count: 8 },
    punctuality_status: 'past',
  },
  {
    id: 'task_02',
    title: 'Luyện Code Pipeline & Tối Ưu Thuật Toán',
    category: 'in_progress',
    priority: '#2 Quan Trọng',
    color_theme: 'twilight',
    column: 'in_progress',
    time_box: { start: '10:30', end: '12:00', duration_minutes: 90 },
    progress_percentage: 50,
    definition_of_done: [
      { id: 'd3', text: 'Viết batch loader và async queue', completed: true },
      { id: 'd4', text: 'Xử lý memory leak trong loop', completed: false },
    ],
    collaborators: [{ name: 'Brooklyn Simmons', avatar: 'BS' }],
    stats: { comments_count: 7, attachments_count: 2 },
    punctuality_status: 'active_now',
  },
];

export async function GET() {
  return NextResponse.json(tasksStore);
}

export async function POST(request: Request) {
  const newTaskPartial: Partial<TaskItem> = await request.json();
  const newTask: TaskItem = {
    id: `task_${Date.now()}`,
    title: newTaskPartial.title || 'Ca mới',
    category: newTaskPartial.category || 'deep_work',
    priority: newTaskPartial.priority || '#1 Cốt Lõi',
    color_theme: newTaskPartial.color_theme || 'twilight',
    column: 'todo',
    time_box: newTaskPartial.time_box || { start: '14:00', end: '15:30', duration_minutes: 90 },
    progress_percentage: 0,
    definition_of_done: newTaskPartial.definition_of_done || [],
    collaborators: [{ name: 'Brooklyn Simmons', avatar: 'BS' }],
    stats: { comments_count: 0, attachments_count: 0 },
    punctuality_status: 'on_track',
  };

  tasksStore.push(newTask);
  return NextResponse.json(newTask, { status: 201 });
}
