-- migrate:up
-- メトリクスの計測ログ（時系列・append-only）。推移グラフの正本。内部のみ。
-- 被写体（案件 xor プロダクト）＋成果物（任意）＋指標 key＋phase(before/after)＋値＋測定 URL。
-- 旧サイトは公開前に1回、納品物は期間中に何度も測れる＝after が推移する。
create table core.metric_measurements (
  id uuid default gen_random_uuid() not null,
  project_id uuid,
  product_id uuid,
  deliverable_id uuid,
  metric_key text not null,
  phase text not null,
  value text not null,
  url text,
  measured_at timestamp with time zone default now() not null,
  constraint metric_measurements_pkey primary key (id),
  constraint metric_measurements_phase_check check (phase = any (array['before'::text, 'after'::text])),
  constraint metric_measurements_subject_check check (num_nonnulls(project_id, product_id) = 1),
  constraint metric_measurements_project_id_fkey foreign key (project_id) references core.projects(id) on delete cascade,
  constraint metric_measurements_product_id_fkey foreign key (product_id) references core.products(id) on delete cascade,
  constraint metric_measurements_deliverable_id_fkey foreign key (deliverable_id) references core.deliverables(id) on delete set null
);

create index idx_metric_measurements_deliverable on core.metric_measurements using btree (deliverable_id, metric_key, measured_at);

alter table core.metric_measurements enable row level security;

grant all on table core.metric_measurements to service_role;

-- migrate:down
drop table if exists core.metric_measurements;
