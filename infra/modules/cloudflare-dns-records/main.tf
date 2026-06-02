# 任意の DNS レコード群を1ゾーンに作成する汎用モジュール。
# Resend(SPF/DKIM/DMARC) や Web(CNAME/A) など用途を問わず records で渡す。
# 注: 属性名は cloudflare provider v5 系（content / proxied 等）。バージョン更新時は docs で要確認。

resource "cloudflare_dns_record" "this" {
  # 同名・同タイプの複数レコード（TXT 等）に耐えつつ、並べ替えで再作成されないよう
  # リスト index ではなく content ハッシュでキーを作る（順序非依存で state が安定する）。
  for_each = { for r in var.records : "${r.type}:${r.name}:${substr(sha1(r.content), 0, 8)}" => r }

  zone_id  = var.zone_id
  name     = each.value.name
  type     = each.value.type
  content  = each.value.content
  ttl      = each.value.ttl
  priority = try(each.value.priority, null)
  proxied  = try(each.value.proxied, false)
  comment  = try(each.value.comment, null)
}
