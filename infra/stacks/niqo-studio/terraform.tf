terraform {
  required_version = ">= 1.6"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # state はリモート（Cloudflare R2 / S3 互換）。値は backend.tfbackend で注入。
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

# api_token は環境変数 CLOUDFLARE_API_TOKEN で渡す（最小権限: 対象ゾーン限定 + DNS:Edit）。
provider "cloudflare" {}
