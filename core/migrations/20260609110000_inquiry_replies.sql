-- migrate:up
-- 問い合わせへ送った返信（append-only ログ）。スレッド表示の正本。内部のみ。
-- 顧客からの受信は studio に取り込まないため、ここに入るのは送信（outbound）のみ。
create table core.inquiry_replies (
  id uuid default gen_random_uuid() not null,
  inquiry_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now() not null,
  constraint inquiry_replies_pkey primary key (id),
  constraint inquiry_replies_inquiry_id_fkey foreign key (inquiry_id) references core.inquiries(id) on delete cascade
);

create index idx_inquiry_replies_inquiry on core.inquiry_replies using btree (inquiry_id, created_at);

alter table core.inquiry_replies enable row level security;

grant all on table core.inquiry_replies to service_role;

-- migrate:down
drop table if exists core.inquiry_replies;
