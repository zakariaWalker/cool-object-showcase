
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create embeddings table
CREATE TABLE public.kb_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('exercise', 'pattern', 'deconstruction')),
  content_id UUID NOT NULL,
  content_text TEXT NOT NULL,
  embedding extensions.vector(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate embeddings
CREATE UNIQUE INDEX idx_kb_embeddings_unique ON public.kb_embeddings (content_type, content_id);

-- HNSW index for fast similarity search
CREATE INDEX idx_kb_embeddings_hnsw ON public.kb_embeddings 
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Enable RLS
ALTER TABLE public.kb_embeddings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Embeddings readable by all" ON public.kb_embeddings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert embeddings" ON public.kb_embeddings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update embeddings" ON public.kb_embeddings
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete embeddings" ON public.kb_embeddings
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_kb_embeddings_updated_at
  BEFORE UPDATE ON public.kb_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Similarity search function
CREATE OR REPLACE FUNCTION public.match_kb_embeddings(
  query_embedding extensions.vector(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  filter_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_id UUID,
  content_text TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content_type,
    e.content_id,
    e.content_text,
    e.metadata,
    1 - (e.embedding <=> query_embedding)::FLOAT AS similarity
  FROM public.kb_embeddings e
  WHERE
    (filter_type IS NULL OR e.content_type = filter_type)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
