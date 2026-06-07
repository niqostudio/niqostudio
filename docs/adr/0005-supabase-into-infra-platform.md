# ADR 0005: Supabase を infra プラットフォームとして統合（Environment・toolchain・設定 IaC）

- ステータス: 採用
- 決定日: 2026-06-07

## 背景
直前の refactor で Supabase を core から剥がし infra（`@niqostudio/infra`）へ集約した。Supabase プロジェクトは infra が所有するプラットフォームになり、次の3点が宙に浮いた。

1. **Environment**：[ADR 0003](0003-environment-per-module.md) は本番反映の Environment を `core-production`（`SUPABASE_DB_URL`）/ `infra-production`（CF / R2）にモジュール分割していた。Supabase が infra 所有になったことで、DB 接続資格情報を core 専用 Environment に置く根拠が薄れた。
2. **toolchain**：infra のツールのうち `supabase` は npm（devDependency）化したが、`terraform` は環境グローバル CLI 依存のままで非対称。版は CI の `terraform_version` と二重管理になっていた。
3. **設定**：Supabase プロジェクト設定（公開スキーマ露出等）はコンソール手動で、IaC 化されていない。

## 決定
- **Environment 統合**：`core-production` を廃し、`SUPABASE_DB_URL` を `infra-production` に置く。`db: migrate`（core / studio の dbmate 適用）は `infra-production` を参照する。最小権限の境界は「core vs infra」から **platform(infra) vs application(website)** へ移る。
- **toolchain を infra が npm で所有**：`supabase` と `terraform`（`@jahed/terraform`）を `infra/package.json` の devDependency にし、local も CI も `pnpm --filter @niqostudio/infra exec …` で実行する。版は `infra/package.json` 一本にする。
- **設定の IaC**：`infra/stacks/supabase`（`supabase_settings`）で api ブロック（Data API の露出スキーマ）から terraform 管理する。provider は宣言した block のみ partial 更新し、未宣言の設定には触れない。初回は plan で本番現行値と突合してから apply する。

## 影響
- `db: migrate` と `infra: apply` が同じ `infra-production` を参照するため、両ジョブは同 Environment の secret を読みうる。ADR 0003 のモジュール別最小権限のうち core/infra 分割は解消され、境界は platform(infra) と application(website) の2系統になる。
- staging 追加時は `infra-staging` / `website-staging` を additive に作る（`core-staging` は持たない）。
- terraform / supabase の版は `infra/package.json` で固定し、CI は `setup-terraform` に依存しない。
- Supabase 設定は terraform state で追跡され、コンソール手動変更は drift として検出できる。
- 本 ADR は ADR 0003 の `db: migrate → core-production` 割当を更新する。
