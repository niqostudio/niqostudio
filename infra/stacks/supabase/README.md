# stack: supabase

Supabase プロジェクト設定の IaC（`supabase_settings`）。まず **api ブロック**（Data API が露出する
スキーマ＝`core` / `studio` / `graphql_public`）だけを管理する。provider は宣言した block のみ partial
更新し、未宣言の設定には触れない。

apply は手動（`pnpm --filter @niqostudio/infra exec terraform`）。**初回は plan で本番現行値と突合**し、
差分が意図したもの（例: `studio` 露出の追加）だけになることを確認してから apply する（無断の設定変更を避ける）。
本番 studio スキーマは migration 適用後に作成されるため、`db_schema` への `studio` 追加はその後に apply する。

```sh
cp backend.tfbackend.example backend.tfbackend         # R2 の bucket/endpoints を埋める
export SUPABASE_ACCESS_TOKEN=...                        # Supabase Account → Access Tokens
export TF_VAR_project_ref=<ref>                         # ダッシュボード URL の <ref>
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...  # R2（state）
pnpm --filter @niqostudio/infra exec terraform -chdir=stacks/supabase init -backend-config=backend.tfbackend
pnpm --filter @niqostudio/infra exec terraform -chdir=stacks/supabase plan
```

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
| project\_ref | Supabase プロジェクトの参照 ID（ダッシュボード URL の <ref>） | `string` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
