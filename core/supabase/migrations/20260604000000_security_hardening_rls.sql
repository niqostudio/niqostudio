-- セキュリティ監査の指摘対応（RLS 多層防御）。
-- 1) clients の公開ポリシーに同意フラグ is_public_name_allowed を必須化（オプトインを関所で担保）。
-- 2) 公開読みテーブル(works/cases/services)の書込み表特権を anon から剥奪（RLS 一枚依存をやめる）。
-- 3) profile を全列開放(USING true)から列単位 GRANT に絞り、将来の internal 列の暗黙露出を防ぐ。

-- 1) 同意していない顧客（is_public_name_allowed=false）の public_name を anon に出さない。
--    ポリシーはテーブル所有者権限で評価されるため、anon に列 GRANT が無い is_public_name_allowed も参照できる。
DROP POLICY IF EXISTS clients_anon_select ON public.clients;
CREATE POLICY clients_anon_select ON public.clients
  FOR SELECT TO anon USING (
    is_public_name_allowed = true
    AND (
      id IN (SELECT client_id FROM public.works WHERE status = 'published' AND client_id IS NOT NULL)
      OR id IN (SELECT client_id FROM public.cases WHERE status = 'published' AND client_id IS NOT NULL)
    )
  );

-- 2) 公開読みテーブルは SELECT のみ許可。書込み表特権を明示剥奪し、RLS にポリシーが無い＝deny の
--    一枚依存をやめる（clients/projects/inquiries と同じ多層防御方針に統一）。
REVOKE INSERT, UPDATE, DELETE ON public.works, public.cases, public.services FROM anon;

-- 3) profile を全列開放から公開列のみの明示 GRANT に絞る。将来 internal 列を足しても暗黙露出しない
--    （未 GRANT 列を select('*') すると権限エラーで fail-fast＝漏れずに気づける）。
REVOKE ALL ON public.profile FROM anon;
GRANT SELECT (
  id, display_name, handle, bio, skills, operation_policy,
  contact_email, social_links, updated_at, tagline, logo_svg
) ON public.profile TO anon;
