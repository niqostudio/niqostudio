# zone_id を source_domain から導出（注入は API トークンのみで済む）。
# var.zone_id を入れた場合のみ上書きする。filter の記法は provider v5.19.1 の属性形。
# zone_id を上書きした時はルックアップを行わない（override を真の逃げ道にする）。
data "cloudflare_zone" "this" {
  count  = var.zone_id == "" ? 1 : 0
  filter = { name = local.source_domain }
}

locals {
  zone_id = var.zone_id != "" ? var.zone_id : data.cloudflare_zone.this[0].id
}
