-- owner: features/git-import（取り込みの中間表現ストック）
-- git 取り込みの中間表現（CommitGraph＋クラスタ）の永続化。射影の証拠＝可視化・traceability 用。
-- 開発用の可視化に使い、本番 UI には出さない方針。
create table if not exists studio.extractions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  project_id text not null,
  -- { commits: [...], clusters: [...] }
  graph jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_extractions_tenant on studio.extractions (tenant_id, created_at desc);

revoke all on studio.extractions from anon, authenticated;
alter table studio.extractions enable row level security;
grant usage on schema studio to service_role;
grant all on studio.extractions to service_role;
