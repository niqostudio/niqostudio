terraform {
  required_version = ">= 1.6"

  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }

  # state はリモート（Cloudflare R2 / S3 互換）。bucket/key/endpoints は backend.tfbackend で注入。
  #   terraform init -backend-config=backend.tfbackend
  #   R2 のアクセスキーは環境変数 AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY で渡す。
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

# Management API トークンは環境変数 SUPABASE_ACCESS_TOKEN で渡す（ここに値を書かない）。
# 発行: Supabase Account → Access Tokens（最小権限・対象プロジェクトのみを想定）。
provider "supabase" {}
