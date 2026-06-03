# Cloudflare Email Routing: アドレス転送ルールと転送先を管理する。
# 受信の有効化（POST /email/routing/enable）は API トークンでは実行できない（CF の権限制約・
# Email Routing Rules:Edit でも 403）。初回のみダッシュボードで Email Routing を Enable する
# 一度きりのブートストラップとする（受信 MX は有効化時に CF が自動投入）。enable 自体は TF 管理外。
# 注: リソース/属性名は provider のバージョンでスキーマが変わる。docs で要検証。

# 転送先アドレスは Cloudflare 側で検証（確認メール・人手）が必要。
resource "cloudflare_email_routing_address" "destinations" {
  for_each   = toset(var.destination_addresses)
  account_id = var.account_id
  email      = each.value
}

resource "cloudflare_email_routing_rule" "rules" {
  for_each = { for r in var.rules : r.custom_address => r }

  zone_id = var.zone_id
  name    = "forward ${each.value.custom_address}"
  enabled = true

  # provider v5 は matchers / actions（複数形）。v4 の matcher / action から改称された。
  matchers = [{
    type  = "literal"
    field = "to"
    value = each.value.custom_address
  }]

  actions = [{
    type  = "forward"
    value = [each.value.forward_to]
  }]

  depends_on = [cloudflare_email_routing_address.destinations]
}
