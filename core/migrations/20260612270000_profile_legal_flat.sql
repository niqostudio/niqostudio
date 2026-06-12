-- migrate:up

-- 特商法の事業者ブロックを jsonb から個別列へ（studio で項目別に編集するため・本番未投入のうちに置換）。
-- 表示は二択：住所＋電話番号を表示する（セットで必須）か、両方を省略して
-- 「請求があり次第遅滞なく開示する」旨の文言を表示するか。事業者名（本名）は常に必須。
-- operator.json への出力形（legal_jp_tokushoho）は website の射影層が組む＝製品契約は不変。
-- view が legal_jp に依存するため先に落とす（公開列の契約＝列挙、の作法どおり最後に再作成）。
drop view if exists core.public_profile;

alter table core.profile drop column legal_jp;
alter table core.profile add column legal_seller_name text;
alter table core.profile add column legal_responsible_person text;
alter table core.profile add column legal_address text;
alter table core.profile add column legal_phone text;
alter table core.profile add column legal_contact_email text;
alter table core.profile add column legal_disclosure_policy text;

create view core.public_profile as
  select id, display_name, handle, tagline, bio, skills, operation_policy,
         contact_email, social_links, logo_svg,
         legal_seller_name, legal_responsible_person, legal_address, legal_phone,
         legal_contact_email, legal_disclosure_policy
  from core.profile;
grant select on core.public_profile to anon;
grant all on core.public_profile to service_role;

-- migrate:down
