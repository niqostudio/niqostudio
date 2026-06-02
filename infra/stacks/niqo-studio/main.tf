# niqo.studio -> niqostudio.com への 301 リダイレクト（パス・クエリ保持）。
# Cloudflare 管理ドメイン。リダイレクトはエッジで効くため apex/www を proxied で通す。

# apex と www を Cloudflare に通すためのプレースホルダ（オリジンには到達しない）。
module "dns" {
  source  = "../../modules/cloudflare-dns-records"
  zone_id = local.zone_id

  records = [
    { name = local.source_domain, type = "A", content = local.placeholder_ip, proxied = true, comment = "redirect placeholder (apex)" },
    { name = "www.${local.source_domain}", type = "A", content = local.placeholder_ip, proxied = true, comment = "redirect placeholder (www)" },
  ]
}

# ゾーン全体（apex/www/任意パス）を 301 で転送。元のパス・クエリは維持する。
module "redirect" {
  source          = "../../modules/cloudflare-redirect"
  zone_id         = local.zone_id
  name            = "niqo-studio-to-niqostudio-com"
  description     = "301 redirect ${local.source_domain} -> ${local.redirect_to}"
  target_base_url = local.redirect_to
  status_code     = 301
}
