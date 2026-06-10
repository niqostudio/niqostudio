-- migrate:up
-- 請求書（最小）。受託の請求・入金消込を studio で確認/編集するための正本。
-- 会計・確定申告・税の正本ではない（外部 / 範囲外）。源泉・分割入金は必要になれば後段。
create table core.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references core.clients (id) on delete restrict,
  project_id uuid references core.projects (id) on delete set null,
  invoice_no text,
  title text,
  subtotal numeric not null default 0 check (subtotal >= 0),
  tax numeric not null default 0 check (tax >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  issued_on date,
  due_on date,
  paid_on date,
  pdf_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_invoices before update on core.invoices
  for each row execute function core.set_updated_at();

create unique index idx_invoices_no on core.invoices (invoice_no) where invoice_no is not null;
create index idx_invoices_client on core.invoices (client_id);
create index idx_invoices_project on core.invoices (project_id);
create index idx_invoices_status on core.invoices (status);
create index idx_invoices_due on core.invoices (due_on);

-- 内部専用（財務）。RLS 有効＝deny-all、anon には一切出さない。管理は service_role。
alter table core.invoices enable row level security;
grant all on core.invoices to service_role;

-- migrate:down
drop table if exists core.invoices;
