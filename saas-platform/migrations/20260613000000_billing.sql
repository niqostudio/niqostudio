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
-- webhook 処理は `UPDATE ... WHERE provider_synced_at IS NULL OR provider_synced_at < $event_time`
-- の条件付き UPDATE に限定する（並行 webhook の lost update を防ぐ・実装規約）。
ALTER TABLE identity.product_grants ADD COLUMN provider_synced_at timestamptz;

-- migrate:down
