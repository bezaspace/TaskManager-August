import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getAllTasks, createTask, updateTask, deleteTask, startTask, completeTask, addTaskLog, updateTaskLog, deleteTaskLog } from '@/lib/database';

// No database initialization needed for Supabase

export async function GET(request: NextRequest) {
  try {
    const tasks = await getAllTasks();
    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const taskId = url.searchParams.get('id');
    const logId = url.searchParams.get('logId');

    if (action === 'start' && taskId) {
      // Start a scheduled task
      const task = await startTask(taskId);
      return NextResponse.json({ success: true, data: task });
    }

    if (action === 'complete' && taskId) {
      // Complete a task
      const task = await completeTask(taskId);
      return NextResponse.json({ success: true, data: task });
    }

    if (action === 'addLog' && taskId) {
      // Add log to task
      const body = await request.json();
      const { message } = body;
      
      if (!message) {
        return NextResponse.json(
          { success: false, error: 'Message is required' },
          { status: 400 }
        );
      }

      const log = await addTaskLog(taskId, message);
      return NextResponse.json({ success: true, data: log });
    }

    // Create new task (default POST behavior)
    const body = await request.json();
    const { title, description, scheduledStartTime, scheduledEndTime } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const task = await createTask({
      title,
      description: description || '',
      scheduledStartTime,
      scheduledEndTime
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const taskId = url.searchParams.get('id');
    const logId = url.searchParams.get('logId');

    if (action === 'updateLog' && taskId && logId) {
      // Update task log
      const body = await request.json();
      const { message } = body;

      if (!message) {
        return NextResponse.json(
          { success: false, error: 'Message is required' },
          { status: 400 }
        );
      }

      const log = await updateTaskLog(taskId, logId, message);
      return NextResponse.json({ success: true, data: log });
    }

    // Update task (default PUT behavior)
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const task = await updateTask(taskId, body);
    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error('Error in PUT request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const taskId = url.searchParams.get('id');
    const logId = url.searchParams.get('logId');

    if (action === 'deleteLog' && taskId && logId) {
      // Delete task log
      await deleteTaskLog(taskId, logId);
      return NextResponse.json({ success: true });
    }

    // Delete task (default DELETE behavior)
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    await deleteTask(taskId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete' },
      { status: 500 }
    );
  }
}