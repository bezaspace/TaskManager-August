import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { supabase } from '../lib/supabase';

interface SQLiteTask {
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

interface SQLiteTaskLog {
  id: string;
  taskId: string;
  message: string;
  timestamp: string;
  isEditable: number;
}

async function migrateSQLiteToSupabase() {
  const dbPath = path.join(process.cwd(), 'tasks.db');
  
  if (!fs.existsSync(dbPath)) {
    console.log('No SQLite database found at tasks.db');
    return;
  }

  console.log('Starting migration from SQLite to Supabase...');

  return new Promise<void>((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        // Fetch all tasks
        const tasks = await new Promise<SQLiteTask[]>((resolveQuery, rejectQuery) => {
          db.all('SELECT * FROM tasks ORDER BY startTime DESC', (err, rows: any[]) => {
            if (err) rejectQuery(err);
            else resolveQuery(rows);
          });
        });

        // Fetch all task logs
        const taskLogs = await new Promise<SQLiteTaskLog[]>((resolveQuery, rejectQuery) => {
          db.all('SELECT * FROM task_logs ORDER BY timestamp ASC', (err, rows: any[]) => {
            if (err) rejectQuery(err);
            else resolveQuery(rows);
          });
        });

        console.log(`Found ${tasks.length} tasks and ${taskLogs.length} logs to migrate`);

        // Migrate tasks
        if (tasks.length > 0) {
          const supabaseTasks = tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            start_time: task.startTime,
            scheduled_start_time: task.scheduledStartTime || null,
            scheduled_end_time: task.scheduledEndTime || null,
            completed_time: task.completedTime || null,
            elapsed_time: task.elapsedTime || 0,
          }));

          const { error: tasksError } = await supabase
            .from('tasks')
            .upsert(supabaseTasks);

          if (tasksError) {
            throw new Error(`Failed to migrate tasks: ${tasksError.message}`);
          }

          console.log(`Successfully migrated ${tasks.length} tasks`);
        }

        // Migrate task logs
        if (taskLogs.length > 0) {
          const supabaseTaskLogs = taskLogs.map(log => ({
            id: log.id,
            task_id: log.taskId,
            message: log.message,
            timestamp: log.timestamp,
            is_editable: log.isEditable === 1,
          }));

          const { error: logsError } = await supabase
            .from('task_logs')
            .upsert(supabaseTaskLogs);

          if (logsError) {
            throw new Error(`Failed to migrate task logs: ${logsError.message}`);
          }

          console.log(`Successfully migrated ${taskLogs.length} task logs`);
        }

        // Close SQLite connection
        db.close((err) => {
          if (err) {
            console.error('Error closing SQLite database:', err);
          } else {
            console.log('SQLite database connection closed');
          }
        });

        console.log('Migration completed successfully!');
        console.log('You can now safely remove the tasks.db file');
        resolve();

      } catch (error) {
        console.error('Migration failed:', error);
        reject(error);
      }
    });
  });
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateSQLiteToSupabase()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateSQLiteToSupabase };