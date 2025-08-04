import { supabase, TaskRow, TaskInsert, TaskUpdate, TaskLogRow, TaskLogInsert, TaskLogUpdate } from './supabase';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  startTime: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  completedTime?: string;
  elapsedTime: number;
}

export interface TaskLog {
  id: string;
  taskId: string;
  message: string;
  timestamp: string;
  isEditable: number;
}

export interface TaskWithLogs extends Task {
  logs: TaskLog[];
}

// Helper functions to convert between database format and API format
function dbTaskToTask(dbTask: TaskRow): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description,
    status: dbTask.status,
    startTime: dbTask.start_time,
    scheduledStartTime: dbTask.scheduled_start_time || undefined,
    scheduledEndTime: dbTask.scheduled_end_time || undefined,
    completedTime: dbTask.completed_time || undefined,
    elapsedTime: dbTask.elapsed_time,
  };
}

function taskToDbTask(task: Task): TaskInsert {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    start_time: task.startTime,
    scheduled_start_time: task.scheduledStartTime || null,
    scheduled_end_time: task.scheduledEndTime || null,
    completed_time: task.completedTime || null,
    elapsed_time: task.elapsedTime,
  };
}

function dbLogToTaskLog(dbLog: TaskLogRow): TaskLog {
  return {
    id: dbLog.id,
    taskId: dbLog.task_id,
    message: dbLog.message,
    timestamp: dbLog.timestamp,
    isEditable: dbLog.is_editable ? 1 : 0,
  };
}

function taskLogToDbLog(log: TaskLog): TaskLogInsert {
  return {
    id: log.id,
    task_id: log.taskId,
    message: log.message,
    timestamp: log.timestamp,
    is_editable: log.isEditable === 1,
  };
}

class TaskDatabase {
  // Task operations
  async createTask(task: Task): Promise<Task> {
    const dbTask = taskToDbTask(task);
    const { data, error } = await supabase
      .from('tasks')
      .insert(dbTask)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return dbTaskToTask(data);
  }

