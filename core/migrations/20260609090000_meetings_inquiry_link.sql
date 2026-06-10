-- migrate:up
-- 打ち合わせを問い合わせ（無料相談）にも紐付けられるようにする。顧客化せず inquiry に直接紐付ける。
-- これに伴い client は任意にする（顧客・案件・問い合わせのいずれにも紐付けられる打ち合わせ）。
alter table core.meetings
  alter column client_id drop not null,
  add column inquiry_id uuid,
  add constraint meetings_inquiry_id_fkey foreign key (inquiry_id) references core.inquiries(id) on delete set null;

create index idx_meetings_inquiry on core.meetings using btree (inquiry_id);

-- migrate:down
alter table core.meetings
  drop constraint meetings_inquiry_id_fkey,
  drop column inquiry_id,
  alter column client_id set not null;
