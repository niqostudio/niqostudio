-- 業務データ層を public から専用スキーマ core へ集約（名前で役割を明示）。public は空にして無効化（DROP せず）。
-- 公開面は core.public_* view のみ＝anon は view だけ（生テーブルは core で service_role 専用、inquiries は writer 書込）。
-- public の Supabase 既定広域権限が core には無いため、anon の権限は明示した分だけ＝締まる。

CREATE SCHEMA IF NOT EXISTS core;

-- 関数を core へ（テーブルのトリガは OID 参照で追従）。
ALTER FUNCTION public.set_updated_at() SET SCHEMA core;
ALTER FUNCTION public.enforce_project_status_transition() SET SCHEMA core;
ALTER FUNCTION public.log_project_status_event() SET SCHEMA core;

-- view はテーブル移動の依存になるため先に落とし、後で core に作り直す。
DROP VIEW IF EXISTS public.showcases;
DROP VIEW IF EXISTS public.project_outcomes;

-- 全業務テーブルを core へ（FK・index・trigger・RLS・grant は追従）。
ALTER TABLE public.clients SET SCHEMA core;
ALTER TABLE public.services SET SCHEMA core;
ALTER TABLE public.profile SET SCHEMA core;
ALTER TABLE public.projects SET SCHEMA core;
ALTER TABLE public.requirements SET SCHEMA core;
ALTER TABLE public.problems SET SCHEMA core;
ALTER TABLE public.scope_items SET SCHEMA core;
ALTER TABLE public.project_decisions SET SCHEMA core;
ALTER TABLE public.deliverables SET SCHEMA core;
ALTER TABLE public.metrics SET SCHEMA core;
ALTER TABLE public.ndas SET SCHEMA core;
ALTER TABLE public.showcase_entries SET SCHEMA core;
ALTER TABLE public.showcase_problems SET SCHEMA core;
ALTER TABLE public.showcase_deliverables SET SCHEMA core;
ALTER TABLE public.showcase_metrics SET SCHEMA core;
ALTER TABLE public.inquiries SET SCHEMA core;
ALTER TABLE public.project_repositories SET SCHEMA core;
ALTER TABLE public.project_statuses SET SCHEMA core;
ALTER TABLE public.project_status_transitions SET SCHEMA core;
ALTER TABLE public.project_status_events SET SCHEMA core;

-- トリガ関数の本体は public.* を参照しているため core.* で作り直す（SET SCHEMA は本体を書き換えない・OID 維持でトリガは追従）。
CREATE OR REPLACE FUNCTION core.enforce_project_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
begin
  if new.status is distinct from old.status
     and not exists (
       select 1 from core.project_status_transitions t
       where t.from_status = old.status and t.to_status = new.status
     ) then
    raise exception '不正な案件ステータス遷移: % -> %', old.status, new.status using errcode = 'check_violation';
  end if;
  return new;
end$$;

CREATE OR REPLACE FUNCTION core.log_project_status_event()
RETURNS trigger LANGUAGE plpgsql AS $$
begin
  if tg_op = 'INSERT' then
    insert into core.project_status_events (project_id, from_status, to_status) values (new.id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into core.project_status_events (project_id, from_status, to_status) values (new.id, old.status, new.status);
  end if;
  return new;
end$$;

-- 内部 view（studio が service_role で読む）を core に作り直す。
CREATE VIEW core.project_outcomes AS
SELECT
  p.id AS project_id,
  p.status,
  CASE
    WHEN p.status <> 'closed' THEN NULL
    ELSE (
      SELECT CASE e.from_status WHEN 'delivered' THEN 'completed' WHEN 'active' THEN 'cancelled' ELSE 'lost' END
      FROM core.project_status_events e
      WHERE e.project_id = p.id AND e.to_status = 'closed'
      ORDER BY e.changed_at DESC LIMIT 1
    )
  END AS outcome
FROM core.projects p;

-- 公開 view（anon が読む面）。cases＝core.public_showcases（子は display_priority DESC 集約）。
CREATE VIEW core.public_showcases AS
SELECT
  s.slug,
  s.title,
  s.summary,
  s.thumbnail_url,
  s.period,
  s.display_priority,
  s.project_id,
  p.tech_stack,
  CASE WHEN n.publish_testimonial THEN p.testimonial END AS testimonial,
  CASE WHEN s.client_display = 'named' AND c.is_public_name_allowed THEN c.public_name END AS client_name,
  CASE WHEN s.client_display IN ('named', 'anonymized') THEN c.industry END AS client_industry,
  CASE WHEN n.publish_problems THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('problem', pr.problem, 'solution', pr.solution, 'outcome', pr.outcome) ORDER BY sp.display_priority DESC)
    FROM core.showcase_problems sp JOIN core.problems pr ON pr.id = sp.problem_id WHERE sp.showcase_id = s.id
  ), '[]'::jsonb) ELSE '[]'::jsonb END AS problems,
  CASE WHEN n.publish_deliverables THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('kind', d.kind, 'name', d.name, 'url', d.url, 'images', d.image_urls) ORDER BY sd.display_priority DESC)
    FROM core.showcase_deliverables sd JOIN core.deliverables d ON d.id = sd.deliverable_id WHERE sd.showcase_id = s.id
  ), '[]'::jsonb) ELSE '[]'::jsonb END AS deliverables,
  CASE WHEN n.publish_metrics THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label', m.label, 'achieved', m.achieved, 'previous', m.previous, 'unit', m.unit, 'kind', m.kind) ORDER BY sm.display_priority DESC)
    FROM core.showcase_metrics sm JOIN core.metrics m ON m.id = sm.metric_id WHERE sm.showcase_id = s.id
  ), '[]'::jsonb) ELSE '[]'::jsonb END AS metrics
FROM core.showcase_entries s
JOIN core.projects p ON p.id = s.project_id
LEFT JOIN core.ndas n ON n.project_id = p.id
LEFT JOIN core.clients c ON c.id = p.client_id
WHERE s.status = 'published';

-- services / profile の公開射影（anon は生テーブルでなく view だけ）。
CREATE VIEW core.public_services AS SELECT * FROM core.services WHERE is_active = true;
CREATE VIEW core.public_profile AS SELECT * FROM core.profile;

-- grant：core スキーマ usage と service_role の全権（core には Supabase 既定が無いため明示）。
GRANT USAGE ON SCHEMA core TO anon, authenticated, service_role, inquiry_writer, inquiry_reader;
GRANT ALL ON ALL TABLES IN SCHEMA core TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT ALL ON SEQUENCES TO service_role;

-- anon：public から追従した広域権限を全撤去し、公開 view だけに絞る。
REVOKE ALL ON ALL TABLES IN SCHEMA core FROM anon, authenticated;
GRANT SELECT ON core.public_showcases TO anon;
GRANT SELECT ON core.public_services TO anon;
GRANT SELECT ON core.public_profile TO anon;
-- inquiry_writer/_reader の inquiries 列単位 grant は SET SCHEMA で追従済み（usage は上で付与）。

-- public スキーマを無効化（DROP はせず：Supabase/Postgres が存在前提）。空・作成不可・anon 不可。
REVOKE ALL ON SCHEMA public FROM anon, authenticated;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
