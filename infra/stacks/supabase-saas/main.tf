# SaaS 共通アカウント基盤（niqostudio-saas プロジェクト）の設定 IaC。
# supabase_settings は宣言した block のみを partial 更新し、未宣言の設定には触れない（delete は no-op）。
# 初回 apply 前に terraform plan で現行値と突合し、差分が意図したものだけになることを確認する。
#
# ここで管理しないもの（理由つき）:
# - プロジェクト作成: supabase_project リソースは DB パスワードが state に残るため使わない
#   （秘密の値を state に残さない規約）。作成はダッシュボード、ref は変数で受ける。
# - SMTP の**パスワード（Resend API キー）のみ**: secret を state に残さないためダッシュボードで設定。
#   それ以外の SMTP 設定とメールテンプレートは下の auth ブロックで宣言管理する（partial 更新のため
#   smtp_pass には触れない）。
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
  # メール文面は製品 metadata（{{ .Data.product_name }}）で製品名を出す（差出人ドメインは
  # niqostudio.com 共通＝送信レピュテーションを集約。製品ドメイン差出人は Send Email hook で後段）。
  auth = jsonencode({
    site_url                         = local.saas.auth.site_url
    uri_allow_list                   = join(",", local.saas.auth.additional_redirect_urls)
    disable_signup                   = false
    external_anonymous_users_enabled = false
    mailer_autoconfirm               = false
    password_min_length              = local.saas.auth.password_min_length

    # SMTP（Resend）。smtp_pass のみダッシュボード（このブロックは partial 更新＝触れない）。
    smtp_admin_email      = local.mail.addresses.noreply
    smtp_host             = local.saas.auth.email.smtp.host
    smtp_port             = local.saas.auth.email.smtp.port
    smtp_user             = local.saas.auth.email.smtp.user
    smtp_sender_name      = local.mail.sender_name
    rate_limit_email_sent = local.saas.auth.email.rate_limit_per_hour

    mailer_subjects_confirmation          = local.saas.auth.email.subjects.confirmation
    mailer_subjects_magic_link            = local.saas.auth.email.subjects.magic_link
    mailer_subjects_recovery              = local.saas.auth.email.subjects.recovery
    mailer_templates_confirmation_content = file("${path.module}/templates/confirmation.html")
    mailer_templates_magic_link_content   = file("${path.module}/templates/magic_link.html")
    mailer_templates_recovery_content     = file("${path.module}/templates/recovery.html")
  })
}
