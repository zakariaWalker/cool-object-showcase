export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      exercise_breakdowns: {
        Row: {
          constraints: Json | null
          created_at: string
          diagram_spec: Json | null
          difficulty: number | null
          domain: string | null
          formulas_needed: Json | null
          grade: string | null
          id: string
          intent: Json | null
          relations: Json | null
          render_plan: Json | null
          semantic_objects: Json | null
          solution_tree: Json | null
          source_language: string | null
          source_origin: string | null
          source_text: string
          subdomain: string | null
        }
        Insert: {
          constraints?: Json | null
          created_at?: string
          diagram_spec?: Json | null
          difficulty?: number | null
          domain?: string | null
          formulas_needed?: Json | null
          grade?: string | null
          id: string
          intent?: Json | null
          relations?: Json | null
          render_plan?: Json | null
          semantic_objects?: Json | null
          solution_tree?: Json | null
          source_language?: string | null
          source_origin?: string | null
          source_text: string
          subdomain?: string | null
        }
        Update: {
          constraints?: Json | null
          created_at?: string
          diagram_spec?: Json | null
          difficulty?: number | null
          domain?: string | null
          formulas_needed?: Json | null
          grade?: string | null
          id?: string
          intent?: Json | null
          relations?: Json | null
          render_plan?: Json | null
          semantic_objects?: Json | null
          solution_tree?: Json | null
          source_language?: string | null
          source_origin?: string | null
          source_text?: string
          subdomain?: string | null
        }
        Relationships: []
      }
      kb_deconstructions: {
        Row: {
          ai_generated: boolean | null
          created_at: string
          exercise_id: string
          id: string
          needs: Json | null
          notes: string | null
          pattern_id: string
          steps: Json | null
        }
        Insert: {
          ai_generated?: boolean | null
          created_at?: string
          exercise_id: string
          id?: string
          needs?: Json | null
          notes?: string | null
          pattern_id: string
          steps?: Json | null
        }
        Update: {
          ai_generated?: boolean | null
          created_at?: string
          exercise_id?: string
          id?: string
          needs?: Json | null
          notes?: string | null
          pattern_id?: string
          steps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_deconstructions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "kb_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_deconstructions_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "kb_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_exercises: {
        Row: {
          ai_deconstructed: boolean | null
          chapter: string | null
          created_at: string
          grade: string | null
          id: string
          label: string | null
          source: string | null
          stream: string | null
          text: string
          type: string | null
        }
        Insert: {
          ai_deconstructed?: boolean | null
          chapter?: string | null
          created_at?: string
          grade?: string | null
          id: string
          label?: string | null
          source?: string | null
          stream?: string | null
          text: string
          type?: string | null
        }
        Update: {
          ai_deconstructed?: boolean | null
          chapter?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          label?: string | null
          source?: string | null
          stream?: string | null
          text?: string
          type?: string | null
        }
        Relationships: []
      }
      kb_patterns: {
        Row: {
          concepts: Json | null
          created_at: string
          description: string | null
          id: string
          name: string
          steps: Json | null
          type: string | null
        }
        Insert: {
          concepts?: Json | null
          created_at?: string
          description?: string | null
          id: string
          name: string
          steps?: Json | null
          type?: string | null
        }
        Update: {
          concepts?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          steps?: Json | null
          type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          grade: string
          id: string
          stream: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          grade?: string
          id: string
          stream?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          grade?: string
          id?: string
          stream?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          student_id: string
          xp_earned: number
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          student_id: string
          xp_earned?: number
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          student_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          badges: Json
          created_at: string
          daily_challenge_completed: boolean
          daily_challenge_date: string | null
          id: string
          last_active_date: string | null
          level: number
          mastery: Json
          streak_days: number
          student_id: string
          total_correct: number
          total_exercises: number
          updated_at: string
          xp: number
        }
        Insert: {
          badges?: Json
          created_at?: string
          daily_challenge_completed?: boolean
          daily_challenge_date?: string | null
          id?: string
          last_active_date?: string | null
          level?: number
          mastery?: Json
          streak_days?: number
          student_id: string
          total_correct?: number
          total_exercises?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          badges?: Json
          created_at?: string
          daily_challenge_completed?: boolean
          daily_challenge_date?: string | null
          id?: string
          last_active_date?: string | null
          level?: number
          mastery?: Json
          streak_days?: number
          student_id?: string
          total_correct?: number
          total_exercises?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "teacher" | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student", "teacher", "parent"],
    },
  },
} as const
