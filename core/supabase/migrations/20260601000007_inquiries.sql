CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  converted_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inquiries_status_check CHECK (status IN ('new', 'responded', 'converted', 'archived'))
);

CREATE INDEX idx_inquiries_status ON public.inquiries(status);
CREATE INDEX idx_inquiries_converted_client ON public.inquiries(converted_client_id);

CREATE TRIGGER set_updated_at_inquiries
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
