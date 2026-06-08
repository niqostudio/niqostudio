-- migrate:up
-- 顧客担当者（人）。clients（会社）に N:1 で紐付く。問い合わせから変換で作られ、案件化で会社に割り当てる。
-- client_id は任意（変換直後は会社未割当）。内部のみ＝公開 view には出さない。
create table core.contacts (
  id uuid default gen_random_uuid() not null,
  client_id uuid,
  name text not null,
  email text,
  phone text,
  role text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint contacts_pkey primary key (id),
  constraint contacts_client_id_fkey foreign key (client_id) references core.clients(id) on delete set null
);

create index idx_contacts_client on core.contacts using btree (client_id);

create trigger set_updated_at_contacts before update on core.contacts
  for each row execute function core.set_updated_at();

alter table core.contacts enable row level security;

grant all on table core.contacts to service_role;

-- migrate:down
drop table if exists core.contacts;
