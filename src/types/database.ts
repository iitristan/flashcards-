/**
 * Database schema types for Supabase migration readiness.
 * Matches the relational structure needed when moving from LocalStorage to PostgreSQL / Supabase.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          daily_goal: number;
          study_streak: number;
          last_study_date: string | null;
          theme: string;
          sound_enabled: boolean;
          timer_duration: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          daily_goal?: number;
          study_streak?: number;
          last_study_date?: string | null;
          theme?: string;
          sound_enabled?: boolean;
          timer_duration?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      decks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          category: string;
          icon: string;
          color: string;
          tags: string[];
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          category?: string;
          icon?: string;
          color?: string;
          tags?: string[];
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['decks']['Insert']>;
      };
      flashcards: {
        Row: {
          id: string;
          deck_id: string;
          front: string;
          back: string;
          rationale: string;
          options: string[] | null;
          tags: string[];
          difficulty: string;
          leitner_box: number;
          interval: number;
          ease_factor: number;
          repetitions: number;
          due_date: string;
          last_reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deck_id: string;
          front: string;
          back: string;
          rationale?: string;
          options?: string[] | null;
          tags?: string[];
          difficulty?: string;
          leitner_box?: number;
          interval?: number;
          ease_factor?: number;
          repetitions?: number;
          due_date?: string;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['flashcards']['Insert']>;
      };
      study_logs: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          deck_id: string;
          mode: string;
          rating: string | null;
          is_correct: boolean;
          time_spent_seconds: number;
          verdict: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id: string;
          deck_id: string;
          mode: string;
          rating?: string | null;
          is_correct: boolean;
          time_spent_seconds?: number;
          verdict?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['study_logs']['Insert']>;
      };
    };
  };
}
