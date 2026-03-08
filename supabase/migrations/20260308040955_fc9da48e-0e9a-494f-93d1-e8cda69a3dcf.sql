
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base documents
CREATE TABLE IF NOT EXISTS public.homi_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  empreendimento TEXT,
  file_url TEXT,
  file_type TEXT,
  content TEXT,
  chunk_count INT DEFAULT 0,
  status TEXT DEFAULT 'processing',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Document chunks with embeddings
CREATE TABLE IF NOT EXISTS public.homi_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.homi_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homi_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homi_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read, only admins/gestores can manage
CREATE POLICY "Authenticated users can read documents"
ON public.homi_documents FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins and gestores can insert documents"
ON public.homi_documents FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

CREATE POLICY "Admins and gestores can update documents"
ON public.homi_documents FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

CREATE POLICY "Admins and gestores can delete documents"
ON public.homi_documents FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

CREATE POLICY "Authenticated users can read chunks"
ON public.homi_chunks FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role can manage chunks"
ON public.homi_chunks FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION public.buscar_conhecimento(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_empreendimento text DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    hc.id,
    hc.document_id,
    hc.content,
    hc.metadata,
    (1 - (hc.embedding <=> query_embedding))::float AS similarity
  FROM homi_chunks hc
  JOIN homi_documents hd ON hc.document_id = hd.id
  WHERE 
    1 - (hc.embedding <=> query_embedding) > match_threshold
    AND hd.status = 'indexed'
    AND (filter_empreendimento IS NULL 
         OR hd.empreendimento = filter_empreendimento)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
