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
      anonymous_gap_links: {
        Row: {
          anonymous_id: string
          attempts_moved: number
          gaps_moved: number
          id: string
          migrated_at: string
          misconceptions_moved: number
          user_id: string
        }
        Insert: {
          anonymous_id: string
          attempts_moved?: number
          gaps_moved?: number
          id?: string
          migrated_at?: string
          misconceptions_moved?: number
          user_id: string
        }
        Update: {
          anonymous_id?: string
          attempts_moved?: number
          gaps_moved?: number
          id?: string
          migrated_at?: string
          misconceptions_moved?: number
          user_id?: string
        }
        Relationships: []
      }
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
      countries: {
        Row: {
          code: string
          created_at: string
          curriculum_framework: string | null
          flag_emoji: string | null
          is_active: boolean
          name_ar: string
          name_en: string
          primary_language: string
        }
        Insert: {
          code: string
          created_at?: string
          curriculum_framework?: string | null
          flag_emoji?: string | null
          is_active?: boolean
          name_ar: string
          name_en: string
          primary_language?: string
        }
        Update: {
          code?: string
          created_at?: string
          curriculum_framework?: string | null
          flag_emoji?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string
          primary_language?: string
        }
        Relationships: []
      }
      country_grades: {
        Row: {
          country_code: string
          created_at: string
          cycle: string | null
          grade_code: string
          grade_label_ar: string
          grade_label_en: string | null
          id: string
          order_index: number
        }
        Insert: {
          country_code: string
          created_at?: string
          cycle?: string | null
          grade_code: string
          grade_label_ar: string
          grade_label_en?: string | null
          id?: string
          order_index?: number
        }
        Update: {
          country_code?: string
          created_at?: string
          cycle?: string | null
          grade_code?: string
          grade_label_ar?: string
          grade_label_en?: string | null
          id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "country_grades_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
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
      curriculum_mappings: {
        Row: {
          chapter_label: string | null
          country_code: string
          created_at: string
          grade_code: string
          id: string
          notes: string | null
          order_in_curriculum: number | null
          semester: number | null
          skill_id: string
        }
        Insert: {
          chapter_label?: string | null
          country_code: string
          created_at?: string
          grade_code: string
          id?: string
          notes?: string | null
          order_in_curriculum?: number | null
          semester?: number | null
          skill_id: string
        }
        Update: {
          chapter_label?: string | null
          country_code?: string
          created_at?: string
          grade_code?: string
          id?: string
          notes?: string | null
          order_in_curriculum?: number | null
          semester?: number | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_mappings_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "curriculum_mappings_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_cache: {
        Row: {
          cache_key: string
          country_code: string
          created_at: string
          exercises: Json
          expires_at: string
          id: string
          level: string
          source: string
        }
        Insert: {
          cache_key: string
          country_code: string
          created_at?: string
          exercises?: Json
          expires_at?: string
          id?: string
          level: string
          source?: string
        }
        Update: {
          cache_key?: string
          country_code?: string
          created_at?: string
          exercises?: Json
          expires_at?: string
          id?: string
          level?: string
          source?: string
        }
        Relationships: []
      }
      diagnostic_question_flags: {
        Row: {
          country_code: string
          created_at: string
          flagged_by: string | null
          grade_code: string
          id: string
          notes: string | null
          question_hash: string
          question_preview: string
          reason: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          flagged_by?: string | null
          grade_code: string
          id?: string
          notes?: string | null
          question_hash: string
          question_preview: string
          reason?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          flagged_by?: string | null
          grade_code?: string
          id?: string
          notes?: string | null
          question_hash?: string
          question_preview?: string
          reason?: string
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
      exam_kb_question_skill_links: {
        Row: {
          created_at: string
          exam_question_id: string
          id: string
          relevance_score: number | null
          skill_id: string
        }
        Insert: {
          created_at?: string
          exam_question_id: string
          id?: string
          relevance_score?: number | null
          skill_id: string
        }
        Update: {
          created_at?: string
          exam_question_id?: string
          id?: string
          relevance_score?: number | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_kb_question_skill_links_exam_question_id_fkey"
            columns: ["exam_question_id"]
            isOneToOne: false
            referencedRelation: "exam_kb_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_kb_question_skill_links_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
            referencedColumns: ["id"]
          },
        ]
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
      exercise_reports: {
        Row: {
          created_at: string | null
          description: string | null
          exercise_id: string
          id: string
          issue_type: string
          status: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          exercise_id: string
          id?: string
          issue_type: string
          status?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          exercise_id?: string
          id?: string
          issue_type?: string
          status?: string | null
          student_id?: string | null
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          anonymous_id: string | null
          created_at: string
          event_name: string
          id: string
          path: string | null
          properties: Json
          referrer: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          path?: string | null
          properties?: Json
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          path?: string | null
          properties?: Json
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      kb_course_skill_links: {
        Row: {
          course_id: string
          created_at: string
          id: string
          order_index: number | null
          skill_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          order_index?: number | null
          skill_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          order_index?: number | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_course_skill_links_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "kb_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_course_skill_links_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_courses: {
        Row: {
          created_at: string
          description: string | null
          extracted_skills: Json | null
          file_path: string | null
          grade: string | null
          id: string
          source_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          extracted_skills?: Json | null
          file_path?: string | null
          grade?: string | null
          id?: string
          source_type?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          extracted_skills?: Json | null
          file_path?: string | null
          grade?: string | null
          id?: string
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kb_deconstructions: {
        Row: {
          ai_generated: boolean | null
          country_code: string
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
          country_code?: string
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
          country_code?: string
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
      kb_embeddings: {
        Row: {
          content_id: string
          content_text: string
          content_type: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          content_id: string
          content_text: string
          content_type: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_text?: string
          content_type?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      kb_exercises: {
        Row: {
          base_score: number | null
          bloom_level: number | null
          chapter: string | null
          cognitive_level: string | null
          concept_count: number | null
          country_code: string
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
          country_code?: string
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
          country_code?: string
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
      kb_figures: {
        Row: {
          created_at: string
          description: string | null
          exercise_id: string
          figure_type: string
          id: string
          spec: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exercise_id: string
          figure_type: string
          id?: string
          spec?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exercise_id?: string
          figure_type?: string
          id?: string
          spec?: Json
          updated_at?: string
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
      kb_skill_dependencies: {
        Row: {
          created_at: string
          dependency_type: string
          from_skill_id: string
          id: string
          strength: number | null
          to_skill_id: string
        }
        Insert: {
          created_at?: string
          dependency_type?: string
          from_skill_id: string
          id?: string
          strength?: number | null
          to_skill_id: string
        }
        Update: {
          created_at?: string
          dependency_type?: string
          from_skill_id?: string
          id?: string
          strength?: number | null
          to_skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_skill_dependencies_from_skill_id_fkey"
            columns: ["from_skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_skill_dependencies_to_skill_id_fkey"
            columns: ["to_skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_skill_errors: {
        Row: {
          created_at: string
          error_description: string
          error_type: string | null
          fix_hint: string | null
          frequency: number | null
          id: string
          severity: string | null
          skill_id: string
        }
        Insert: {
          created_at?: string
          error_description: string
          error_type?: string | null
          fix_hint?: string | null
          frequency?: number | null
          id?: string
          severity?: string | null
          skill_id: string
        }
        Update: {
          created_at?: string
          error_description?: string
          error_type?: string | null
          fix_hint?: string | null
          frequency?: number | null
          id?: string
          severity?: string | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_skill_errors_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_skill_exercise_links: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          skill_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_skill_exercise_links_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "kb_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_skill_exercise_links_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_skill_pattern_links: {
        Row: {
          created_at: string
          id: string
          pattern_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pattern_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pattern_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_skill_pattern_links_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "kb_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_skill_pattern_links_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_skills: {
        Row: {
          bloom_level: number | null
          created_at: string
          description: string | null
          difficulty: number | null
          domain: string | null
          frequency: number | null
          grade: string | null
          id: string
          is_universal: boolean
          metadata: Json | null
          name: string
          name_ar: string | null
          subdomain: string | null
        }
        Insert: {
          bloom_level?: number | null
          created_at?: string
          description?: string | null
          difficulty?: number | null
          domain?: string | null
          frequency?: number | null
          grade?: string | null
          id?: string
          is_universal?: boolean
          metadata?: Json | null
          name: string
          name_ar?: string | null
          subdomain?: string | null
        }
        Update: {
          bloom_level?: number | null
          created_at?: string
          description?: string | null
          difficulty?: number | null
          domain?: string | null
          frequency?: number | null
          grade?: string | null
          id?: string
          is_universal?: boolean
          metadata?: Json | null
          name?: string
          name_ar?: string | null
          subdomain?: string | null
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
      misconception_counters: {
        Row: {
          count: number
          created_at: string
          id: string
          last_seen_at: string
          misconception_type: string
          student_id: string
          updated_at: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          last_seen_at?: string
          misconception_type: string
          student_id: string
          updated_at?: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          last_seen_at?: string
          misconception_type?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      misconception_skill_map: {
        Row: {
          created_at: string
          domain: string
          id: string
          misconception_type: string
          severity: string
          skill_id: string | null
          skill_name: string
          threshold: number
          topic_ar: string
        }
        Insert: {
          created_at?: string
          domain?: string
          id?: string
          misconception_type: string
          severity?: string
          skill_id?: string | null
          skill_name: string
          threshold?: number
          topic_ar: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          misconception_type?: string
          severity?: string
          skill_id?: string | null
          skill_name?: string
          threshold?: number
          topic_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "misconception_skill_map_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
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
          country_code: string | null
          created_at: string
          full_name: string | null
          grade_code: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          full_name?: string | null
          grade_code?: string | null
          id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          full_name?: string | null
          grade_code?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      question_template_variants: {
        Row: {
          answer: string
          bloom_level: number
          created_at: string
          difficulty: number
          grade_code: string
          id: string
          is_active: boolean
          kind: string
          options: Json
          question_text: string
          skill_id: string | null
          template_id: string
          variables_used: Json
          variant_hash: string
        }
        Insert: {
          answer: string
          bloom_level?: number
          created_at?: string
          difficulty?: number
          grade_code?: string
          id?: string
          is_active?: boolean
          kind?: string
          options?: Json
          question_text: string
          skill_id?: string | null
          template_id: string
          variables_used?: Json
          variant_hash: string
        }
        Update: {
          answer?: string
          bloom_level?: number
          created_at?: string
          difficulty?: number
          grade_code?: string
          id?: string
          is_active?: boolean
          kind?: string
          options?: Json
          question_text?: string
          skill_id?: string | null
          template_id?: string
          variables_used?: Json
          variant_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_template_variants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "question_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      question_templates: {
        Row: {
          answer_expression: string
          answer_unit: string | null
          bloom_level: number
          constraints: Json
          country_code: string
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: number
          distractor_expressions: Json
          domain: string
          grade_code: string
          hint: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          skill_id: string | null
          solution_template: string | null
          subdomain: string | null
          template_text: string
          updated_at: string
          variables: Json
        }
        Insert: {
          answer_expression?: string
          answer_unit?: string | null
          bloom_level?: number
          constraints?: Json
          country_code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: number
          distractor_expressions?: Json
          domain?: string
          grade_code?: string
          hint?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          skill_id?: string | null
          solution_template?: string | null
          subdomain?: string | null
          template_text: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          answer_expression?: string
          answer_unit?: string | null
          bloom_level?: number
          constraints?: Json
          country_code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: number
          distractor_expressions?: Json
          domain?: string
          grade_code?: string
          hint?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          skill_id?: string | null
          solution_template?: string | null
          subdomain?: string | null
          template_text?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "question_templates_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
            referencedColumns: ["id"]
          },
        ]
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
          last_occurred_at: string
          misconception_type: string | null
          occurrence_count: number
          resolved: boolean
          severity: string | null
          skill_id: string | null
          student_id: string
          topic: string
        }
        Insert: {
          detected_at?: string
          id?: string
          last_occurred_at?: string
          misconception_type?: string | null
          occurrence_count?: number
          resolved?: boolean
          severity?: string | null
          skill_id?: string | null
          student_id: string
          topic: string
        }
        Update: {
          detected_at?: string
          id?: string
          last_occurred_at?: string
          misconception_type?: string | null
          occurrence_count?: number
          resolved?: boolean
          severity?: string | null
          skill_id?: string | null
          student_id?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_knowledge_gaps_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
            referencedColumns: ["id"]
          },
        ]
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
      textbook_activities: {
        Row: {
          activity_type: string
          answer_type: string | null
          bloom_level: number | null
          content_latex: string | null
          content_text: string
          created_at: string
          difficulty: number | null
          expected_answer: string | null
          hints: string[] | null
          id: string
          is_interactive: boolean | null
          lesson_id: string
          metadata: Json | null
          order_index: number
          solution_latex: string | null
          solution_text: string | null
          title: string | null
          title_ar: string | null
        }
        Insert: {
          activity_type?: string
          answer_type?: string | null
          bloom_level?: number | null
          content_latex?: string | null
          content_text?: string
          created_at?: string
          difficulty?: number | null
          expected_answer?: string | null
          hints?: string[] | null
          id?: string
          is_interactive?: boolean | null
          lesson_id: string
          metadata?: Json | null
          order_index?: number
          solution_latex?: string | null
          solution_text?: string | null
          title?: string | null
          title_ar?: string | null
        }
        Update: {
          activity_type?: string
          answer_type?: string | null
          bloom_level?: number | null
          content_latex?: string | null
          content_text?: string
          created_at?: string
          difficulty?: number | null
          expected_answer?: string | null
          hints?: string[] | null
          id?: string
          is_interactive?: boolean | null
          lesson_id?: string
          metadata?: Json | null
          order_index?: number
          solution_latex?: string | null
          solution_text?: string | null
          title?: string | null
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "textbook_activities_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "textbook_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      textbook_chapters: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          metadata: Json | null
          order_index: number
          page_end: number | null
          page_start: number | null
          slug: string | null
          textbook_id: string
          title: string
          title_ar: string | null
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          metadata?: Json | null
          order_index?: number
          page_end?: number | null
          page_start?: number | null
          slug?: string | null
          textbook_id: string
          title: string
          title_ar?: string | null
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          metadata?: Json | null
          order_index?: number
          page_end?: number | null
          page_start?: number | null
          slug?: string | null
          textbook_id?: string
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "textbook_chapters_textbook_id_fkey"
            columns: ["textbook_id"]
            isOneToOne: false
            referencedRelation: "textbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      textbook_exercises: {
        Row: {
          answer_type: string | null
          bloom_level: number | null
          chapter_id: string | null
          concepts: string[] | null
          created_at: string
          difficulty: number | null
          domain: string | null
          exercise_number: string | null
          expected_answer: string | null
          hints: string[] | null
          id: string
          lesson_id: string | null
          metadata: Json | null
          order_index: number
          questions: Json
          solution: string | null
          solution_latex: string | null
          statement: string
          statement_latex: string | null
          textbook_id: string
        }
        Insert: {
          answer_type?: string | null
          bloom_level?: number | null
          chapter_id?: string | null
          concepts?: string[] | null
          created_at?: string
          difficulty?: number | null
          domain?: string | null
          exercise_number?: string | null
          expected_answer?: string | null
          hints?: string[] | null
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          order_index?: number
          questions?: Json
          solution?: string | null
          solution_latex?: string | null
          statement: string
          statement_latex?: string | null
          textbook_id: string
        }
        Update: {
          answer_type?: string | null
          bloom_level?: number | null
          chapter_id?: string | null
          concepts?: string[] | null
          created_at?: string
          difficulty?: number | null
          domain?: string | null
          exercise_number?: string | null
          expected_answer?: string | null
          hints?: string[] | null
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          order_index?: number
          questions?: Json
          solution?: string | null
          solution_latex?: string | null
          statement?: string
          statement_latex?: string | null
          textbook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "textbook_exercises_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "textbook_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "textbook_exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "textbook_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "textbook_exercises_textbook_id_fkey"
            columns: ["textbook_id"]
            isOneToOne: false
            referencedRelation: "textbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      textbook_lessons: {
        Row: {
          chapter_id: string
          content_html: string | null
          content_latex: string | null
          created_at: string
          id: string
          metadata: Json | null
          objectives: string[] | null
          order_index: number
          page_end: number | null
          page_start: number | null
          slug: string | null
          title: string
          title_ar: string | null
        }
        Insert: {
          chapter_id: string
          content_html?: string | null
          content_latex?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          objectives?: string[] | null
          order_index?: number
          page_end?: number | null
          page_start?: number | null
          slug?: string | null
          title: string
          title_ar?: string | null
        }
        Update: {
          chapter_id?: string
          content_html?: string | null
          content_latex?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          objectives?: string[] | null
          order_index?: number
          page_end?: number | null
          page_start?: number | null
          slug?: string | null
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "textbook_lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "textbook_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      textbook_skill_links: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          relevance_score: number | null
          skill_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          relevance_score?: number | null
          skill_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          relevance_score?: number | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "textbook_skill_links_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "textbook_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "textbook_skill_links_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "kb_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      textbooks: {
        Row: {
          country_code: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          file_path: string | null
          grade: string
          id: string
          is_public: boolean
          metadata: Json | null
          processing_log: Json | null
          processing_progress: number | null
          slug: string | null
          status: string
          subject: string
          title: string
          total_pages: number | null
          updated_at: string
          user_id: string
          year: string | null
        }
        Insert: {
          country_code?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          grade?: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          processing_log?: Json | null
          processing_progress?: number | null
          slug?: string | null
          status?: string
          subject?: string
          title: string
          total_pages?: number | null
          updated_at?: string
          user_id: string
          year?: string | null
        }
        Update: {
          country_code?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          grade?: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          processing_log?: Json | null
          processing_progress?: number | null
          slug?: string | null
          status?: string
          subject?: string
          title?: string
          total_pages?: number | null
          updated_at?: string
          user_id?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "textbooks_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
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
      match_kb_embeddings: {
        Args: {
          filter_type?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content_id: string
          content_text: string
          content_type: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      migrate_anonymous_data: { Args: { _anonymous_id: string }; Returns: Json }
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
