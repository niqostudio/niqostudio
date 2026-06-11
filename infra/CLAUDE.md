# CLAUDE.md — infra

NIQO STUDIO のプラットフォーム（IaC）。ドメイン・DNS・メール・配信（Worker カスタムドメイン等）・Terraform state を
Terraform で管理する。アプリ実装は持たない。

## 責任範囲

- **管理する**: Cloudflare（DNS / Email Routing / Worker のカスタムドメイン / Turnstile）、Resend のドメイン認証 DNS、Supabase 設定（`stacks/supabase`＝内部プロジェクトの api 露出 / `stacks/supabase-saas`＝niqostudio-saas の api＋auth）・keep-alive（両プロジェクト）、Terraform state。ローカルスタックも2系統（`supabase/`＝内部 54xxx / `supabase-saas/`＝saas 55xxx）。
- **管理しない**: アプリのコード/ビルド/Worker スクリプト本体（→ website の `wrangler deploy`）、core / saas-platform のスキーマ/RLS（→ 各モジュール）、シークレットの**値**（→ CI Secret / Environment / `wrangler secret`。state にも残さない）。

## 構成

- `modules/<name>` … 再利用モジュール（`main.tf` / `variables.tf` / `outputs.tf`）。
- `stacks/<name>` … ドメイン/環境ごとの合成。**state は stack 単位**で分離する。
- **toolchain は infra が npm で所有**（`supabase` / `@jahed/terraform`）。env グローバル CLI に依存せず、版は `infra/package.json` 一本。terraform は `pnpm --filter @niqostudio/infra exec terraform`（初回実行時に HashiCorp 署名付きバイナリを取得・キャッシュ）。local も CI も同経路。
- 定数の正本は root の [config.\<env\>.json](../config.production.json)（env ごとに1ファイル・committed。各 stack が `var.env` で選んで `jsondecode` で読む）。website も同じファイルを直読する。
- 手順・設計: [docs/deploy.md](../docs/deploy.md) / [docs/infra/cloudflare.md](../docs/infra/cloudflare.md) / [docs/infra/resend.md](../docs/infra/resend.md) / [docs/infra/email.md](../docs/infra/email.md) / [docs/architecture.md](../docs/architecture.md) / [docs/variables.md](../docs/variables.md)。

## このモジュールの規約（Terraform）

- `terraform fmt` 準拠（PR 前に `-recursive`）。リソース名・変数名は snake_case、変数は `type` と `description` を必ず付ける。マジック値をハードコードしない。
- `required_providers` でバージョン固定（`~>`）。Resend は公式 provider が無いため、ドメイン認証は DNS レコードとして管理する（登録/鍵発行はダッシュボード、値は tfvars で渡す）。
- API トークン・キー・DKIM 秘密値・state を**コードにも追跡対象 tfvars にも残さない**。`*.tfvars` は `.gitignore`、`*.tfvars.example` のみ追跡。state はリモートバックエンド（R2）。`.terraform.lock.hcl` は追跡する。

## 共通規約

- コーディング [../.claude/rules/conventions.md](../.claude/rules/conventions.md) / コミット [../.claude/rules/commit.md](../.claude/rules/commit.md)。
