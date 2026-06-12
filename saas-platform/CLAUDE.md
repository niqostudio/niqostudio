# CLAUDE.md — saas-platform

SaaS 共通基盤（Supabase プロジェクト **niqostudio-saas**・PostgreSQL 17）。データ層と、
その上のアプリケーションコード（billing service＝Edge Functions・後段実装）を持つモジュール。
アカウントの正本は Supabase Auth（`auth.users`）、その上の `identity` スキーマ
（users / organizations / memberships / products / product_grants）。
core とは**別 DB・別信頼ドメイン**（顧客向け）。設計判断は [ADR 0007](../docs/adr/0007-saas-identity-project.md)
／課金・マスタは [ADR 0008](../docs/adr/0008-saas-billing-centralized.md)。
製品側との取り決めの正本は [製品統合契約](../docs/saas/contract.md)。

`product_grants` は**スコープと期限を持つ entitlement**：サブスク＝`scope=NULL`（org 全体）、
一回課金＝`scope=<対象キー>`＋`expires_at`。有効判定は「status=active かつ 未失効 かつ scope が対象を覆う」
（PSP のライフサイクル状態は billing が active / suspended / cancelled の3値に正規化する）。
購入導線は2経路——サブスク＝ログイン前提／一回課金＝匿名 checkout（email のみ→個人 org を暗黙生成→
マジックリンクは製品クライアントの `signInWithOtp`）。匿名 checkout の grant 書き込みは
billing service（Stripe webhook を受ける Edge Function・service_role 内包）が行う（製品は無キーのまま）。

## コマンド（pnpm・root から）

- ローカル（要 Docker）: `pnpm saas:start` → `pnpm saas:reset`。内部スタック（core / studio）とはポート帯（55xxx）が別で並走できる。
- 型生成: `pnpm db:types:saas`（→ `packages/db-types/src/saas-database.ts`）。
- RLS / GRANT テスト: `pnpm saas:test`（`saas-platform/tests/`・要ローカルスタック。anon/別ユーザーを偽装し境界を検証）。
- テスト: `node --test "saas-platform/tests/**/*.test.mjs"`（要ローカルスタック。`billing.record_event`・
  レシート形式・RLS 境界を検証）。
- billing（課金・Edge Functions）: コードは `saas-platform/functions/`（Deno）。決済反映の核は SQL 関数
  `billing.record_event`、Edge Function は薄いアダプタ。設計・デプロイ・E2E は
  [docs/saas/billing.md](../docs/saas/billing.md)。
- 本番反映は CI（`release` workflow の saas job＝migration → Edge Functions deploy を同一コミットから。Environment `saas-platform-production` の承認ゲート）。

## スキーマ / マイグレーション

- 正本は `saas-platform/migrations/`（dbmate・適用は `public.saas_platform_migrations` で追跡）。**DDL は migration 経由のみ**・適用済みは編集しない。検証は `pnpm saas:reset`。
- core の共通規約（snake_case・複数形・uuid PK・created_at/updated_at＋`set_updated_at`・status は text + CHECK）に従う。

## このモジュールの規約（境界）

- **authenticated への GRANT はこのスキーマに閉じ、「自分の行」だけを開く**（users=self / organizations・memberships・product_grants=所属 org 経由）。
- 書き込み系の管理操作（products / product_grants）は service_role（studio バックオフィス）のみ。
- **製品（各 private repo）には URL・publishable key・JWKS だけを渡す。secret key を渡さない。** サインアップ provisioning は `auth.users` の AFTER INSERT トリガで完結させ、製品側を無キーに保つ。
- **core と FK で繋がない**（別 DB。重なりが要る場合は FK なしの参照値で表現する）。
- **`identity.products` は core.products（is_saas）の射影**（code=slug / name / status のみ）。正本は core
  （`core.products` / `core.product_offers`・studio が管理・[ADR 0008](../docs/adr/0008-saas-billing-centralized.md)）、
  反映は `release` workflow の商品同期 job（手で行を足さない・消えた code は inactive 化）。
- 製品の追加: ①studio で core に製品（is_saas）・商品を登録 →
  ②config.<env>.json の `saas.auth.additional_redirect_urls` に URL 追加 → `release`（apply=true）
  （商品同期と supabase-saas 設定 apply を依存順で反映）。

## 共通規約

- コーディング [../.claude/rules/conventions.md](../.claude/rules/conventions.md) / コミット [../.claude/rules/commit.md](../.claude/rules/commit.md)。
