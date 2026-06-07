-- owner: records 基盤（features/collections の下書き＋features/schema-config の overlay が相乗り）
-- studio 自前 store の初期スキーマ。core（public）とは別系統・別スキーマ（studio）に置く。
-- 同一 Supabase の studio スキーマに置く前提だが、別 Supabase プロジェクトへそのまま移送できる形にする。

create schema if not exists studio;

-- 汎用 records：collection の下書き／正本（draft_state で区別）。fields は jsonb（形は collection が与える）。
-- tenant_id を最初から持たせ、テナント分離を後付けにしない。
create table if not exists studio.records (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  collection text not null,
  source_id uuid,
  fields jsonb not null,
  draft_state text not null default 'draft'
    constraint records_draft_state_check check (draft_state in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_records_tenant_collection on studio.records (tenant_id, collection);

-- updated_at トリガは studio スキーマ内に自前で持つ（core の public.set_updated_at に依存しない＝独立）。
create or replace function studio.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_records on studio.records;
create trigger set_updated_at_records before update on studio.records
  for each row execute function studio.set_updated_at();

-- 管理は service_role（RLS バイパス）。Data API ロールには出さない。
revoke all on all tables in schema studio from anon, authenticated;
alter table studio.records enable row level security;

-- service_role（studio の管理ロール）に studio スキーマを許可。
grant usage on schema studio to service_role;
grant all on all tables in schema studio to service_role;
alter default privileges in schema studio grant all on tables to service_role;
