export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          timezone: string
          quiet_start: string | null
          quiet_end: string | null
          focus_minutes: number
          break_minutes: number
          long_break_minutes: number
          notify_push: boolean
          default_reminder_rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          timezone?: string
          quiet_start?: string | null
          quiet_end?: string | null
          focus_minutes?: number
          break_minutes?: number
          long_break_minutes?: number
          notify_push?: boolean
          default_reminder_rules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          timezone?: string
          quiet_start?: string | null
          quiet_end?: string | null
          focus_minutes?: number
          break_minutes?: number
          long_break_minutes?: number
          notify_push?: boolean
          default_reminder_rules?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          user_id: string
          name: string
          code: string | null
          color: string
          term: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          code?: string | null
          color?: string
          term?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          code?: string | null
          color?: string
          term?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_meetings: {
        Row: {
          id: string
          user_id: string
          course_id: string
          weekday: number
          start_time: string
          end_time: string
          location: string | null
          remind_minutes_before: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          course_id: string
          weekday: number
          start_time: string
          end_time: string
          location?: string | null
          remind_minutes_before?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          weekday?: number
          start_time?: string
          end_time?: string
          location?: string | null
          remind_minutes_before?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_meetings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          course_id: string | null
          title: string
          notes: string | null
          type: 'assignment' | 'exam' | 'quiz' | 'reading' | 'project' | 'study'
          priority: 'low' | 'medium' | 'high'
          due_at: string | null
          estimated_minutes: number | null
          status: 'todo' | 'in_progress' | 'done'
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          course_id?: string | null
          title: string
          notes?: string | null
          type?: 'assignment' | 'exam' | 'quiz' | 'reading' | 'project' | 'study'
          priority?: 'low' | 'medium' | 'high'
          due_at?: string | null
          estimated_minutes?: number | null
          status?: 'todo' | 'in_progress' | 'done'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string | null
          title?: string
          notes?: string | null
          type?: 'assignment' | 'exam' | 'quiz' | 'reading' | 'project' | 'study'
          priority?: 'low' | 'medium' | 'high'
          due_at?: string | null
          estimated_minutes?: number | null
          status?: 'todo' | 'in_progress' | 'done'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          task_id: string | null
          class_meeting_id: string | null
          remind_at: string
          source: 'rule' | 'custom' | 'class'
          status: 'pending' | 'sent' | 'dismissed' | 'cancelled'
          snoozed_until: string | null
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          task_id?: string | null
          class_meeting_id?: string | null
          remind_at: string
          source?: 'rule' | 'custom' | 'class'
          status?: 'pending' | 'sent' | 'dismissed' | 'cancelled'
          snoozed_until?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string | null
          class_meeting_id?: string | null
          remind_at?: string
          source?: 'rule' | 'custom' | 'class'
          status?: 'pending' | 'sent' | 'dismissed' | 'cancelled'
          snoozed_until?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_class_meeting_id_fkey"
            columns: ["class_meeting_id"]
            isOneToOne: false
            referencedRelation: "class_meetings"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          reminder_id: string
          title: string
          body: string
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          reminder_id: string
          title: string
          body: string
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          reminder_id?: string
          title?: string
          body?: string
          created_at?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          id: string
          user_id: string
          task_id: string | null
          started_at: string
          ended_at: string | null
          planned_minutes: number
          actual_minutes: number | null
          status: 'running' | 'completed' | 'abandoned'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          task_id?: string | null
          started_at?: string
          ended_at?: string | null
          planned_minutes: number
          actual_minutes?: number | null
          status?: 'running' | 'completed' | 'abandoned'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string | null
          started_at?: string
          ended_at?: string | null
          planned_minutes?: number
          actual_minutes?: number | null
          status?: 'running' | 'completed' | 'abandoned'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      snooze_reminder: {
        Args: { reminder_id: string; minutes: number }
        Returns: Database['public']['Tables']['reminders']['Row']
      }
      dismiss_reminder: {
        Args: { reminder_id: string }
        Returns: Database['public']['Tables']['reminders']['Row']
      }
      complete_task: {
        Args: { task_id: string }
        Returns: Database['public']['Tables']['tasks']['Row']
      }
      start_focus: {
        Args: { task_id?: string | null; planned_minutes: number }
        Returns: Database['public']['Tables']['focus_sessions']['Row']
      }
      finish_focus: {
        Args: { session_id: string; status: 'completed' | 'abandoned' }
        Returns: Database['public']['Tables']['focus_sessions']['Row']
      }
      get_agenda: {
        Args: { from_ts: string; to_ts: string }
        Returns: {
          type: 'class' | 'task' | 'reminder'
          id: string
          title: string
          starts_at: string
          ends_at: string | null
          meta: Json
        }[]
      }
      get_dashboard_summary: {
        Args: Record<string, never>
        Returns: {
          tasks_completed_this_week: number
          focus_minutes_this_week: number
          current_streak: number
          next_deadlines: Json
        }
      }
      claim_due_reminders: {
        Args: { batch_size?: number }
        Returns: Database['public']['Tables']['reminders']['Row'][]
      }
      sync_due_notifications: {
        Args: Record<string, never>
        Returns: {
          status: string
          synced: number
          timezone: string
        }
      }
    }
    Enums: {
      task_type: 'assignment' | 'exam' | 'quiz' | 'reading' | 'project' | 'study'
      task_priority: 'low' | 'medium' | 'high'
      task_status: 'todo' | 'in_progress' | 'done'
      reminder_status: 'pending' | 'sent' | 'dismissed' | 'cancelled'
      reminder_source: 'rule' | 'custom' | 'class'
      focus_status: 'running' | 'completed' | 'abandoned'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
