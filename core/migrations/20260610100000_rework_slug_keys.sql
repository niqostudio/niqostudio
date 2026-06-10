-- migrate:up

-- 公開 URL キーは「人手で命名しない短い不透明 id」。base62・長さ可変。
-- 秘密ではなく一意性は制約が担保するため、暗号強度は要らない（random で十分）。
create or replace function core.gen_short_id(size int default 10)
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
           1 + floor(random() * 62)::int, 1), '')
  from generate_series(1, size);
$$;

-- showcase_entries.slug は手書きをやめ、既定で 10 桁の不透明 id を自動採番（UNIQUE は維持）。
alter table core.showcase_entries alter column slug set default core.gen_short_id(10);

-- clients.slug は公開 URL を持たず誰も読まない（公開 view にも website にも出ない）ため削除。
-- FK はすべて clients(id) 参照で slug を縛っているのは clients_slug_key のみ＝列削除で一緒に落ちる。
alter table core.clients drop column slug;

-- migrate:down

alter table core.clients add column slug text;
alter table core.showcase_entries alter column slug drop default;
drop function if exists core.gen_short_id(int);
