terraform {
  required_version = ">= 1.6"

  required_providers {
    stripe = {
      source  = "lukasaron/stripe"
      version = "~> 3.0"
    }
  }

  # state はリモート（Cloudflare R2 / S3 互換）。bucket/key/endpoints は backend.tfbackend で注入。
  #   terraform init -backend-config=backend.tfbackend
  # ローカル state で試す場合のみ: terraform init -backend=false
  backend "s3" {
    region                      = "auto"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    skip_metadata_api_check     = true
    use_path_style              = true
  }
}

# API キーは環境変数 STRIPE_API_KEY で渡す（ここに値を書かない）。
# 発行: Stripe ダッシュボード → Developers → API keys（restricted key: Products/Prices Write のみ）。
provider "stripe" {}
