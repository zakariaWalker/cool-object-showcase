-- Migration: Refactor Exam Blueprints for Versioning
DROP TRIGGER IF EXISTS trigger_update_exam_blueprint ON public.exam_uploads;
DROP FUNCTION IF EXISTS public.update_exam_blueprint();
DROP TABLE IF EXISTS public.exam_blueprints;

CREATE TABLE public.exam_blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    format TEXT NOT NULL,
    grade TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_current BOOLEAN DEFAULT true,
    aggregated_style JSONB DEFAULT '{}',
    aggregated_patterns JSONB DEFAULT '{}',
    sample_size INTEGER DEFAULT 0,
    change_summary TEXT DEFAULT 'Initial pedagogical blueprint.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookup of current blueprint
CREATE INDEX idx_blueprints_current ON public.exam_blueprints (format, grade, is_current) WHERE is_current = true;

-- Function to update blueprint (Insert new version)
CREATE OR REPLACE FUNCTION public.update_exam_blueprint_versioned()
RETURNS TRIGGER AS $$
DECLARE
    latest_version INTEGER;
    current_sample_size INTEGER;
BEGIN
    IF NEW.status = 'completed' AND NEW.extracted_metadata IS NOT NULL THEN
        -- Get current version and sample size
        SELECT version, sample_size 
        INTO latest_version, current_sample_size
        FROM public.exam_blueprints 
        WHERE format = NEW.format AND grade = NEW.grade AND is_current = true
        LIMIT 1;

        IF NOT FOUND THEN
            -- First version
            INSERT INTO public.exam_blueprints (format, grade, version, is_current, aggregated_style, aggregated_patterns, sample_size, change_summary)
            VALUES (NEW.format, NEW.grade, 1, true, NEW.extracted_metadata, NEW.extracted_patterns, 1, 'Initial pedagogical blueprint.');
        ELSE
            -- Deactivate old version
            UPDATE public.exam_blueprints 
            SET is_current = false 
            WHERE format = NEW.format AND grade = NEW.grade AND is_current = true;

            -- Insert new version
            INSERT INTO public.exam_blueprints (
                format, grade, version, is_current, 
                aggregated_style, aggregated_patterns, 
                sample_size, change_summary
            )
            VALUES (
                NEW.format, NEW.grade, latest_version + 1, true, 
                NEW.extracted_metadata, NEW.extracted_patterns, 
                current_sample_size + 1, 
                COALESCE((NEW.extracted_metadata->>'change_summary'), 'Refinement of styles and patterns based on new upload.')
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exam_blueprint_versioned
AFTER UPDATE ON public.exam_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_exam_blueprint_versioned();

-- Create a notifications table if it doesn't exist to store events for the user
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    type TEXT NOT NULL, -- 'blueprint_enhancement', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger to notify on new blueprint version
CREATE OR REPLACE FUNCTION public.notify_blueprint_enhancement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = true AND NEW.version > 1 THEN
        INSERT INTO public.notification_logs (type, title, message, metadata)
        VALUES (
            'blueprint_enhancement',
            'Pedagogical Blueprint Enhanced (v' || NEW.version || ')',
            'AI has refined the style and structural patterns for ' || NEW.format || ' (' || NEW.grade || ') based on new data.',
            jsonb_build_object('blueprint_id', NEW.id, 'version', NEW.version, 'format', NEW.format)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_blueprint_enhancement
AFTER INSERT ON public.exam_blueprints
FOR EACH ROW
EXECUTE FUNCTION public.notify_blueprint_enhancement();
