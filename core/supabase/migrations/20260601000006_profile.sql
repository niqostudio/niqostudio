CREATE TABLE public.profile (
  id text PRIMARY KEY DEFAULT 'singleton',
  display_name text NOT NULL,
  handle text NOT NULL,
  bio text,
  skills text[] NOT NULL DEFAULT '{}',
  operation_policy text,
  contact_email text,
  social_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_singleton_check CHECK (id = 'singleton')
);

CREATE TRIGGER set_updated_at_profile
  BEFORE UPDATE ON public.profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
