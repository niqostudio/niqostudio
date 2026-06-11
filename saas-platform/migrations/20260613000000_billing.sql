-- migrate:up

-- 課金（billing）の土台。grants（現在の authz 状態）とは別に、購入の事実台帳・PSP イベント・
-- 価格解決の射影を持つ。billing スキーマは Data API に露出しない（service_role 専用）。
-- PSP（決済代行）は ports/adapters で交換しうるため、**テーブル名・列名に PSP 固有名を出さない**。
-- PSP の識別子は provider（'stripe' 等）＋ external_* で中立に持つ。

CREATE SCHEMA IF NOT EXISTS billing;
-- Data API 非露出の多層防御：PUBLIC 経由の暗黙 USAGE を明示遮断し、service_role のみに開く。
REVOKE ALL ON SCHEMA billing FROM public;
GRANT USAGE ON SCHEMA billing TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA billing GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA billing GRANT ALL ON SEQUENCES TO service_role;

-- 既知 PSP の名前（表記揺れ事故を防ぐ参照マスタ。adapter 追加時に行を足す）。
CREATE TABLE billing.providers (
    code text PRIMARY KEY
);
INSERT INTO billing.providers (code) VALUES ('stripe');
ALTER TABLE billing.providers ENABLE ROW LEVEL SECURITY;
GRANT ALL ON billing.providers TO service_role;


-- 価格マスタの射影：正本は core.product_offers（別 DB）。billing は実行時に core を読まないため、
-- 製品ごとの「現行版 offer」をここで解決する。sync workflow が products と同時に upsert する。
-- 射影なので不変性トリガは持たない（正本側 core.product_offers がトリガで担保）。
CREATE TABLE billing.product_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES identity.products (id) ON DELETE RESTRICT,
    key text NOT NULL,
    version integer NOT NULL CHECK (version >= 1),
    currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
    unit_amount integer NOT NULL CHECK (unit_amount > 0),
    billing_interval text,             -- NULL=一回課金 / 値あり=サブスク
    access_period_days integer,        -- 一回課金の付与窓（日数・NULL=無期限）
    is_active boolean NOT NULL DEFAULT true,
    synced_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, key, version),
    -- 一回課金（access_period_days）とサブスク（billing_interval）は相互排他。
    CHECK (num_nonnulls(billing_interval, access_period_days) <= 1)
);
-- 現行版（販売中）は (product, key) ごとに1つ＝billing-prices と checkout の解決先。
-- 全版 inactive（0件）は許容＝販売停止。価格解決クエリが active 不在なら checkout を拒否する。
CREATE UNIQUE INDEX product_offers_active_key ON billing.product_offers (product_id, key)
    WHERE is_active;
ALTER TABLE billing.product_offers ENABLE ROW LEVEL SECURITY;
GRANT ALL ON billing.product_offers TO service_role;


-- PSP イベントの冪等性。(provider, event_id) で名前空間を分離し、PSP 側の発生時刻で順序を判定、
-- processed_at で「受信」と「処理完了」を分ける（webhook 再送・複数 endpoint・順序逆転に強い）。
-- provider_created_at は NOT NULL（順序ガードの比較が NULL で穴にならないようにする）。
CREATE TABLE billing.provider_events (
    provider text NOT NULL REFERENCES billing.providers (code),
    event_id text NOT NULL,
    type text NOT NULL,
    provider_created_at timestamptz NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,          -- NULL=未処理（受信即記録→冪等再処理可）
    PRIMARY KEY (provider, event_id)
);
ALTER TABLE billing.provider_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON billing.provider_events TO service_role;


-- org ↔ PSP customer（サブスクの継続課金）。provider 込みで複数 PSP 併存・切替に耐える。
-- アクティブは (provider, org) ごとに1件（部分 unique）。customer 作り直しは旧を inactive で残す。
CREATE TABLE billing.customer_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL REFERENCES billing.providers (code),
    organization_id uuid NOT NULL REFERENCES identity.organizations (id) ON DELETE CASCADE,
    external_customer_id text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, external_customer_id)
);
CREATE UNIQUE INDEX customer_links_active_org ON billing.customer_links (provider, organization_id)
    WHERE is_active;
