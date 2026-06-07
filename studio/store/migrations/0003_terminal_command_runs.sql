-- owner: features/terminal（daemon 実行ログ）
-- daemon/CLI の実行履歴。コマンドと結果（出力）を残し、terminal 画面で確認する。
create table if not exists studio.command_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  command text not null,
  status text not null default 'running'
    constraint command_runs_status_check check (status in ('running', 'ok', 'error')),
  output text not null default '',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_command_runs_tenant on studio.command_runs (tenant_id, created_at desc);

revoke all on studio.command_runs from anon, authenticated;
alter table studio.command_runs enable row level security;
grant usage on schema studio to service_role;
grant all on studio.command_runs to service_role;
