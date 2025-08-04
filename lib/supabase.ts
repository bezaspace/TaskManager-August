import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for better TypeScript support
export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: 'scheduled' | 'in-progress' | 'completed';
          start_time: string;
          scheduled_start_time: string | null;
          scheduled_end_time: string | null;
          completed_time: string | null;
          elapsed_time: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          status: 'scheduled' | 'in-progress' | 'completed';
          start_time: string;
          scheduled_start_time?: string | null;
          scheduled_end_time?: string | null;
          completed_time?: string | null;
          elapsed_time?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: 'scheduled' | 'in-progress' | 'completed';
          start_time?: string;
          scheduled_start_time?: string | null;
          scheduled_end_time?: string | null;
          completed_time?: string | null;
          elapsed_time?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      task_logs: {
        Row: {
          id: string;
          task_id: string;
          message: string;
          timestamp: string;
          is_editable: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          task_id: string;
          message: string;
          timestamp: string;
          is_editable?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          message?: string;
          timestamp?: string;
          is_editable?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export type TaskLogRow = Database['public']['Tables']['task_logs']['Row'];
export type TaskLogInsert = Database['public']['Tables']['task_logs']['Insert'];
export type TaskLogUpdate = Database['public']['Tables']['task_logs']['Update'];