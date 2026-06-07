-- owner: records 基盤（features/collections の版履歴＝CRUD 編集の history）
-- 下書きの版管理。draft の保存ごとに fields のスナップショットを追記し、任意の版へ戻せる
-- （forward-only：戻す操作も新しい版になる）。records とは独立（破棄しても履歴は残す）。
create table if not exists studio.record_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  collection text not null,
  record_id text not null,
  fields jsonb not null,
  -- どの操作で生まれた版か（create / manual / child / derive / revert）。
  origin text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_record_versions_record
  on studio.record_versions (tenant_id, collection, record_id, created_at desc);

revoke all on studio.record_versions from anon, authenticated;
alter table studio.record_versions enable row level security;
grant usage on schema studio to service_role;
grant all on studio.record_versions to service_role;
