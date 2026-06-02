variable "account_id" {
  type        = string
  description = "Cloudflare アカウント ID"
}

variable "zone_id" {
  type        = string
  description = "対象ゾーンの ID"
}

variable "destination_addresses" {
  type        = list(string)
  description = "転送先メールアドレス（Cloudflare で検証が必要）"
  default     = []
}

variable "rules" {
  description = "転送ルール（custom_address 宛を forward_to へ転送）"
  type = list(object({
    custom_address = string
    forward_to     = string
  }))
  default = []
}
