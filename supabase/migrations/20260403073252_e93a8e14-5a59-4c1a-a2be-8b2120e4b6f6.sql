
-- Drop and recreate with proper operator reference
DROP FUNCTION IF EXISTS public.match_kb_embeddings;

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
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    e.id,
    e.content_type,
    e.content_id,
    e.content_text,
    e.metadata,
    (1 - (e.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.kb_embeddings e
  WHERE
    (filter_type IS NULL OR e.content_type = filter_type)
    AND (1 - (e.embedding <=> query_embedding)) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
