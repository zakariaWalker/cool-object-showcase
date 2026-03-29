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
      attempts: {
        Row: {
          answer: string | null
          created_at: string
          exercise_id: string | null
          id: string
          is_correct: boolean | null
          metadata: Json | null
          score: number | null
          student_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          is_correct?: boolean | null
          metadata?: Json | null
          score?: number | null
          student_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          is_correct?: boolean | null
          metadata?: Json | null
          score?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "kb_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      built_exams: {
        Row: {
          created_at: string
          duration: number
          format: string
          grade: string
          id: string
          metadata: Json | null
          sections: Json
          status: string
          title: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number
          format?: string
          grade?: string
          id?: string
          metadata?: Json | null
          sections?: Json
          status?: string
          title: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number
          format?: string
          grade?: string
          id?: string
          metadata?: Json | null
          sections?: Json
          status?: string
          title?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      class_enrollments: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          student_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          student_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          curriculum_id: string | null
          id: string
          join_code: string | null
          name: string
          teacher_id: string | null
        }
        Insert: {
          created_at?: string
          curriculum_id?: string | null
          id?: string
          join_code?: string | null
          name: string
          teacher_id?: string | null
        }
        Update: {
          created_at?: string
          curriculum_id?: string | null
          id?: string
          join_code?: string | null
          name?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      curricula: {
        Row: {
          created_at: string
          description: string | null
          grade_level: string | null
          id: string
          is_published: boolean | null
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          grade_level?: string | null
          id?: string
          is_published?: boolean | null
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          grade_level?: string | null
          id?: string
          is_published?: boolean | null
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_analytics: {
        Row: {
          concept_frequency: Json | null
          created_at: string
          difficulty_distribution: Json | null
          id: string
          metadata: Json | null
          topic_frequency: Json | null
          upload_id: string
          user_id: string
        }
        Insert: {
          concept_frequency?: Json | null
          created_at?: string
          difficulty_distribution?: Json | null
          id?: string
          metadata?: Json | null
          topic_frequency?: Json | null
          upload_id: string
          user_id: string
        }
        Update: {
          concept_frequency?: Json | null
          created_at?: string
          difficulty_distribution?: Json | null
          id?: string
          metadata?: Json | null
          topic_frequency?: Json | null
          upload_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_analytics_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "exam_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_blueprints: {
        Row: {
          aggregated_patterns: Json | null
          aggregated_style: Json | null
          change_summary: string | null
          created_at: string | null
          format: string
          grade: string
          id: string
          is_current: boolean | null
          sample_size: number | null
          version: number
        }
        Insert: {
          aggregated_patterns?: Json | null
          aggregated_style?: Json | null
          change_summary?: string | null
          created_at?: string | null
          format: string
          grade: string
          id?: string
          is_current?: boolean | null
          sample_size?: number | null
          version?: number
        }
        Update: {
          aggregated_patterns?: Json | null
          aggregated_style?: Json | null
          change_summary?: string | null
          created_at?: string | null
          format?: string
          grade?: string
          id?: string
          is_current?: boolean | null
          sample_size?: number | null
          version?: number
        }
        Relationships: []
      }
      exam_corrections: {
        Row: {
          answers: Json
          corrected_at: string
          created_at: string
          exam_id: string
          grade: string
          id: string
          percentage: number
          results: Json
          status: string
          student_name: string
          total_possible: number
          total_score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          corrected_at?: string
          created_at?: string
          exam_id: string
          grade?: string
          id?: string
          percentage?: number
          results?: Json
          status?: string
          student_name?: string
          total_possible?: number
          total_score?: number
          user_id: string
        }
        Update: {
          answers?: Json
          corrected_at?: string
          created_at?: string
          exam_id?: string
          grade?: string
          id?: string
          percentage?: number
          results?: Json
          status?: string
          student_name?: string
          total_possible?: number
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_corrections_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "built_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_extracted_questions: {
        Row: {
          bloom_level: number | null
          cognitive_level: string | null
          concept_count: number | null
          concepts: string[] | null
          created_at: string
          difficulty: string | null
          estimated_time_min: number | null
          id: string
          linked_pattern_ids: string[] | null
          points: number | null
          question_number: number
          raw_latex: string | null
          section_label: string
          step_count: number | null
          sub_question: string | null
          text: string
          type: string | null
          upload_id: string
          user_id: string
        }
        Insert: {
          bloom_level?: number | null
          cognitive_level?: string | null
          concept_count?: number | null
          concepts?: string[] | null
          created_at?: string
          difficulty?: string | null
          estimated_time_min?: number | null
          id?: string
          linked_pattern_ids?: string[] | null
          points?: number | null
          question_number: number
          raw_latex?: string | null
          section_label: string
          step_count?: number | null
          sub_question?: string | null
          text: string
          type?: string | null
          upload_id: string
          user_id: string
        }
        Update: {
          bloom_level?: number | null
          cognitive_level?: string | null
          concept_count?: number | null
          concepts?: string[] | null
          created_at?: string
          difficulty?: string | null
          estimated_time_min?: number | null
          id?: string
          linked_pattern_ids?: string[] | null
          points?: number | null
          question_number?: number
          raw_latex?: string | null
          section_label?: string
          step_count?: number | null
          sub_question?: string | null
          text?: string
          type?: string | null
          upload_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_extracted_questions_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "exam_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_kb_entries: {
        Row: {
          created_at: string
          format: string
          grade: string
          id: string
          session: string
          stream: string | null
          user_id: string
          year: string
        }
        Insert: {
          created_at?: string
          format?: string
          grade?: string
          id?: string
          session?: string
          stream?: string | null
          user_id: string
          year?: string
        }
        Update: {
          created_at?: string
          format?: string
          grade?: string
          id?: string
          session?: string
          stream?: string | null
          user_id?: string
          year?: string
        }
        Relationships: []
      }
      exam_kb_questions: {
        Row: {
          bloom_level: number | null
          cognitive_level: string | null
          concept_count: number | null
          concepts: string[] | null
          created_at: string
          difficulty: string
          estimated_time_min: number | null
          exam_id: string
          id: string
          linked_exercise_ids: string[] | null
          linked_pattern_ids: string[] | null
          points: number
          question_number: number
          section_label: string
          step_count: number | null
          sub_question: string | null
          text: string
          type: string
          user_id: string
        }
        Insert: {
          bloom_level?: number | null
          cognitive_level?: string | null
          concept_count?: number | null
          concepts?: string[] | null
          created_at?: string
          difficulty?: string
          estimated_time_min?: number | null
          exam_id: string
          id?: string
          linked_exercise_ids?: string[] | null
          linked_pattern_ids?: string[] | null
          points?: number
          question_number?: number
          section_label?: string
          step_count?: number | null
          sub_question?: string | null
          text: string
          type?: string
          user_id: string
        }
        Update: {
          bloom_level?: number | null
          cognitive_level?: string | null
          concept_count?: number | null
          concepts?: string[] | null
          created_at?: string
          difficulty?: string
          estimated_time_min?: number | null
          exam_id?: string
          id?: string
          linked_exercise_ids?: string[] | null
          linked_pattern_ids?: string[] | null
          points?: number
          question_number?: number
          section_label?: string
          step_count?: number | null
          sub_question?: string | null
          text?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_kb_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exam_kb_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_uploads: {
        Row: {
          created_at: string
          error_message: string | null
          extracted_metadata: Json | null
          extracted_patterns: Json | null
          file_name: string
          file_path: string
          file_size: number | null
          format: string
          grade: string | null
          id: string
          session: string | null
          status: string
          stream: string | null
          updated_at: string
          user_id: string
          year: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted_metadata?: Json | null
          extracted_patterns?: Json | null
          file_name: string
          file_path: string
          file_size?: number | null
          format?: string
          grade?: string | null
          id?: string
          session?: string | null
          status?: string
          stream?: string | null
          updated_at?: string
          user_id: string
          year?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted_metadata?: Json | null
          extracted_patterns?: Json | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          format?: string
          grade?: string | null
          id?: string
          session?: string | null
          status?: string
          stream?: string | null
          updated_at?: string
          user_id?: string
          year?: string | null
        }
        Relationships: []
      }
      exercise_breakdowns: {
        Row: {
          base_score: number | null
          bloom_level: number | null
          cognitive_level: string | null
          concept_count: number | null
          constraints: Json | null
          created_at: string
          diagram_spec: Json | null
          difficulty: number | null
          domain: string | null
          estimated_time_min: number | null
          formulas_needed: Json | null
          grade: string | null
          id: string
          intent: Json | null
          relations: Json | null
          render_plan: Json | null
          scoring_params: Json | null
          semantic_objects: Json | null
          solution_tree: Json | null
          source_language: string | null
          source_origin: string | null
          source_text: string
          step_count: number | null
          subdomain: string | null
        }
        Insert: {
          base_score?: number | null
          bloom_level?: number | null
          cognitive_level?: string | null
          concept_count?: number | null
          constraints?: Json | null
          created_at?: string
          diagram_spec?: Json | null
          difficulty?: number | null
          domain?: string | null
          estimated_time_min?: number | null
          formulas_needed?: Json | null
          grade?: string | null
          id: string
          intent?: Json | null
          relations?: Json | null
          render_plan?: Json | null
          scoring_params?: Json | null
          semantic_objects?: Json | null
          solution_tree?: Json | null
          source_language?: string | null
          source_origin?: string | null
          source_text: string
          step_count?: number | null
          subdomain?: string | null
        }
        Update: {
          base_score?: number | null
          bloom_level?: number | null
          cognitive_level?: string | null
          concept_count?: number | null
          constraints?: Json | null
          created_at?: string
          diagram_spec?: Json | null
          difficulty?: number | null
          domain?: string | null
          estimated_time_min?: number | null
          formulas_needed?: Json | null
          grade?: string | null
          id?: string
          intent?: Json | null
          relations?: Json | null
          render_plan?: Json | null
          scoring_params?: Json | null
          semantic_objects?: Json | null
          solution_tree?: Json | null
          source_language?: string | null
          source_origin?: string | null
          source_text?: string
          step_count?: number | null
          subdomain?: string | null
        }
        Relationships: []
      }
      kb_deconstructions: {
        Row: {
          ai_generated: boolean | null
          created_at: string
          exercise_id: string | null
          id: string
          needs: Json | null
          notes: string | null
          pattern_id: string | null
          steps: Json | null
        }
        Insert: {
          ai_generated?: boolean | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          needs?: Json | null
          notes?: string | null
          pattern_id?: string | null
          steps?: Json | null
        }
        Update: {
          ai_generated?: boolean | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          needs?: Json | null
          notes?: string | null
          pattern_id?: string | null
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
          base_score: number | null
          bloom_level: number | null
          chapter: string | null
          cognitive_level: string | null
          concept_count: number | null
          created_at: string
          difficulty: number | null
          estimated_time_min: number | null
          grade: string | null
          id: string
          label: string | null
          scoring_params: Json | null
          source: string | null
          step_count: number | null
          stream: string | null
          text: string
          type: string | null
        }
        Insert: {
          base_score?: number | null
          bloom_level?: number | null
          chapter?: string | null
          cognitive_level?: string | null
          concept_count?: number | null
          created_at?: string
          difficulty?: number | null
          estimated_time_min?: number | null
          grade?: string | null
          id?: string
          label?: string | null
          scoring_params?: Json | null
          source?: string | null
          step_count?: number | null
          stream?: string | null
          text: string
          type?: string | null
        }
        Update: {
          base_score?: number | null
          bloom_level?: number | null
          chapter?: string | null
          cognitive_level?: string | null
          concept_count?: number | null
          created_at?: string
          difficulty?: number | null
          estimated_time_min?: number | null
          grade?: string | null
          id?: string
          label?: string | null
          scoring_params?: Json | null
          source?: string | null
          step_count?: number | null
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
          id?: string
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
      lessons: {
        Row: {
          content: string | null
          created_at: string
          curriculum_id: string | null
          id: string
          is_published: boolean | null
          lesson_type: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          curriculum_id?: string | null
          id?: string
          is_published?: boolean | null
          lesson_type?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          curriculum_id?: string | null
          id?: string
          is_published?: boolean | null
          lesson_type?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          parent_id: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string | null
          student_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
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
          xp_earned: number | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          student_id: string
          xp_earned?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          student_id?: string
          xp_earned?: number | null
        }
        Relationships: []
      }
      student_join_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          student_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          student_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          student_id?: string | null
        }
        Relationships: []
      }
      student_knowledge_gaps: {
        Row: {
          detected_at: string
          id: string
          severity: string | null
          student_id: string
          topic: string
        }
        Insert: {
          detected_at?: string
          id?: string
          severity?: string | null
          student_id: string
          topic: string
        }
        Update: {
          detected_at?: string
          id?: string
          severity?: string | null
          student_id?: string
          topic?: string
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          badges: Json | null
          created_at: string
          id: string
          last_active_date: string | null
          level: number | null
          mastery: Json | null
          streak_days: number | null
          student_id: string
          total_correct: number | null
          total_exercises: number | null
          updated_at: string
          xp: number | null
        }
        Insert: {
          badges?: Json | null
          created_at?: string
          id?: string
          last_active_date?: string | null
          level?: number | null
          mastery?: Json | null
          streak_days?: number | null
          student_id: string
          total_correct?: number | null
          total_exercises?: number | null
          updated_at?: string
          xp?: number | null
        }
        Update: {
          badges?: Json | null
          created_at?: string
          id?: string
          last_active_date?: string | null
          level?: number | null
          mastery?: Json | null
          streak_days?: number | null
          student_id?: string
          total_correct?: number | null
          total_exercises?: number | null
          updated_at?: string
          xp?: number | null
        }
        Relationships: []
      }
      student_sm2: {
        Row: {
          created_at: string
          ease_factor: number | null
          exercise_id: string | null
          id: string
          interval: number | null
          next_review: string | null
          repetitions: number | null
          student_id: string
        }
        Insert: {
          created_at?: string
          ease_factor?: number | null
          exercise_id?: string | null
          id?: string
          interval?: number | null
          next_review?: string | null
          repetitions?: number | null
          student_id: string
        }
        Update: {
          created_at?: string
          ease_factor?: number | null
          exercise_id?: string | null
          id?: string
          interval?: number | null
          next_review?: string | null
          repetitions?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_sm2_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "kb_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      app_role:
        | "admin"
        | "teacher"
        | "student"
        | "parent"
        | "moderator"
        | "user"
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
      app_role: ["admin", "teacher", "student", "parent", "moderator", "user"],
    },
  },
} as const
