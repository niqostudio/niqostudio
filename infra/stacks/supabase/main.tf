# Supabase プロジェクト設定の IaC。supabase_settings は宣言した block のみを partial 更新し、
# 未宣言の設定には触れない（delete は no-op）。まず api ブロック（Data API の露出スキーマ）だけを
# 管理する。auth / storage / network は据え置き（後日 additive に追加）。
#
# 露出スキーマ: core（公開 view）/ studio（業務）/ graphql_public（GraphQL 入口・Supabase 既定同梱）。
# 値は core の config.toml [api] と一致させる。初回 apply 前に terraform plan で本番現行値と
# 突合し、差分が意図したものだけになることを確認する（無断の設定変更を避ける）。
resource "supabase_settings" "this" {
  project_ref = var.project_ref

  api = jsonencode({
    db_schema            = "core,graphql_public,studio"
    db_extra_search_path = "core,extensions"
    max_rows             = 1000
  })
}
