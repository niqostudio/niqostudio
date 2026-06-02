-- Supabase は grant が既定で開いており、RLS が関所。RLS は行単位のみなので、機密列は
-- 列単位 GRANT で隠す（clients, inquiries）。管理は service_role（RLS バイパス）。
-- 公開サインアップは無効のままにする。

CREATE POLICY works_anon_select ON public.works
  FOR SELECT TO anon USING (status = 'published');

CREATE POLICY cases_anon_select ON public.cases
  FOR SELECT TO anon USING (status = 'published');

CREATE POLICY services_anon_select ON public.services
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY profile_anon_select ON public.profile
  FOR SELECT TO anon USING (true);

-- anon には安全な列だけ許可。real_name / internal_notes は決して GRANT しない
REVOKE ALL ON public.clients FROM anon;
GRANT SELECT (id, slug, public_name, industry, size, description, logo_url, website_url, display_order, created_at, updated_at)
  ON public.clients TO anon;

CREATE POLICY clients_anon_select ON public.clients
  FOR SELECT TO anon USING (
    id IN (SELECT client_id FROM public.works WHERE status = 'published' AND client_id IS NOT NULL)
    OR id IN (SELECT client_id FROM public.cases WHERE status = 'published' AND client_id IS NOT NULL)
  );

-- projects は内部専用
REVOKE ALL ON public.projects FROM anon;

-- anon は公開フィールドのみ INSERT 可（status / converted_client_id / internal_notes は設定不可）
REVOKE ALL ON public.inquiries FROM anon;
GRANT INSERT (name, company, email, subject, message) ON public.inquiries TO anon;

CREATE POLICY inquiries_anon_insert ON public.inquiries
  FOR INSERT TO anon WITH CHECK (true);