ALTER TABLE billing.customer_links ENABLE ROW LEVEL SECURITY;
GRANT ALL ON billing.customer_links TO service_role;


-- 購入台帳（append-only の事実）。grants は現在状態、ここは「いつ何が起きたか」。
-- 返金・dispute は元行を更新せず新規行で連鎖（parent_id）。org 削除でも台帳は残す（監査・返金紛争）。
-- offer_key/offer_version は購入時点のスナップショット（射影が変わっても台帳を壊さないため FK は張らない）。
CREATE TABLE billing.purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES identity.organizations (id) ON DELETE SET NULL,
    customer_email text,               -- 購入時点スナップショット（匿名経路の追跡）
    product_id uuid NOT NULL REFERENCES identity.products (id) ON DELETE RESTRICT,
    offer_key text NOT NULL,
    offer_version integer,             -- どの価格版で買ったかを固定
    scope text,                        -- NULL=org 全体（サブスク）/ 値あり=対象束縛
    kind text NOT NULL CHECK (kind IN ('purchase', 'renewal', 'refund', 'chargeback', 'dispute')),
    parent_id uuid REFERENCES billing.purchases (id) ON DELETE RESTRICT,  -- refund/dispute の元購入
    provider text NOT NULL REFERENCES billing.providers (code),
    external_checkout_id text,         -- 一回課金 / 初回（checkout 単位）
    external_payment_id text,
    external_invoice_id text,          -- サブスク更新（checkout を持たない）
    source_event_id text,              -- 生成元イベント（provider と組で provider_events を指す）
    amount integer NOT NULL CHECK (amount >= 0),
    currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    -- 誰の購入か不明な事実行を作らない（匿名経路でも最終的に org か email は埋まる）。
    CHECK (num_nonnulls(organization_id, customer_email) >= 1),
    UNIQUE (provider, external_checkout_id),
    UNIQUE (provider, external_invoice_id),
    -- 冪等性の主担保：同一イベントの再処理で台帳が二重 append されない。
    UNIQUE (provider, source_event_id),
    FOREIGN KEY (provider, source_event_id) REFERENCES billing.provider_events (provider, event_id)
);
CREATE INDEX purchases_org_idx ON billing.purchases (organization_id);
CREATE INDEX purchases_parent_idx ON billing.purchases (parent_id);
ALTER TABLE billing.purchases ENABLE ROW LEVEL SECURITY;
GRANT ALL ON billing.purchases TO service_role;


-- grants 側に PSP イベントの順序ガードを足す（古いイベントで新しい状態を上書きしない）。
ALTER TABLE identity.product_grants ADD COLUMN provider_synced_at timestamptz;


-- 決済イベントの反映（webhook の核）。冪等・原子・順序ガードを SQL 内で完結させ、Edge Function は
-- 署名検証とイベント正規化に徹する。1 イベント＝1 呼び出し＝（provider_events 記録 → purchases 台帳
-- append → grants 再計算）を1トランザクションで。同一イベント再処理は no-op を返す。
--
-- kind: purchase / renewal は付与（active・期限延長）、refund / chargeback / dispute は失効（suspend）。
-- 一回課金（p_scope 非 NULL かつ p_period_end NULL）は now()+access_period_days を期限にする
-- （access_period_days NULL=無期限）。サブスク（p_scope NULL）は p_period_end を期限にする。
CREATE FUNCTION billing.record_event(
    p_provider text,
    p_event_id text,
    p_event_type text,
    p_event_at timestamptz,
    p_org_id uuid,
    p_customer_email text,
    p_product_code text,
    p_offer_key text,
    p_offer_version integer,
    p_scope text,
    p_kind text,
    p_amount integer,
    p_currency text,
    p_external_checkout_id text DEFAULT NULL,
    p_external_payment_id text DEFAULT NULL,
    p_external_invoice_id text DEFAULT NULL,
    p_period_end timestamptz DEFAULT NULL,
    p_parent_id uuid DEFAULT NULL
) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''
    AS $$
