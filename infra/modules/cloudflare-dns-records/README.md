# cloudflare-dns-records

任意の DNS レコード群を1ゾーンに投入する汎用モジュール。Resend(SPF/DKIM/DMARC) や
Web(CNAME/A) など用途を問わず `records` で渡す。属性名は Cloudflare provider v5 系。

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| cloudflare | >= 5.0, < 6.0 |

## Providers

| Name | Version |
|------|---------|
| cloudflare | >= 5.0, < 6.0 |

## Resources

| Name | Type |
|------|------|
| [cloudflare_dns_record.this](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/dns_record) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| zone\_id | 対象 Cloudflare ゾーンの ID | `string` | n/a | yes |
| records | 作成する DNS レコード群 | <pre>list(object({<br/>    name     = string<br/>    type     = string<br/>    content  = string<br/>    ttl      = optional(number, 1) # 1 = Auto<br/>    priority = optional(number)<br/>    proxied  = optional(bool, false)<br/>    comment  = optional(string)<br/>  }))</pre> | `[]` | no |

## Outputs

| Name | Description |
|------|-------------|
| record\_ids | 作成した DNS レコードの ID（キー: type:name:content ハッシュ） |
<!-- END_TF_DOCS -->
