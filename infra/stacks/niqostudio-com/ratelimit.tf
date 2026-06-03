# 公開フォームのエッジ流量制限。/api/contact への POST を IP 単位で制限し、Worker 経由の
# スパム/コスト悪用（DB INSERT・Resend 送信）を止める。直 REST 経由は別途 RLS(inquiry_writer)で封鎖。
# 注: kind="zone" / phase="http_ratelimit" は provider v5。proxied なトラフィックにのみ適用。
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
      period              = 10
      requests_per_period = 5
      # Free プランは mitigation timeout を period と同値（10s）にしか設定できない。
      mitigation_timeout = 10
    }
  }]
}
