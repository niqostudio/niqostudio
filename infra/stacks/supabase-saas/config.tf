# 公開定数（auth の site URL / redirect 允許リスト）は root の config.<env>.json に集約する。
# 製品を追加するときは config の saas.auth.additional_redirect_urls に URL を足して apply する。
locals {
  cfg  = jsondecode(file("${path.module}/../../../config.${var.env}.json"))
  saas = local.cfg.saas
  # auth メールの差出人は既存の送信系（website 自動返信）と同じアドレス・表示名に揃える。
  mail = local.cfg.domains[local.cfg.primary].email
}

# config.<env>.json の値の健全性チェック（plan 時に検出）。
check "config_values" {
  assert {
    condition     = startswith(local.saas.auth.site_url, "https://")
    error_message = "config.${var.env}.json: saas.auth.site_url は https:// で始める。"
  }
  assert {
    # 製品のコールバック URL は本番ドメインのみ（http のローカル URL を本番允許リストへ混ぜない）。
    condition     = alltrue([for u in local.saas.auth.additional_redirect_urls : startswith(u, "https://")])
    error_message = "config.${var.env}.json: saas.auth.additional_redirect_urls は https:// のみ。"
  }
  assert {
    condition     = local.saas.auth.email.rate_limit_per_hour > 0 && local.saas.auth.password_min_length >= 8
    error_message = "config.${var.env}.json: saas.auth.email.rate_limit_per_hour は正の整数、password_min_length は 8 以上。"
  }
}
