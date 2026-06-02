# 定数（ドメイン・SPF/DMARC 既定・Pages 設定）は root の config.<env>.json に集約する（env ごとに1ファイル）。
# env は var.env で選ぶ（既定 production）。機微値/個人情報（転送先メール・Resend 値・API トークン）は
# ここに置かず tfvars / 環境変数で渡す。※ 全リポ public 前提のため config.<env>.json には公開定数だけを書く。
locals {
  cfg    = jsondecode(file("${path.module}/../../../config.${var.env}.json"))
  domain = local.cfg.primary               # この stack は primary ドメインを管理する
  dom    = local.cfg.domains[local.domain] # そのドメインのブロック（email / pages）
}

# config.<env>.json の値の健全性チェック（plan 時に検出）。
check "config_values" {
  assert {
    condition     = contains(["none", "quarantine", "reject"], local.dom.email.dmarc_policy)
    error_message = "config.${var.env}.json: domains[primary].email.dmarc_policy は none / quarantine / reject。"
  }
  assert {
    condition     = contains(["~all", "-all", "?all", "+all"], local.dom.email.spf_all)
    error_message = "config.${var.env}.json: domains[primary].email.spf_all は ~all / -all / ?all / +all。"
  }
}
