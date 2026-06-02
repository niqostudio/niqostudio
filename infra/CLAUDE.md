# CLAUDE.md — infra

NIQO STUDIO のプラットフォーム（IaC）。ドメイン・DNS・メール・配信（Pages 等）・Terraform state を
Terraform で管理する。アプリ実装は持たない。

## 責任範囲

- **管理する**: Cloudflare（DNS / Email Routing / Pages・Workers / Turnstile）、Resend のドメイン認証 DNS、Supabase 設定・keep-alive、Terraform state。
- **管理しない**: アプリのコード/ビルド（→ website）、core のスキーマ/RLS（→ core）、シークレットの**値**（→ CI Secret / Environment / `wrangler secret`。state にも残さない）。

## 構成

- `modules/<name>` … 再利用モジュール（`main.tf` / `variables.tf` / `outputs.tf`）。
- `stacks/<name>` … ドメイン/環境ごとの合成。**state は stack 単位**で分離する。
- 定数の正本は root の [config.\<env\>.json](../config.production.json)（env ごとに1ファイル・committed。各 stack が `var.env` で選んで `jsondecode` で読む）。website も同じファイルを直読する。
- 手順・設計: [docs/infra/setup.md](../docs/infra/setup.md) / [docs/infra/email.md](../docs/infra/email.md) / [docs/architecture.md](../docs/architecture.md) / [docs/variables.md](../docs/variables.md)。

## このモジュールの規約（Terraform）

- `terraform fmt` 準拠（PR 前に `-recursive`）。リソース名・変数名は snake_case、変数は `type` と `description` を必ず付ける。マジック値をハードコードしない。
- `required_providers` でバージョン固定（`~>`）。Resend は公式 provider が無いため、ドメイン認証は DNS レコードとして管理する（登録/鍵発行はダッシュボード、値は tfvars で渡す）。
- API トークン・キー・DKIM 秘密値・state を**コードにも追跡対象 tfvars にも残さない**。`*.tfvars` は `.gitignore`、`*.tfvars.example` のみ追跡。state はリモートバックエンド（R2）。`.terraform.lock.hcl` は追跡する。

## 共通規約

- コーディング [../.claude/rules/conventions.md](../.claude/rules/conventions.md) / コミット [../.claude/rules/commit.md](../.claude/rules/commit.md)。