declare
  v_product_id uuid;
  v_access_days integer;
  v_expires_at timestamptz;
  v_new_status text;
  v_inserted integer;
begin
  -- 冪等：イベントを記録。既処理なら no-op で返す。
  insert into billing.provider_events (provider, event_id, type, provider_created_at)
  values (p_provider, p_event_id, p_event_type, p_event_at)
  on conflict (provider, event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    if exists (select 1 from billing.provider_events
               where provider = p_provider and event_id = p_event_id and processed_at is not null) then
      return 'duplicate';
    end if;
  end if;

  select id into v_product_id from identity.products where code = p_product_code;
  if v_product_id is null then
    update billing.provider_events set processed_at = now()
    where provider = p_provider and event_id = p_event_id;
    return 'unknown_product';
  end if;

  -- 台帳 append（冪等：同一イベントの再処理で二重計上しない）。
  insert into billing.purchases
    (organization_id, customer_email, product_id, offer_key, offer_version, scope, kind, parent_id,
     provider, external_checkout_id, external_payment_id, external_invoice_id, source_event_id, amount, currency)
  values
    (p_org_id, p_customer_email, v_product_id, p_offer_key, p_offer_version, p_scope, p_kind, p_parent_id,
     p_provider, p_external_checkout_id, p_external_payment_id, p_external_invoice_id, p_event_id, p_amount, p_currency)
  on conflict (provider, source_event_id) do nothing;

  -- grants 再計算（org 未確定＝匿名 claim 前は grants を触らない＝レシートで解錠）。
  if p_org_id is not null then
    if p_kind in ('purchase', 'renewal') then
      v_new_status := 'active';
      if p_scope is not null and p_period_end is null then
        select access_period_days into v_access_days
        from billing.product_offers
        where product_id = v_product_id and key = p_offer_key and is_active;
        v_expires_at := case when v_access_days is null then null else now() + make_interval(days => v_access_days) end;
      else
        v_expires_at := p_period_end;
      end if;
    else
      v_new_status := 'suspended';
      v_expires_at := null;
    end if;

    -- scope の有無で対応する partial unique が違うため、分岐して単一 upsert にする。
    -- 順序ガード：自分より新しいイベントが既に反映済みなら上書きしない。
    if p_scope is null then
      insert into identity.product_grants
        (organization_id, product_id, plan, scope, status, expires_at, provider_synced_at)
      values (p_org_id, v_product_id, p_offer_key, null, v_new_status, v_expires_at, p_event_at)
      on conflict (organization_id, product_id) where scope is null
      do update set
        plan = excluded.plan, status = excluded.status, expires_at = excluded.expires_at,
        provider_synced_at = excluded.provider_synced_at
      where identity.product_grants.provider_synced_at is null
         or identity.product_grants.provider_synced_at < excluded.provider_synced_at;
    else
      insert into identity.product_grants
        (organization_id, product_id, plan, scope, status, expires_at, provider_synced_at)
      values (p_org_id, v_product_id, p_offer_key, p_scope, v_new_status, v_expires_at, p_event_at)
      on conflict (organization_id, product_id, scope) where scope is not null
      do update set
        plan = excluded.plan, status = excluded.status, expires_at = excluded.expires_at,
        provider_synced_at = excluded.provider_synced_at
      where identity.product_grants.provider_synced_at is null
         or identity.product_grants.provider_synced_at < excluded.provider_synced_at;
    end if;
  end if;

  update billing.provider_events set processed_at = now()
  where provider = p_provider and event_id = p_event_id;
  return 'applied';
end$$;

REVOKE ALL ON FUNCTION billing.record_event FROM public;
GRANT EXECUTE ON FUNCTION billing.record_event TO service_role;

-- migrate:down
