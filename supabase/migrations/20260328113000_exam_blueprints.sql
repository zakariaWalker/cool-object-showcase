-- Migration: Add Exam Blueprints for Aggregated Styles
CREATE TABLE IF NOT EXISTS public.exam_blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    format TEXT NOT NULL, -- 'bem', 'bac', 'regular'
    grade TEXT NOT NULL,
    aggregated_style JSONB DEFAULT '{}',
    aggregated_patterns JSONB DEFAULT '{}',
    sample_size INTEGER DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(format, grade)
);

-- Function to update blueprint on new upload
CREATE OR REPLACE FUNCTION public.update_exam_blueprint()
RETURNS TRIGGER AS $$
DECLARE
    current_style JSONB;
    current_patterns JSONB;
    new_size INTEGER;
BEGIN
    IF NEW.status = 'completed' AND NEW.extracted_metadata IS NOT NULL THEN
        -- Get existing blueprint
        SELECT aggregated_style, aggregated_patterns, sample_size 
        into current_style, current_patterns, new_size
        FROM public.exam_blueprints 
        WHERE format = NEW.format AND grade = NEW.grade;

        IF NOT FOUND THEN
            INSERT INTO public.exam_blueprints (format, grade, aggregated_style, aggregated_patterns, sample_size)
            VALUES (NEW.format, NEW.grade, NEW.extracted_metadata, NEW.extracted_patterns, 1);
        ELSE
            -- Simple aggregation: favor newer styles but blend (simplified as replace for now with size tracking)
            -- In a real scenario, we'd average numeric values and choose mode for enums
            UPDATE public.exam_blueprints 
            SET 
                aggregated_style = NEW.extracted_metadata, -- For now, take latest but track size
                aggregated_patterns = NEW.extracted_patterns,
                sample_size = new_size + 1,
                last_updated_at = now()
            WHERE format = NEW.format AND grade = NEW.grade;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exam_blueprint
AFTER UPDATE ON public.exam_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_exam_blueprint();
