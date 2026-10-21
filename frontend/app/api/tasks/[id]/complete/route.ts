import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  return NextResponse.json({
    success: true,
    taskId,
    column: 'done',
    punctuality_status: 'past',
    message: `Task ${taskId} mark as completed!`,
  });
}
