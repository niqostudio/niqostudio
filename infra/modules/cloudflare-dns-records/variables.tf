variable "zone_id" {
  type        = string
  description = "対象 Cloudflare ゾーンの ID"
}

variable "records" {
  description = "作成する DNS レコード群"
  type = list(object({
    name     = string
    type     = string
    content  = string
    ttl      = optional(number, 1) # 1 = Auto
    priority = optional(number)
    proxied  = optional(bool, false)
    comment  = optional(string)
  }))
  default = []
}
