-- 案件ステータスを「状態マスタ × 遷移マスタ × 履歴」の state machine で持つ。許容値は FK、
-- 許容遷移はトリガで強制（＝データレイヤーで制約・書き手を問わず守る）。終わり方（完了/失注/中止）は
-- 履歴の closed 直前状態から派生（project_outcomes）＝終端は closed 単一・結果列は持たない。
-- 状態は text のままだが、許可値は CHECK でなくマスタ FK。lookup/join/log は自然キーのため uuid+timestamp 規約の例外。

-- 1) 状態マスタ（頂点）
create table public.project_statuses (
  code text primary key,
  label text not null,
  sort_order int not null default 0,
  is_initial boolean not null default false,   -- 新規が始まれる状態（UI の開始既定）
  is_terminal boolean not null default false   -- 出口の無い終端
);

insert into public.project_statuses (code, label, sort_order, is_initial, is_terminal) values
  ('consultation', '無料相談', 1, true,  false),
  ('discovery',    '事前設計', 2, false, false),
  ('active',       '進行中',   3, false, false),
  ('delivered',    '納品済',   4, false, false),
  ('closed',       'クローズ', 5, false, true);

-- 2) 遷移マスタ（辺＝機械の定義）。遷移を足す＝行を足す（トリガ本体は触らない）。
create table public.project_status_transitions (
  from_status text not null references public.project_statuses(code) on delete cascade,
  to_status   text not null references public.project_statuses(code) on delete cascade,
  primary key (from_status, to_status),
  constraint project_status_transitions_no_self check (from_status <> to_status)
);

insert into public.project_status_transitions (from_status, to_status) values
  ('consultation', 'discovery'),   -- 有償の事前設計へ
  ('consultation', 'closed'),      -- 相談止まり（失注）
  ('discovery',    'active'),      -- 受注・着手
  ('discovery',    'closed'),      -- 設計止まり（失注）
  ('active',       'delivered'),   -- 納品
  ('active',       'closed'),      -- 中止
  ('delivered',    'closed');      -- 完了

-- 3) projects.status を CHECK から マスタ FK へ。既定は初期状態。
alter table public.projects
  drop constraint if exists projects_status_check,
  alter column status set default 'consultation',
  add constraint projects_status_fkey
    foreign key (status) references public.project_statuses(code);

-- 4) 履歴（append-only）。status 変更の正本＝監査ログ兼ファネル計測（各ステージ滞在も引ける）。
create table public.project_status_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_status text references public.project_statuses(code),   -- 作成時（初期）は null
  to_status   text not null references public.project_statuses(code),
  changed_at  timestamptz not null default now()
);

create index idx_project_status_events_project on public.project_status_events(project_id, changed_at);

-- 5) 遷移の検証（BEFORE UPDATE）：status が変わるとき辺マスタに無い遷移を拒否。
--    INSERT は FK が値の妥当性を保証し、過去案件の取り込み（任意状態での作成）を許す＝初期状態は強制しない。
create or replace function public.enforce_project_status_transition()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status
     and not exists (
       select 1 from public.project_status_transitions t
       where t.from_status = old.status and t.to_status = new.status
     ) then
    raise exception '不正な案件ステータス遷移: % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;
  return new;
end$$;

create trigger trg_project_status_transition
  before update of status on public.projects
  for each row execute function public.enforce_project_status_transition();

-- 6) 履歴追記（AFTER）：作成で初期、status 変化で from→to を記録。
create or replace function public.log_project_status_event()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into public.project_status_events (project_id, from_status, to_status)
      values (new.id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.project_status_events (project_id, from_status, to_status)
      values (new.id, old.status, new.status);
  end if;
  return new;
end$$;

create trigger trg_project_status_event
  after insert or update of status on public.projects
  for each row execute function public.log_project_status_event();

-- 7) 終わり方の派生（view）：closed のとき履歴の closed 直前状態から写像。
--    delivered→完了 / active→中止 / それ以前（consultation・discovery）→失注。
create view public.project_outcomes as
select
  p.id as project_id,
  p.status,
  case
    when p.status <> 'closed' then null
    else (
      select case e.from_status
               when 'delivered' then 'completed'
               when 'active'    then 'cancelled'
               else 'lost'
             end
      from public.project_status_events e
      where e.project_id = p.id and e.to_status = 'closed'
      order by e.changed_at desc
      limit 1
    )
  end as outcome
from public.projects p;

-- 8) RLS / GRANT：いずれも内部専用（pipeline は非公開）。anon/authenticated 遮断・管理は service_role。
alter table public.project_statuses enable row level security;
alter table public.project_status_transitions enable row level security;
alter table public.project_status_events enable row level security;
revoke all on public.project_statuses from anon, authenticated;
revoke all on public.project_status_transitions from anon, authenticated;
revoke all on public.project_status_events from anon, authenticated;
revoke all on public.project_outcomes from anon, authenticated;
