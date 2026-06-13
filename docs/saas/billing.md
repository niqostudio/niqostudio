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
| `billing-checkout` | 匿名＋任意 identity（user JWT で org 確定・決済メール固定。無効 JWT は 401）。registry 突合・origin 允許・整合・レート制限 → PSP の checkout URL |
| `billing-return` | success_url の中継。session 検証 → レシート発行 → 製品へ `#receipt=` で 302 |
| `billing-webhook` | PSP→billing。署名検証 → 正規化 → org 確定（metadata 優先・匿名は get-or-create user）→ record_event |
| `billing-keys` | レシート検証用 JWKS（Ed25519・kid 付き・auth の JWKS とは別系統） |
| `billing-portal` | ログイン必須。org の customer link → PSP Billing Portal の URL（解約・支払い方法・請求書のセルフサービス） |

## 必要な secret / env（関数）

**置き場の原則**：関数の secret は **niqostudio-saas プロジェクトに `supabase secrets set` で入れる**
（関数が動くプラットフォームに置く＝website の `wrangler secret` と同じ発想）。GitHub Environment ではない
（Environment に置くのは migration 用の `SUPABASE_DB_URL` だけ・[ADR 0007](../adr/0007-saas-identity-project.md)）。
ローカルは `saas-platform/functions/.env.local`（gitignore）。

| 名前 | 本番の置き場 | ローカルの置き場 | 用途・取得元 |
| --- | --- | --- | --- |
| `SUPABASE_DB_URL` / `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | 自動注入 | 自動注入 | DB 直結・webhook の Admin API。設定不要 |
| `STRIPE_SECRET_KEY` | `supabase secrets set`（saas） | `.env.local` | Stripe（本番）→ Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | 〃 | 〃 | webhook 登録時の `whsec_`（本番=ダッシュボード / ローカル=`stripe listen`） |
| `RECEIPT_SIGNING_KEY` | 〃 | 〃 | `node scripts/gen-receipt-key.mjs` の出力（Ed25519 秘密 JWK） |
| `RECEIPT_PUBLIC_KEY` | 〃 | 〃 | 同上（公開 JWK・billing-keys が配る・非機密だが同じ経路で入れる） |
| `BILLING_ALLOWED_ORIGINS` | **`release` が config から自動投入** | 〃 | 正本＝`config.<env>.json` の `saas.billing.allowed_origins`。config を更新して release（apply）すれば反映＝手動の secrets set 不要 |
| `BILLING_PUBLIC_URL` | **不要** | `.env.local` | 本番は `SUPABASE_URL` が公開 URL。ローカルだけ内部ホスト回避で明示 |

本番の secret 投入（`--project-ref` は niqostudio-saas の ref）：

```sh
node scripts/gen-receipt-key.mjs   # → RECEIPT_SIGNING_KEY / RECEIPT_PUBLIC_KEY の2行を控える
supabase secrets set --project-ref <saas-ref> \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  RECEIPT_SIGNING_KEY='{"kty":"OKP",...}' \
  RECEIPT_PUBLIC_KEY='{"kty":"OKP",...}'
# BILLING_ALLOWED_ORIGINS は手動で入れない（release の saas job が config から毎 apply 投入する）
# 確認: supabase secrets list --project-ref <saas-ref>（値は表示されない）
```

鍵はコミットしない。`supabase secrets set` で入れた値は Supabase 側に暗号化保存され、関数に注入される。

## ローカル E2E（Stripe test mode）

要 Docker・Stripe test アカウント。env は `saas-platform/functions/.env.local`（`.env.local.example` を雛形に）。

1. saas スタック起動＋スキーマ：`pnpm saas:start` → `pnpm saas:reset`。
2. **製品・offer を Stripe test に反映**：core（内部スタック）に products(is_saas)＋product_offers を投入
   （seed・`seeds/*.sql` は gitignore）→ `node scripts/saas-products-export.mjs` →
   `STRIPE_API_KEY=sk_test_... terraform -chdir=stacks/stripe init -reconfigure && apply`
   （ローカル state は backend override で local・lookup key `<code>_<key>` の Price ができる）→
   `node scripts/saas-products-identity-sync.mjs`（saas DB の identity.products / billing.product_offers 射影）。
3. `.env.local` を作成：`STRIPE_SECRET_KEY`（test）・`RECEIPT_*`（`node scripts/gen-receipt-key.mjs`）・
   `BILLING_ALLOWED_ORIGINS={"demo-app":["http://localhost:3000"]}`・`BILLING_PUBLIC_URL=http://127.0.0.1:55321`。
4. 関数を serve：`pnpm saas:functions:serve`（junction で saas-platform/functions を CLI パスへ繋いで起動）。
5. checkout を作成：`curl -XPOST http://127.0.0.1:55321/functions/v1/billing-checkout
   -d '{"product":"demo-app","offer":"launch_pass","scope":"proj-x","success_url":"http://localhost:3000/success","cancel_url":"http://localhost:3000/cancel"}'`。
6. **webhook の検証は2通り**：
   - Stripe CLI 無し：`WEBHOOK_SECRET=<.env.local の値> node scripts/stripe-webhook-sim.mjs [checkout|invoice|refund]`
     （署名付き合成イベントを投げる）。
   - 実決済：`stripe listen --forward-to http://127.0.0.1:55321/functions/v1/billing-webhook` で `whsec_` を
     `.env.local` に入れ serve 再起動 → checkout URL をブラウザで test カード `4242 4242 4242 4242` 決済。
7. 確認：`billing.purchases` に行・匿名 provisioning で個人 org 生成・`identity.product_grants` が active・
   成功 URL に `#receipt=` が付く。

## デプロイ（本番）

1. **関数 secret（初回のみ・release より先）**：上記「必要な secret / env」の `supabase secrets set` を実行
   （`RECEIPT_*` は鍵生成して投入）。
2. **migration ＋ 関数 ＋ 商品同期**：`release`（apply=true）を dispatch。**同一コミットから
   saas migration → Edge Functions deploy、続けて商品マスタの Stripe / identity 同期**まで依存順で行う
   （schema と関数の取り合わせ・反映順序を手で組まない。[デプロイ手順](../deploy.md)）。
   商品は事前に studio で core に登録（is_saas・offers）しておく。
3. **webhook 登録（手動・whsec を state に残さない規約）**：Stripe ダッシュボードで endpoint
   `https://<saas-ref>.supabase.co/functions/v1/billing-webhook` を登録 →
   `checkout.session.completed` / `invoice.paid` / `charge.refunded` / `charge.dispute.created` /
   `customer.subscription.deleted` を購読 →
   署名シークレット `whsec_` を `supabase secrets set STRIPE_WEBHOOK_SECRET=...` で投入。
4. **製品 origin**：`config.<env>.json` の `saas.billing.allowed_origins` に追加 → `release`（apply）で反映
   （saas job が config から `BILLING_ALLOWED_ORIGINS` を自動投入）。
   `BILLING_PUBLIC_URL` は本番不要（`SUPABASE_URL` が公開 URL）。
5. **Billing Portal 設定（手動・初回のみ）**：Stripe ダッシュボード → Settings → Billing → Customer portal で
   構成を保存する（解約の可否・即時/期末・表示項目はここが正本）。未保存だと `billing-portal` の
   セッション発行が失敗する。

> 可用性結合：billing 停止＝全製品で販売停止。free tier の一時停止が販売も塞ぐため、実ユーザーが付いたら
> 有料化を前倒し（[ADR 0008](../adr/0008-saas-billing-centralized.md)）。
