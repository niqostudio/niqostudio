-- migrate:up
-- 外部システム（freee 等の会計／業務システム）との連携 id。1外部レコード↔1 core 行で対応づける。
-- 主用途は会計（freee）連携：clients↔取引先・projects↔案件・invoices↔取引/請求。値は外部の id をそのまま持つ。
alter table core.clients add column external_id text;
alter table core.projects add column external_id text;
alter table core.invoices add column external_id text;

-- 同じ外部レコードを二重に紐付けない（非 null のみ一意）。
create unique index idx_clients_external on core.clients (external_id) where external_id is not null;
create unique index idx_projects_external on core.projects (external_id) where external_id is not null;
create unique index idx_invoices_external on core.invoices (external_id) where external_id is not null;

-- migrate:down
drop index if exists core.idx_invoices_external;
drop index if exists core.idx_projects_external;
drop index if exists core.idx_clients_external;
alter table core.invoices drop column if exists external_id;
alter table core.projects drop column if exists external_id;
alter table core.clients drop column if exists external_id;
