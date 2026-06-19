# zone_id / account_id をドメイン名から導出し、tfvars への注入を API トークン1本に減らす。
# var.zone_id / var.cloudflare_account_id を入れた場合のみ上書きする（緊急時の逃げ道）。
# 注: filter の記法は provider v5.19.1 の属性形（filter = { name = ... }）。初回 plan で確認。
# 両方上書きされている時はルックアップ自体を行わない（override を真の逃げ道にする）。
data "cloudflare_zone" "this" {
  count  = (var.zone_id == "" || var.cloudflare_account_id == "") ? 1 : 0
  filter = { name = local.domain }
}

locals {
  zone_id    = var.zone_id != "" ? var.zone_id : data.cloudflare_zone.this[0].id
  account_id = var.cloudflare_account_id != "" ? var.cloudflare_account_id : data.cloudflare_zone.this[0].account.id
}

# http で来たリクエストをエッジで https へ 301 する（HSTS は初回 http を止められないため別途必要）。
resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = local.zone_id
  setting_id = "always_use_https"
  value      = "on"
}
