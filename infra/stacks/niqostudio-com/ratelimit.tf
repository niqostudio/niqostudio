# 公開フォームのエッジ流量制限。/api/contact への POST を IP 単位で制限し、Worker 経由の
# スパム/コスト悪用（DB INSERT・Resend 送信）を止める。直 REST 経由は別途 RLS(inquiry_writer)で封鎖。
# 注: kind="zone" / phase="http_ratelimit" は provider v5。proxied なトラフィックにのみ適用。
# しきい値は config.<env>.json（rate_limit.contact）が正本。characteristics は実装詳細として固定。
locals {
  rl_contact = local.dom.rate_limit.contact
}

resource "cloudflare_ruleset" "contact_ratelimit" {
  zone_id     = local.zone_id
  name        = "contact-rate-limit"
  description = "Rate limit POST /api/contact"
  kind        = "zone"
  phase       = "http_ratelimit"

  rules = [{
    ref         = "contact_post_rl"
    description = "limit POST /api/contact per client IP"
    expression  = "(http.request.uri.path eq \"/api/contact\" and http.request.method eq \"POST\")"
    action      = "block"
    ratelimit = {
      characteristics     = ["ip.src", "cf.colo.id"]
      period              = local.rl_contact.period
      requests_per_period = local.rl_contact.requests_per_period
      # Free プランは mitigation timeout を period と同値（10s）にしか設定できない（プラン変更時に config で調整）。
      mitigation_timeout = local.rl_contact.mitigation_timeout
    }
  }]
}
