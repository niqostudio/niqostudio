# 正本は core DB（core.products / core.product_offers・studio が管理）。
# scripts/saas-products-export.mjs が products.auto.tfvars.json（gitignore）に書き出して注入する。
# status は identity.products への射影（同じ書き出しを共用）用で、この stack では使わない。
variable "products" {
  type = list(object({
    code   = string
    name   = string
    status = optional(string)
    offers = list(object({
      key                = string
      version            = number
      currency           = string
      unit_amount        = number
      interval           = optional(string)
      access_period_days = optional(number) # identity 射影・billing 用（この stack では使わない）
    }))
  }))
  description = "SaaS 製品・商品（offer・価格）マスタ（core からの書き出し）"
  default     = []
}
