# stacks/stripe

SaaS の**製品・商品（offer・価格）マスタ**を Stripe の Product / Price として宣言管理する
（[ADR 0008](../../../docs/adr/0008-saas-billing-centralized.md)）。

- 正本は **core DB**（`core.products`（is_saas）/ `core.product_offers`・studio が管理）。
  `scripts/saas-products-export.mjs` が `products.auto.tfvars.json`（gitignore）へ書き出し、
  この stack は `var.products` として受ける（DB を直接読まない）。実行は `saas-products: sync` workflow。
- price の lookup key は `<製品コード>_<offer キー>_v<version>`。billing service は「key の現行版」を
  このキーで解決し、price ID を焼き込まない。
- **商品定義は version 単位で不変**（DB トリガで強制）。改定＝新 version 行の追加＋旧の is_active off。
  書き出しから消えた旧 version の price は destroy ＝ Stripe 上はアーカイブ（既存サブスクは旧 price のまま継続）。
- API キーは環境変数 `STRIPE_API_KEY`（restricted key: Products / Prices Write のみ。値はコード・state に書かない）。
- init: `terraform init -backend-config=backend.tfbackend`（key は `stripe/terraform.tfstate`）。
