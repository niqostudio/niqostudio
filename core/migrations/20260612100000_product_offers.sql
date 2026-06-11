-- migrate:up

-- products はポートフォリオ台帳（SaaS・受託成果物・niqostudio 自身が混在）。
-- このうち「顧客がサインアップ・課金できる SaaS 製品」を is_saas で明示し、
-- saas 側レジストリ（identity.products）への射影と Stripe 反映の対象集合にする。
alter table core.products add column is_saas boolean not null default false;

-- SaaS 製品の商品（offer・価格）マスタ。core.products（製品）に対する販売単位で、
-- Stripe への反映（infra/stacks/stripe・lookup key = <products.slug>_<key>_v<version>）と
-- billing service の plan 解決の正本。billing_interval NULL＝一回課金 / 値あり＝サブスクリプション。
-- unit_amount は最小通貨単位（usd ならセント）。
-- 売値の定義（currency / unit_amount / billing_interval）は version 単位で不変：
-- 反映先の Stripe price が immutable で、販売済み entitlement の意味も事後に変えないため。
-- 改定＝新 version 行を追加し is_active を切り替える。
create table core.product_offers (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references core.products (id) on delete cascade,
    key text not null,
    version integer not null default 1 check (version >= 1),
    currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
    unit_amount integer not null check (unit_amount > 0),
    billing_interval text check (billing_interval in ('day', 'week', 'month', 'year')),
    -- 一回課金の付与窓（日数・NULL=無期限）。表示（billing-prices）と grant.expires_at の計算が
    -- 両方ここから出る＝単一の正本（製品側のハードコード表示とのドリフトを防ぐ）。
    -- サブスクは期間を billing_interval が表現するため持たない（相互排他）。
    access_period_days integer check (access_period_days > 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (product_id, key, version),
    check (access_period_days is null or billing_interval is null)
);

-- 販売中の版は offer キーごとに1つ（billing は「key の現行版」だけを解決すればよい）。
create unique index product_offers_active_key on core.product_offers (product_id, key)
    where is_active;

create trigger set_updated_at before update on core.product_offers
    for each row execute function core.set_updated_at();

-- 不変性を DB で強制：改定は UPDATE でなく新 version 行（is_active の切替と timestamps のみ可変）。
create function core.enforce_product_offer_immutability() returns trigger
    language plpgsql
    set search_path = ''
    as $$
begin
  if (new.product_id, new.key, new.version, new.currency, new.unit_amount)
     is distinct from (old.product_id, old.key, old.version, old.currency, old.unit_amount)
     or new.billing_interval is distinct from old.billing_interval
     or new.access_period_days is distinct from old.access_period_days then
    raise exception '商品定義は不変です。改定は新しい version の行を追加してください'
      using errcode = 'check_violation';
  end if;
  return new;
end$$;

create trigger enforce_product_offer_immutability before update on core.product_offers
    for each row execute function core.enforce_product_offer_immutability();

-- 内部専用（価格マスタ）。RLS 有効＝deny-all、anon には一切出さない。管理は service_role（studio）。
alter table core.product_offers enable row level security;
grant all on core.product_offers to service_role;

-- migrate:down
