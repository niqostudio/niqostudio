# stacks/stripe

SaaS の**製品・商品（offer・価格）マスタ**を Stripe の Product / Price として宣言管理する
（[ADR 0008](../../../docs/adr/0008-saas-billing-centralized.md)）。

- 正本は **core DB**（`core.products`（is_saas）/ `core.product_offers`・studio が管理）。
  `scripts/saas-products-export.mjs` が `products.auto.tfvars.json`（gitignore）へ書き出し、
  この stack は `var.products` として受ける（DB を直接読まない）。実行は `release` workflow（sync_stripe job）。
- price の lookup key は `<製品コード>_<offer キー>`。billing service は販売中 offer を
  このキーで解決し、price ID を焼き込まない。
- **商品は (product, key) ごとに現行価格1行**。改定＝行の直接編集 → apply で price 作り直し
  （Stripe の price は immutable）。lookup key は `transfer_lookup_key` が新 price へ引き継ぎ、
  旧 price はアーカイブで残る（既存サブスクは旧 price のまま継続）。
- API キーは環境変数 `STRIPE_API_KEY`（restricted key: Products / Prices Write のみ。値はコード・state に書かない）。
- init: `terraform init -backend-config=backend.tfbackend`（key は `stripe/terraform.tfstate`）。

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.6 |
| stripe | ~> 3.0 |

## Providers

| Name | Version |
|------|---------|
| stripe | ~> 3.0 |

## Resources

| Name | Type |
|------|------|
| [stripe_price.this](https://registry.terraform.io/providers/lukasaron/stripe/latest/docs/resources/price) | resource |
| [stripe_product.this](https://registry.terraform.io/providers/lukasaron/stripe/latest/docs/resources/product) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| products | SaaS 製品・商品（offer・価格）マスタ（core からの書き出し） | <pre>list(object({<br/>    code   = string<br/>    name   = string<br/>    status = optional(string)<br/>    offers = list(object({<br/>      key                = string<br/>      currency           = string<br/>      unit_amount        = number<br/>      interval           = optional(string)<br/>      access_period_days = optional(number) # identity 射影・billing 用（この stack では使わない）<br/>    }))<br/>  }))</pre> | `[]` | no |

## Outputs

No outputs.
<!-- END_TF_DOCS -->