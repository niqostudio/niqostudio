CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  problem text,
  solution text,
  outcome text,
  metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  tech_details text,
  thumbnail_url text,
  image_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  published_at date,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cases_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX idx_cases_client ON public.cases(client_id);
CREATE INDEX idx_cases_project ON public.cases(project_id);
CREATE INDEX idx_cases_status ON public.cases(status);

CREATE TRIGGER set_updated_at_cases
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
