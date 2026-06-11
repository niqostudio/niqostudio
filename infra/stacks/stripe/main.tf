# Stripe の Product / Price を config（saas.products）から宣言的に作る。
# 価格の変更は Stripe 上は immutable のため、unit_amount を変えると価格は作り直しになる
# （旧 price は Stripe 側に残る・既存サブスクは旧 price のまま）。plan で初回 plan 前に確認する。
resource "stripe_product" "this" {
  for_each = local.products

  name = each.value.name
}

resource "stripe_price" "this" {
  for_each = local.offers

  product     = stripe_product.this[each.value.product_code].id
  currency    = each.value.currency
  unit_amount = each.value.unit_amount
  lookup_key  = each.key

  dynamic "recurring" {
    for_each = each.value.interval == null ? [] : [each.value.interval]
    content {
      interval = recurring.value
    }
  }
}
