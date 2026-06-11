# SaaS 共通アカウント基盤（niqostudio-saas プロジェクト）の設定 IaC。
# supabase_settings は宣言した block のみを partial 更新し、未宣言の設定には触れない（delete は no-op）。
# 初回 apply 前に terraform plan で現行値と突合し、差分が意図したものだけになることを確認する。
#
# ここで管理しないもの（理由つき）:
# - プロジェクト作成: supabase_project リソースは DB パスワードが state に残るため使わない
#   （秘密の値を state に残さない規約）。作成はダッシュボード、ref は変数で受ける。
# - SMTP（Resend）: 認証情報が secret のためダッシュボード管理。
# - JWT 署名鍵（ES256）: signing keys API は provider 未対応。ダッシュボードで作成・有効化する。
resource "supabase_settings" "this" {
  project_ref = var.project_ref

  # Data API の露出は identity スキーマのみ。値は infra/supabase-saas の config.toml [api] と一致させる。
  api = jsonencode({
    db_schema            = "identity,graphql_public"
    db_extra_search_path = "identity,extensions"
    max_rows             = 1000
  })

  # 顧客サインアップを受ける側のプロジェクト。redirect 允許リストが製品ドメインの正本
  # （各製品のログインフォームからの signUp / resetPasswordForEmail の戻り先を縛る）。
  auth = jsonencode({
    site_url                         = local.saas.auth.site_url
    uri_allow_list                   = join(",", local.saas.auth.additional_redirect_urls)
    disable_signup                   = false
    external_anonymous_users_enabled = false
    mailer_autoconfirm               = false
    password_min_length              = 8
  })
}
