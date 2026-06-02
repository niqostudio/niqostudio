-- cases を summary 追加＋整理した列順で作り直す（inbound FK 無し・本番は空）。
-- clients の公開ポリシー(clients_anon_select)が cases を参照しているため、一旦外して張り直す。
DROP POLICY IF EXISTS clients_anon_select ON public.clients;
DROP TABLE IF EXISTS public.cases;

CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text,
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

CREATE POLICY cases_anon_select ON public.cases
  FOR SELECT TO anon USING (status = 'published');

-- clients の公開ポリシーを張り直す（新しい cases を参照）
CREATE POLICY clients_anon_select ON public.clients
  FOR SELECT TO anon USING (
    id IN (SELECT client_id FROM public.works WHERE status = 'published' AND client_id IS NOT NULL)
    OR id IN (SELECT client_id FROM public.cases WHERE status = 'published' AND client_id IS NOT NULL)
  );
