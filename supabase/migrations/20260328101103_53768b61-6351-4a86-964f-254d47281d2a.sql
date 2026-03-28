-- Add scoring parameters to exercise_breakdowns for exam scoring categorization
ALTER TABLE exercise_breakdowns
ADD COLUMN IF NOT EXISTS cognitive_level text DEFAULT 'apply',
ADD COLUMN IF NOT EXISTS bloom_level integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS estimated_time_min numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS concept_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS step_count integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS base_score numeric DEFAULT 2,
ADD COLUMN IF NOT EXISTS scoring_params jsonb DEFAULT '{}'::jsonb;

-- Add scoring parameters to kb_exercises too
ALTER TABLE kb_exercises
ADD COLUMN IF NOT EXISTS cognitive_level text DEFAULT 'apply',
ADD COLUMN IF NOT EXISTS bloom_level integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS estimated_time_min numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS concept_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS step_count integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS base_score numeric DEFAULT 2,
ADD COLUMN IF NOT EXISTS difficulty integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS scoring_params jsonb DEFAULT '{}'::jsonb;

-- Add analysis metadata to exam_uploads for auto-enhancing the builder
ALTER TABLE exam_uploads
ADD COLUMN IF NOT EXISTS extracted_patterns jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS extracted_metadata jsonb DEFAULT '{}'::jsonb;