-- migrate:up

-- products の公開射影。ポートフォリオ台帳には未公開プロダクト（コードネーム段階）が混ざるため、
-- 公開は is_public の明示 opt-in（既定 false＝fail-safe）。url は製品の公開サイト。
alter table core.products add column is_public boolean not null default false;
alter table core.products add column url text;

-- 公開してよい列のみ。sunset（提供終了）は opt-in 済みでも自動で外す。
create view core.public_products as
  select slug, name, summary, url, tech_stack, launched_on
  from core.products
  where is_public = true and status <> 'sunset';
grant select on core.public_products to anon;

-- migrate:down