  async getAllTasksWithLogs(): Promise<TaskWithLogs[]> {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_logs (*)
      `)
      .order('start_time', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return tasks.map(task => ({
      ...dbTaskToTask(task),
      logs: (task.task_logs || []).map(dbLogToTaskLog).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    }));
  }

  async getTaskById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    return dbTaskToTask(data);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
    if (Object.keys(updates).length === 0) {
      return false;
    }

    // Convert updates to database format
    const dbUpdates: Partial<TaskUpdate> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.scheduledStartTime !== undefined) dbUpdates.scheduled_start_time = updates.scheduledStartTime || null;
    if (updates.scheduledEndTime !== undefined) dbUpdates.scheduled_end_time = updates.scheduledEndTime || null;
    if (updates.completedTime !== undefined) dbUpdates.completed_time = updates.completedTime || null;
    if (updates.elapsedTime !== undefined) dbUpdates.elapsed_time = updates.elapsedTime;

    const { error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    return true;
  }

  async deleteTask(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }

    return true;
  }

  // Task log operations
  async getTaskLogs(taskId: string): Promise<TaskLog[]> {
    const { data, error } = await supabase
      .from('task_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch task logs: ${error.message}`);
    }

    return data.map(dbLogToTaskLog);
  }

  async addTaskLog(log: TaskLog): Promise<TaskLog> {
    const dbLog = taskLogToDbLog(log);
    const { data, error } = await supabase
      .from('task_logs')
      .insert(dbLog)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add task log: ${error.message}`);
    }

    return dbLogToTaskLog(data);
  }

  async updateTaskLog(logId: string, message: string): Promise<boolean> {
    const { error } = await supabase
      .from('task_logs')
      .update({ message })
      .eq('id', logId);

    if (error) {
      throw new Error(`Failed to update task log: ${error.message}`);
    }

    return true;
  }

  async deleteTaskLog(logId: string): Promise<boolean> {
    const { error } = await supabase
      .from('task_logs')
      .delete()
      .eq('id', logId);

    if (error) {
      throw new Error(`Failed to delete task log: ${error.message}`);
    }

    return true;
  }

  // Helper methods for specific operations
  async startTask(taskId: string): Promise<boolean> {
    const startTime = new Date().toISOString();
    return await this.updateTask(taskId, {
      status: 'in-progress',
      startTime,
      elapsedTime: 0
    });
  }

  async completeTask(taskId: string): Promise<boolean> {
    const completedTime = new Date().toISOString();
    return await this.updateTask(taskId, {
      status: 'completed',
      completedTime
    });
  }
}

// Singleton instance
let dbInstance: TaskDatabase | null = null;

export function getDatabase(): TaskDatabase {
  if (!dbInstance) {
    dbInstance = new TaskDatabase();
  }
  return dbInstance;
}

// Export functions for API routes
export async function initDatabase() {
  // No initialization needed for Supabase - client handles connection
  return;
}

export async function getAllTasks(): Promise<TaskWithLogs[]> {
  return await getDatabase().getAllTasksWithLogs();
}

export async function createTask(data: { title: string; description: string; scheduledStartTime?: string; scheduledEndTime?: string }): Promise<TaskWithLogs> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const taskId = Date.now().toString();

  const task: Task = {
    id: taskId,
    title: data.title,
    description: data.description,
    status: data.scheduledStartTime ? 'scheduled' : 'in-progress',
    startTime: data.scheduledStartTime ? now : now,
    scheduledStartTime: data.scheduledStartTime,
    scheduledEndTime: data.scheduledEndTime,
    elapsedTime: 0
  };

  await db.createTask(task);

  // Add initial log
  const logMessage = data.scheduledStartTime ? 'Task scheduled' : 'Task created and started';
  const log: TaskLog = {
    id: (Date.now() + 1).toString(),
    taskId: taskId,
    message: logMessage,
    timestamp: now,
    isEditable: 1
  };

  await db.addTaskLog(log);

  return {
    ...task,
    logs: [log]
  };
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<TaskWithLogs | null> {
  const db = getDatabase();
  const success = await db.updateTask(taskId, updates);
  if (!success) return null;

  const task = await db.getTaskById(taskId);
  if (!task) return null;

  return {
    ...task,
    logs: await db.getTaskLogs(taskId)
  };
}

export async function deleteTask(taskId: string): Promise<boolean> {
  return await getDatabase().deleteTask(taskId);
}

export async function startTask(taskId: string): Promise<TaskWithLogs | null> {
  const db = getDatabase();
  const success = await db.startTask(taskId);
  if (!success) return null;

  // Add log
  const log: TaskLog = {
    id: Date.now().toString(),
    taskId: taskId,
    message: 'Task started',
    timestamp: new Date().toISOString(),
    isEditable: 1
  };
  await db.addTaskLog(log);

  const task = await db.getTaskById(taskId);
  if (!task) return null;

  return {
    ...task,
    logs: await db.getTaskLogs(taskId)
  };
}

export async function completeTask(taskId: string): Promise<TaskWithLogs | null> {
  const db = getDatabase();
  const success = await db.completeTask(taskId);
  if (!success) return null;

  // Add log
  const log: TaskLog = {
    id: Date.now().toString(),
    taskId: taskId,
    message: 'Task completed',
    timestamp: new Date().toISOString(),
    isEditable: 1
  };
  await db.addTaskLog(log);

  const task = await db.getTaskById(taskId);
  if (!task) return null;

  return {
    ...task,
    logs: await db.getTaskLogs(taskId)
  };
}

export async function addTaskLog(taskId: string, message: string): Promise<TaskLog> {
  const db = getDatabase();
  const log: TaskLog = {
    id: Date.now().toString(),
    taskId: taskId,
    message: message,
    timestamp: new Date().toISOString(),
    isEditable: 1
  };

  return await db.addTaskLog(log);
}

export async function updateTaskLog(taskId: string, logId: string, message: string): Promise<TaskLog | null> {
  const db = getDatabase();
  const success = await db.updateTaskLog(logId, message);
  if (!success) return null;

  const logs = await db.getTaskLogs(taskId);
  return logs.find(log => log.id === logId) || null;
}

export async function deleteTaskLog(taskId: string, logId: string): Promise<boolean> {
  return await getDatabase().deleteTaskLog(logId);
}

export default TaskDatabase;