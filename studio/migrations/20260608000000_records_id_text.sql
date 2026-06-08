-- migrate:up
-- 下書き records.id は接続先（core）の id をそのまま保持する。core の id は uuid とは限らず、
-- profile は text 'singleton'。record_versions.record_id は既に text なので records.id も text に揃える。
alter table studio.records alter column id drop default;
alter table studio.records alter column id type text using id::text;

-- migrate:down
alter table studio.records alter column id type uuid using id::uuid;
alter table studio.records alter column id set default gen_random_uuid();
