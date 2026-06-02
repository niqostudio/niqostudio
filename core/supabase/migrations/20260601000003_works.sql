CREATE TABLE public.works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,   -- 公開帰属
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL, -- 内部リンク（anon は辿れない）
  period text,
  scope text[] NOT NULL DEFAULT '{}',
  tech_stack text[] NOT NULL DEFAULT '{}',
  thumbnail_url text,
  image_urls text[] NOT NULL DEFAULT '{}',
  summary text,
  public_url text,
  status text NOT NULL DEFAULT 'draft',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT works_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX idx_works_client ON public.works(client_id);
CREATE INDEX idx_works_project ON public.works(project_id);
CREATE INDEX idx_works_status ON public.works(status);

CREATE TRIGGER set_updated_at_works
  BEFORE UPDATE ON public.works
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
