-- migrate:up

-- 運営者の法務情報（特商法表記の事業者ブロック等）。SaaS 製品が各自のドメインに持つ
-- 特商法ページの事業者欄を、website 配信の operator.json 経由で描画するための正本。
-- 氏名・住所等を git に置かないため、値はコンソール / studio から投入する（jsonb の形は docs/core/schema.md）。
alter table core.profile add column legal_jp jsonb;

-- operator.json の源になるため公開 view の列挙へ追加（列挙＝公開列の契約、の作法どおり再作成）。
drop view if exists core.public_profile;
create view core.public_profile as
  select id, display_name, handle, tagline, bio, skills, operation_policy,
         contact_email, social_links, logo_svg, legal_jp
  from core.profile;
grant select on core.public_profile to anon;
grant all on core.public_profile to service_role;

-- migrate:down
