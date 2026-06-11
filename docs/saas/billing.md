# billing 運用（Edge Functions・Stripe）

> SaaS 課金（billing v1）の構成・デプロイ・ローカル E2E 手順。設計は [ADR 0008](../adr/0008-saas-billing-centralized.md)、
> 製品との取り決めは [製品統合契約](contract.md)、全体像は [アーキテクチャ](architecture.md)。

## 構成

- コードは `saas-platform/functions/`（Deno / TypeScript）。PSP は port（`_shared/provider.ts`）の背後で、
  初期 adapter は Stripe（`_shared/stripe.ts`）＝固有名はこの1ファイルに隔離。
- 決済反映の核は **SQL 関数 `billing.record_event`**（冪等・順序ガード・台帳 append・grants 再計算）。
  Edge Function は「署名検証→正規化→record_event 呼び出し」の薄いアダプタ。
- billing スキーマは Data API 非露出のため、関数は `SUPABASE_DB_URL` で **DB 直結**（PostgREST を経由しない）。

| 関数 | 役割 |
| --- | --- |
| `billing-prices` | 公開。現行版 offer 一覧（製品の /pricing が読む） |
| `billing-checkout` | 匿名。registry 突合・origin 允許・整合・レート制限 → PSP の checkout URL |
| `billing-return` | success_url の中継。session 検証 → レシート発行 → 製品へ `#receipt=` で 302 |
| `billing-webhook` | PSP→billing。署名検証 → 正規化 →（匿名は get-or-create user）→ record_event |
| `billing-keys` | レシート検証用 JWKS（Ed25519・kid 付き・auth の JWKS とは別系統） |

## 必要な secret / env（関数）

| 名前 | 種別 | 用途 |
| --- | --- | --- |
| `SUPABASE_DB_URL` | 自動注入 | DB 直結（billing/identity） |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | 自動注入 | webhook の Admin API（匿名 provisioning） |
| `STRIPE_SECRET_KEY` | ✋ secret | Stripe adapter |
| `STRIPE_WEBHOOK_SECRET` | ✋ secret | webhook 署名検証（`stripe listen` / dashboard が発行） |
| `RECEIPT_SIGNING_KEY` | ✋ secret | レシート署名（Ed25519 秘密 JWK・`pnpm exec node scripts/gen-receipt-key.mjs`） |
| `RECEIPT_PUBLIC_KEY` | ✋ secret(非機密) | billing-keys が配る公開 JWK |
| `BILLING_ALLOWED_ORIGINS` | ✋ | `config.<env>.json` の `saas.billing.allowed_origins`（JSON）由来 |

鍵生成：`node scripts/gen-receipt-key.mjs` → 出力2行を関数 secret に設定（鍵はコミットしない）。

## ローカル E2E（Stripe test mode）

要 Docker・Stripe test アカウント。

1. saas スタック起動＋スキーマ：`pnpm saas:start` → `pnpm saas:reset`。
2. 製品・offer を投入：`scripts/saas-products-identity-sync.mjs` に test 用 products JSON を食わせる
   （`PRODUCTS_JSON=… node scripts/saas-products-identity-sync.mjs`）。Stripe ダッシュボード（test）に
   同じ lookup key（`<code>_<key>_v<version>`）の Price を作る。
3. 関数 env を用意（`infra/supabase-saas/supabase/functions/.env` 等・gitignore）：上表の secret。
   `BILLING_ALLOWED_ORIGINS={"demo-app":["http://localhost:3000"]}`。
4. 関数を serve：`supabase --workdir supabase-saas functions serve`（CLI 同梱 Deno）。
5. webhook を中継：`stripe listen --forward-to localhost:5432X/functions/v1/billing-webhook`
   → 表示される `whsec_…` を `STRIPE_WEBHOOK_SECRET` に。
6. checkout を作成：`curl -XPOST .../functions/v1/billing-checkout -d '{product,offer,scope,success_url,cancel_url}'`
   → 返った URL をブラウザで開き、Stripe の test カード（4242…）で決済。
7. 確認：`billing.purchases` に行・`identity.product_grants` が active・成功 URL に `#receipt=` が付く。

## デプロイ（本番）

1. `node scripts/gen-receipt-key.mjs` で鍵を生成し、関数 secret に設定。
2. Stripe（本番）に Price を作る（`saas-products: sync` の `stacks/stripe` が lookup key を管理）。
   `STRIPE_SECRET_KEY` を関数 secret に。
3. `supabase functions deploy billing-prices billing-checkout billing-return billing-webhook billing-keys
   --project-ref <saas-ref>`。
4. Stripe ダッシュボードで webhook endpoint（`.../functions/v1/billing-webhook`）を登録し、
   `checkout.session.completed` / `invoice.paid` / `charge.refunded` / `charge.dispute.created` を購読、
   署名シークレットを `STRIPE_WEBHOOK_SECRET` に。
5. `config.<env>.json` の `saas.billing.allowed_origins` に製品 origin を足し、`BILLING_ALLOWED_ORIGINS` を更新。

> 可用性結合：billing 停止＝全製品で販売停止。free tier の一時停止が販売も塞ぐため、実ユーザーが付いたら
> 有料化を前倒し（[ADR 0008](../adr/0008-saas-billing-centralized.md)）。
