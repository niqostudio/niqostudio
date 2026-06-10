-- migrate:up
-- 打ち合わせ。顧客（任意で案件）との打ち合わせを記録する。内部情報＝公開 view には出さない。
-- status は予定/実施済/中止の3値（text+CHECK）。案件のような状態機械は持たない（単純な区分）。
create table core.meetings (
  id uuid default gen_random_uuid() not null,
  client_id uuid not null,
  project_id uuid,
  title text not null,
  met_on date default current_date not null,
  duration_min integer,
  status text default 'scheduled'::text not null,
  location text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint meetings_pkey primary key (id),
  constraint meetings_duration_min_check check (duration_min is null or duration_min > 0),
  constraint meetings_status_check check (status = any (array['scheduled'::text, 'done'::text, 'canceled'::text])),
  constraint meetings_client_id_fkey foreign key (client_id) references core.clients(id) on delete cascade,
  constraint meetings_project_id_fkey foreign key (project_id) references core.projects(id) on delete set null
);

create index idx_meetings_client on core.meetings using btree (client_id);
create index idx_meetings_project on core.meetings using btree (project_id);
create index idx_meetings_met_on on core.meetings using btree (met_on);

create trigger set_updated_at_meetings before update on core.meetings
  for each row execute function core.set_updated_at();

alter table core.meetings enable row level security;

grant all on table core.meetings to service_role;

-- migrate:down
drop table if exists core.meetings;
