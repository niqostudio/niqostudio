-- migrate:up

-- (b) 個人事業主×法人取引の最低限フィールド。
-- 源泉徴収（法人→個人の報酬から源泉）と実入金額（源泉・振込手数料で請求額と差が出る）。
alter table core.invoices add column withholding numeric not null default 0 check (withholding >= 0);
alter table core.invoices add column paid_amount numeric check (paid_amount >= 0);
-- 請求先（法人の所在地・宛先）。
alter table core.clients add column address text;

-- (a) クロスフィールド不変条件＝状態機械ではなく「あり得ない状態」を型で防ぐ。
alter table core.invoices add constraint invoices_paid_needs_date
  check (status <> 'paid' or paid_on is not null);
alter table core.invoices add constraint invoices_sent_needs_issue
  check (status not in ('sent', 'paid') or issued_on is not null);
alter table core.invoices add constraint invoices_due_after_issue
  check (due_on is null or issued_on is null or due_on >= issued_on);
alter table core.ndas add constraint ndas_agreed_needs_date
  check (status <> 'agreed' or agreed_on is not null);

-- (c) NDA 同意の変更履歴（append-only スナップショット）。公開可否は法的な「同意の記録」なので
-- いつ何に同意/変更したかを残す（project_status_events と同じ思想）。内部のみ。
create table core.nda_events (
  id uuid primary key default gen_random_uuid(),
  nda_id uuid not null references core.ndas (id) on delete cascade,
  status text not null,
  publish_problems boolean not null,
  publish_deliverables boolean not null,
  publish_metrics boolean not null,
  publish_testimonial boolean not null,
  agreed_on date,
  changed_at timestamptz not null default now()
);
create index idx_nda_events_nda on core.nda_events (nda_id, changed_at);

alter table core.nda_events enable row level security;
grant all on core.nda_events to service_role;

-- status / 公開フラグ / 合意日 のいずれかが変わったらスナップショットを1行残す。
create function core.log_nda_event() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.status is distinct from old.status
     or new.publish_problems is distinct from old.publish_problems
     or new.publish_deliverables is distinct from old.publish_deliverables
     or new.publish_metrics is distinct from old.publish_metrics
     or new.publish_testimonial is distinct from old.publish_testimonial
     or new.agreed_on is distinct from old.agreed_on then
    insert into core.nda_events
      (nda_id, status, publish_problems, publish_deliverables, publish_metrics, publish_testimonial, agreed_on)
    values
      (new.id, new.status, new.publish_problems, new.publish_deliverables, new.publish_metrics, new.publish_testimonial, new.agreed_on);
  end if;
  return new;
end;
$$;

create trigger trg_nda_event after insert or update on core.ndas
  for each row execute function core.log_nda_event();

-- 既存 NDA の現状態をベースライン履歴として backfill（fresh では ndas 未挿入で no-op）。
insert into core.nda_events (nda_id, status, publish_problems, publish_deliverables, publish_metrics, publish_testimonial, agreed_on)
select id, status, publish_problems, publish_deliverables, publish_metrics, publish_testimonial, agreed_on from core.ndas;

-- migrate:down
drop trigger if exists trg_nda_event on core.ndas;
drop function if exists core.log_nda_event();
drop table if exists core.nda_events;
alter table core.ndas drop constraint if exists ndas_agreed_needs_date;
alter table core.invoices drop constraint if exists invoices_due_after_issue;
alter table core.invoices drop constraint if exists invoices_sent_needs_issue;
alter table core.invoices drop constraint if exists invoices_paid_needs_date;
alter table core.clients drop column if exists address;
alter table core.invoices drop column if exists paid_amount;
alter table core.invoices drop column if exists withholding;
