# モジュールが使う provider のソースを明示（既定の hashicorp/cloudflare と誤認させない）。
# バージョンの固定は利用側 stack で行うため、ここは下限のみ緩く指定する。
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = ">= 5.0, < 6.0"
    }
  }
}
