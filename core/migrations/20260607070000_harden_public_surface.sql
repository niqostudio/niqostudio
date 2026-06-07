-- migrate:up

-- 到達不能な residue policy を撤去（対象テーブルは core へ移り anon は public_* view 経由のみ＝この anon policy は無効）。
drop policy if exists services_anon_select on core.services;
drop policy if exists profile_anon_select on core.profile;

-- 公開 view を SELECT * から列挙へ。公開する列を契約として固定し、将来の内部列が暗黙公開されないようにする。
-- 列は website の射影（toServiceView / toProfileView）が読む分のみ＝挙動は不変。
drop view if exists core.public_services;
create view core.public_services as
  select slug, name, name_ja, headline, summary, target_pains, coverage, details,
         deliverables, followups, exclusions, pricing, duration, display_priority
  from core.services
  where is_active = true;
grant select on core.public_services to anon;

drop view if exists core.public_profile;
create view core.public_profile as
  select id, display_name, handle, tagline, bio, skills, operation_policy,
         contact_email, social_links, logo_svg
  from core.profile;
grant select on core.public_profile to anon;

-- トリガ関数の search_path を固定（unqualified 解決を pg_catalog のみに限定）。
-- 本体は core 修飾済み／now() のみのため空 search_path で動作する。
alter function core.set_updated_at() set search_path = '';
alter function core.enforce_project_status_transition() set search_path = '';
alter function core.log_project_status_event() set search_path = '';

-- migrate:down
