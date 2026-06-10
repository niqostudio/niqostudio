-- migrate:up
-- 工数（作業ログ）。案件に対する作業時間を1件ずつ記録する。内部情報＝公開 view には出さない。
-- hours は時間（numeric・小数可）。集計で案件別の総工数・粗利（contract_value÷工数）に使う。
create table core.work_logs (
  id uuid default gen_random_uuid() not null,
  project_id uuid not null,
  worked_on date default current_date not null,
  hours numeric(5,2) not null,
  task text not null,
  note text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint work_logs_pkey primary key (id),
  constraint work_logs_hours_check check (hours > 0),
  constraint work_logs_project_id_fkey foreign key (project_id) references core.projects(id) on delete cascade
);

create index idx_work_logs_project on core.work_logs using btree (project_id, worked_on);

create trigger set_updated_at_work_logs before update on core.work_logs
  for each row execute function core.set_updated_at();

alter table core.work_logs enable row level security;

grant all on table core.work_logs to service_role;

-- migrate:down
drop table if exists core.work_logs;
