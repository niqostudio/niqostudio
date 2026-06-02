# 定数は root の config.<env>.json に集約（env は var.env・既定 production）。この stack は niqo.studio を管理する。
locals {
  cfg            = jsondecode(file("${path.module}/../../../config.${var.env}.json"))
  domain         = "niqo.studio"
  dom            = local.cfg.domains[local.domain]
  source_domain  = local.domain
  placeholder_ip = local.dom.placeholder_ip
  redirect_to    = "https://${local.dom.redirect_to}"
}
