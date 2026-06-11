# stacks/supabase-saas

SaaS 共通アカウント基盤（Supabase プロジェクト **niqostudio-saas**）の設定 IaC。
内部プロジェクト（[stacks/supabase](../supabase/)）とは信頼ドメインが異なるため stack / state を分離する。

- 管理対象: `supabase_settings`（api＝identity スキーマ露出 / auth＝サインアップ・site URL・redirect 允許リスト）。
- プロジェクト作成・SMTP・ES256 署名鍵はダッシュボード（理由は [main.tf](main.tf) 冒頭コメント）。
- 公開定数（site URL / redirect 允許リスト）は root の `config.<env>.json` の `saas.auth` を読む。
- 変数: `TF_VAR_project_ref`（GitHub Variable `SAAS_SUPABASE_PROJECT_REF`）。トークンは `SUPABASE_ACCESS_TOKEN`（アカウント単位＝既存と共用）。
- init: `terraform init -backend-config=backend.tfbackend`（key は `supabase-saas/terraform.tfstate`）。

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.6 |
| supabase | ~> 1.0 |

## Providers

| Name | Version |
|------|---------|
| supabase | ~> 1.0 |

## Resources

| Name | Type |
|------|------|
| [supabase_settings.this](https://registry.terraform.io/providers/supabase/supabase/latest/docs/resources/settings) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project\_ref | Supabase プロジェクト niqostudio-saas の参照 ID（ダッシュボード URL の <ref>） | `string` | n/a | yes |
| env | 対象環境（config.<env>.json の選択） | `string` | `"production"` | no |

## Outputs

No outputs.
<!-- END_TF_DOCS -->