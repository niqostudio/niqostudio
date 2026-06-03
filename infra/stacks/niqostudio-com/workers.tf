# Cloudflare Workers: SSR（/api/contact）＋静的アセットを1 Worker で配信する（@astrojs/cloudflare の
# ネイティブ形式）。Worker スクリプトの作成/更新は website 側（wrangler deploy）に委ね、infra は
# カスタムドメインの束ね（hostname → service）を正本管理する（責務分界は Pages 時と同じ）。
# service（＝Worker 名）は最初の wrangler deploy で作られるため、初回のみ website deploy → 本 apply の順。
# config.<env>.json の workers はドメイン配下の role マップ（domains.<domain>.workers.<role>）。
# name が空の role は束ねない。subdomain 空＝apex、値＝<subdomain>.<domain>。
# 注: cloudflare_workers_custom_domain の属性は provider v5 系。初回 plan で要確認。

locals {
  # name が設定された role だけドメインを束ねる（workers.website / 将来 workers.admin 等）。
  workers = { for role, w in local.dom.workers : role => w if w.name != "" }
}

resource "cloudflare_workers_custom_domain" "this" {
  for_each   = local.workers
  account_id = local.account_id
  zone_id    = local.zone_id
  hostname   = each.value.subdomain != "" ? "${each.value.subdomain}.${local.domain}" : local.domain
  service    = each.value.name
}
