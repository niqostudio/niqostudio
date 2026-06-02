# Cloudflare Pages: プロジェクトの「箱」とカスタムドメイン束ねを infra が正本管理する。
# ビルド/デプロイ（source・build_config）は website 側（wrangler pages deploy）に委ねるため、
# ここでは git 連携を持たせない direct-upload 構成にする（責務分界を守る）。
# config.<env>.json の pages はドメイン配下の role マップ（domains.<domain>.pages.<role>）。
# project_name が空の role は作らない。subdomain 空＝apex、値＝<subdomain>.<domain>。

locals {
  # project_name が設定された role だけ箱を作る（pages.website / 将来 pages.admin 等）。
  pages = { for role, p in local.dom.pages : role => p if p.project_name != "" }
}

resource "cloudflare_pages_project" "this" {
  for_each          = local.pages
  account_id        = local.account_id
  name              = each.value.project_name
  production_branch = each.value.production_branch
}

# 各 role のカスタムドメイン（subdomain 空なら apex）をプロジェクトに束ねる。CNAME は dns モジュール側。
resource "cloudflare_pages_domain" "this" {
  for_each     = local.pages
  account_id   = local.account_id
  project_name = cloudflare_pages_project.this[each.key].name
  name         = each.value.subdomain != "" ? "${each.value.subdomain}.${local.domain}" : local.domain
}
