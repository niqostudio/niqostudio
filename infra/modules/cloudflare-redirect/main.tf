# ゾーン全体の動的リダイレクト（Single Redirect）。301/302 等で別ホストへ転送する。
# kind="zone" / phase="http_request_dynamic_redirect" は provider v5 / Cloudflare 公式の通り。
# 注: リダイレクトはエッジで proxied なトラフィックにのみ適用される。対象ホストの DNS は
#     proxied=true で Cloudflare を通す必要がある（プレースホルダ A 等）。

resource "cloudflare_ruleset" "redirect" {
  zone_id     = var.zone_id
  name        = var.name
  description = var.description
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"

  rules = [{
    ref         = "redirect"
    description = var.description
    expression  = var.expression
    action      = "redirect"
    action_parameters = {
      from_value = {
        status_code           = var.status_code
        preserve_query_string = var.preserve_query_string
        # preserve_path=true なら元パスを連結（expression）、false なら固定 URL（value）。
        target_url = {
          value      = var.preserve_path ? null : var.target_base_url
          expression = var.preserve_path ? "concat(\"${var.target_base_url}\", http.request.uri.path)" : null
        }
      }
    }
  }]
}
