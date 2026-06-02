ALTER TABLE public.services
  ADD COLUMN target_pains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN followups text[] NOT NULL DEFAULT '{}',
  ADD COLUMN pricing jsonb,
  DROP COLUMN price_range;
