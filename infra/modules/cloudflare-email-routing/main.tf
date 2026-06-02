# Cloudflare Email Routing: ドメイン受信を有効化し、アドレス転送ルールを作る。
# 受信に必要な MX / SPF は Cloudflare 側が要求する（DNS の実投入は cloudflare-dns-records 側、
# あるいは Email Routing 有効化時の自動レコードに委ねる構成も可）。
# 注: リソース/属性名は provider のバージョンでスキーマが変わる。docs で要検証。

# v5 ではこのリソースの作成自体が Email Routing 有効化に相当する。
# enabled / status は read-only（状態を反映するだけ）なので設定しない。
resource "cloudflare_email_routing_settings" "this" {
  zone_id = var.zone_id
}

# 転送先アドレスは Cloudflare 側で検証（確認メール）が必要。
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
