
CREATE TABLE public.exam_kb_question_skill_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_question_id UUID NOT NULL REFERENCES public.exam_kb_questions(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.kb_skills(id) ON DELETE CASCADE,
  relevance_score NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_question_id, skill_id)
);

ALTER TABLE public.exam_kb_question_skill_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Links viewable by all" ON public.exam_kb_question_skill_links FOR SELECT USING (true);
CREATE POLICY "Auth can insert links" ON public.exam_kb_question_skill_links FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete links" ON public.exam_kb_question_skill_links FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_eqsl_question ON public.exam_kb_question_skill_links(exam_question_id);
CREATE INDEX idx_eqsl_skill ON public.exam_kb_question_skill_links(skill_id);
