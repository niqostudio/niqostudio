-- migrate:up
-- スキーマ・レビュー反映（a/b/c）。

-- A. meetings.client_id を SET NULL に（client は任意・案件/問い合わせにも紐づくため、
--    顧客削除で打ち合わせまで消さない）。
alter table core.meetings drop constraint meetings_client_id_fkey;
alter table core.meetings add constraint meetings_client_id_fkey
  foreign key (client_id) references core.clients(id) on delete set null;

-- B. 問い合わせ→担当者の変換リンク。旧フローの converted_client_id（顧客）を
--    converted_contact_id（担当者）へ置き換える。drop column が依存 FK/index も落とす。
alter table core.inquiries drop column converted_client_id;
alter table core.inquiries add column converted_contact_id uuid;
alter table core.inquiries add constraint inquiries_converted_contact_id_fkey
  foreign key (converted_contact_id) references core.contacts(id) on delete set null;
create index idx_inquiries_converted_contact on core.inquiries using btree (converted_contact_id);

-- C. 案件の主担当者（任意）。案件化のとき元の担当者を紐付ける。
alter table core.projects add column contact_id uuid;
alter table core.projects add constraint projects_contact_id_fkey
  foreign key (contact_id) references core.contacts(id) on delete set null;
create index idx_projects_contact on core.projects using btree (contact_id);

-- migrate:down
alter table core.projects drop constraint projects_contact_id_fkey, drop column contact_id;
alter table core.inquiries drop column converted_contact_id;
alter table core.inquiries add column converted_client_id uuid;
alter table core.inquiries add constraint inquiries_converted_client_id_fkey
  foreign key (converted_client_id) references core.clients(id) on delete set null;
alter table core.meetings drop constraint meetings_client_id_fkey;
alter table core.meetings add constraint meetings_client_id_fkey
  foreign key (client_id) references core.clients(id) on delete cascade;
