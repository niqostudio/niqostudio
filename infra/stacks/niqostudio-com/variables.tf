# ここには「機微値 / 個人情報 / 環境ごとの上書き」だけを置く。
# プロジェクト定数（ドメイン・SPF/DMARC・Pages 設定）は root の config.<env>.json に集約している。

# 読み込む config ファイル（root の config.<env>.json）を選ぶ。branch=main→production / develop→staging。
variable "env" {
  type        = string
  description = "デプロイ環境（読み込む config.<env>.json を選ぶ）"
  default     = "production"
}

# zone_id / account_id は通常このドメイン名（config.<env>.json の primary）から導出する（注入は API トークン1本）。
# 値を入れた場合のみドメイン名検索を上書きする（緊急時の逃げ道）。
variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare アカウント ID（空ならゾーンから導出）"
  default     = ""
}

variable "zone_id" {
  type        = string
  description = "ゾーン ID（空ならドメイン名から導出）"
  default     = ""
}

# 個人受信箱なので config.<env>.json（public・追跡）には置かず tfvars / CI シークレットで渡す。
variable "forward_to" {
  type        = string
  description = "Email Routing の既定転送先（Cloudflare で検証済みの個人受信箱）"
}

variable "inbound_forwards" {
  type        = map(string)
  description = "受信転送ルールの追加/上書き。キー=ローカルパート（@より前）、値=転送先。既定の hi@ / dmarc@（→ forward_to）にマージされる。"
  default     = {}
}

# Resend ダッシュボードが表示する DNS（DKIM/MX 等）をそのまま渡す。値はリポに置かない。
variable "resend_dns_records" {
  description = "Resend ドメイン認証用の DNS レコード群"
  type = list(object({
    name     = string
    type     = string
    content  = string
    ttl      = optional(number, 1)
    priority = optional(number)
    comment  = optional(string)
  }))
  default = []
}
