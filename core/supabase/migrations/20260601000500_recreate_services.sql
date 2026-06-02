-- services を整理した列順で作り直す（inbound FK 無し・データは Studio で再投入）。
-- 既存の追加(000300)・改名で列順が乱れたため、ここで意図した順に再構築する。
DROP TABLE IF EXISTS public.services;

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  name_ja text,
  headline text,
  summary text,
  target_pains text[] NOT NULL DEFAULT '{}',
  coverage text[] NOT NULL DEFAULT '{}',
  details text,
  deliverables text[] NOT NULL DEFAULT '{}',
  followups text[] NOT NULL DEFAULT '{}',
  exclusions text[] NOT NULL DEFAULT '{}',
  pricing jsonb,
  price_min integer,
  currency text NOT NULL DEFAULT 'JPY',
  duration text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_active ON public.services(is_active);

CREATE TRIGGER set_updated_at_services
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY services_anon_select ON public.services
  FOR SELECT TO anon USING (is_active = true);
