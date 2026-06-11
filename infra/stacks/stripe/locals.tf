locals {
  products = { for p in var.products : p.code => p }

  # offer はフラットにして lookup key（<製品コード>_<offer キー>_v<version>）で引けるようにする。
  # billing service は「key の現行版」をこのキーで解決する＝price ID をどこにも焼き込まない。
  # 改定で旧 version が書き出しから消えると、provider の destroy は Stripe 上の price の
  # アーカイブ（無効化）になる＝既存サブスクは旧 price のまま継続する。
  offers = merge([
    for p in var.products : {
      for o in p.offers : "${p.code}_${o.key}_v${o.version}" => {
        product_code = p.code
        currency     = o.currency
        unit_amount  = o.unit_amount
        interval     = try(o.interval, null)
      }
    }
  ]...)
}

# 書き出し値の健全性チェック（plan 時に検出）。
check "products_values" {
  assert {
    condition     = alltrue([for o in values(local.offers) : o.unit_amount > 0])
    error_message = "products: offers[].unit_amount は正の整数（最小通貨単位）。"
  }
  assert {
    condition     = alltrue([for o in values(local.offers) : o.interval == null || contains(["day", "week", "month", "year"], o.interval)])
    error_message = "products: offers[].interval は day / week / month / year（一回課金は null）。"
  }
}
