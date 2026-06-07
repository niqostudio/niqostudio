-- project_repositories：案件の「進行中開発の正本」としての git リポ（project 1:N）。
-- deliverables（顧客への納品物＝公開サイト等）とは別概念。内部のみ（公開しない）。
create table public.project_repositories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  url text not null,
  -- 役割ラベル（monorepo / site / infra 等）。許可値を固定しないため自由記述。
  role text,
  visibility text not null default 'private'
    constraint project_repositories_visibility_check check (visibility in ('public', 'private')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_project_repositories_project on public.project_repositories(project_id);

create trigger set_updated_at_project_repositories before update on public.project_repositories
  for each row execute function public.set_updated_at();

alter table public.project_repositories enable row level security;
revoke all on public.project_repositories from anon, authenticated;
