terraform {
  required_version = ">= 1.6"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # state はリモート（Cloudflare R2 / S3 互換）。bucket/key/endpoints などアカウント依存値は
  # 追跡しない backend.tfbackend で注入する（partial backend config）。
  #   terraform init -backend-config=backend.tfbackend
  #   R2 のアクセスキーは環境変数 AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY で渡す。
  # ローカル state で素早く試したい場合のみ: terraform init -backend=false
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

# api_token は環境変数 CLOUDFLARE_API_TOKEN で渡す（ここに値を書かない）。
# トークンは最小権限で発行する: 対象ゾーン限定 + Zone:DNS:Edit / Zone:Email Routing:Edit /
# Zone Settings:Edit（always_use_https）のみ。
provider "cloudflare" {}
