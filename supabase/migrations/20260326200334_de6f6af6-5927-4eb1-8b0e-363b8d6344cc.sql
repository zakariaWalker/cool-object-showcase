-- Storage bucket for exam PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('exam-pdfs', 'exam-pdfs', false);

-- Allow authenticated users to upload exam PDFs
CREATE POLICY "Users can upload exam PDFs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'exam-pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their exam PDFs" ON storage.objects
  FOR SELECT USING (bucket_id = 'exam-pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their exam PDFs" ON storage.objects
  FOR DELETE USING (bucket_id = 'exam-pdfs' AND auth.uid() IS NOT NULL);

-- Exam uploads table
CREATE TABLE public.exam_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  format TEXT NOT NULL DEFAULT 'unknown',
  year TEXT,
  session TEXT,
  grade TEXT,
  stream TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their uploads" ON public.exam_uploads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create uploads" ON public.exam_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their uploads" ON public.exam_uploads
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their uploads" ON public.exam_uploads
  FOR DELETE USING (auth.uid() = user_id);

-- Extracted exam questions table
CREATE TABLE public.exam_extracted_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.exam_uploads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_label TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  sub_question TEXT,
  text TEXT NOT NULL,
  points NUMERIC DEFAULT 0,
  type TEXT DEFAULT 'unclassified',
  difficulty TEXT DEFAULT 'medium',
  concepts TEXT[] DEFAULT '{}',
  linked_pattern_ids TEXT[] DEFAULT '{}',
  raw_latex TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_extracted_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their questions" ON public.exam_extracted_questions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create questions" ON public.exam_extracted_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their questions" ON public.exam_extracted_questions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their questions" ON public.exam_extracted_questions
  FOR DELETE USING (auth.uid() = user_id);

-- Exam analytics cache
CREATE TABLE public.exam_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES public.exam_uploads(id) ON DELETE CASCADE,
  topic_frequency JSONB DEFAULT '{}',
  difficulty_distribution JSONB DEFAULT '{}',
  concept_frequency JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their analytics" ON public.exam_analytics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create analytics" ON public.exam_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_exam_uploads_updated_at
  BEFORE UPDATE ON public.exam_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();