-- Add pedagogical fields to exam_extracted_questions
ALTER TABLE public.exam_extracted_questions
ADD COLUMN IF NOT EXISTS cognitive_level text DEFAULT 'apply',
ADD COLUMN IF NOT EXISTS bloom_level integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS estimated_time_min numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS step_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS concept_count integer DEFAULT 0;

-- Add pedagogical fields to exam_kb_questions
ALTER TABLE public.exam_kb_questions
ADD COLUMN IF NOT EXISTS cognitive_level text DEFAULT 'apply',
ADD COLUMN IF NOT EXISTS bloom_level integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS estimated_time_min numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS step_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS concept_count integer DEFAULT 0;
