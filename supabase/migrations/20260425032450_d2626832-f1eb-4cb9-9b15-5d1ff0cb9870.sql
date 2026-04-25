-- ===== Unified Figure Specs for Geometry Renderer =====
-- Stores manual FigureSpec overrides per exercise. When absent, the renderer
-- falls back to auto-generation from the exercise pattern/type.

CREATE TABLE public.kb_figures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL,
  figure_type TEXT NOT NULL,            -- e.g. 'parallelepiped', 'cube', 'triangle', 'circle', 'function_plot'
  spec JSONB NOT NULL DEFAULT '{}'::jsonb,  -- full FigureSpec (vertices, edges, faces, dims, axes...)
  description TEXT DEFAULT ''::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT kb_figures_exercise_unique UNIQUE (exercise_id)
);

CREATE INDEX idx_kb_figures_exercise ON public.kb_figures(exercise_id);
CREATE INDEX idx_kb_figures_type ON public.kb_figures(figure_type);

ALTER TABLE public.kb_figures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Figures viewable by all"
  ON public.kb_figures FOR SELECT
  USING (true);

CREATE POLICY "Auth can insert figures"
  ON public.kb_figures FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth can update figures"
  ON public.kb_figures FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth can delete figures"
  ON public.kb_figures FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_kb_figures_updated_at
  BEFORE UPDATE ON public.kb_figures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();