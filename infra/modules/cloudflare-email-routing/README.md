# cloudflare-email-routing

Cloudflare Email Routing でドメイン受信を有効化し、アドレス転送ルールを作る。
転送先は Cloudflare 側で検証（確認メール）が必要。属性は provider v5（`matchers`/`actions`）。

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
| [cloudflare_email_routing_address.destinations](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/email_routing_address) | resource |
| [cloudflare_email_routing_rule.rules](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/email_routing_rule) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| account\_id | Cloudflare アカウント ID | `string` | n/a | yes |
| zone\_id | 対象ゾーンの ID | `string` | n/a | yes |
| destination\_addresses | 転送先メールアドレス（Cloudflare で検証が必要） | `list(string)` | `[]` | no |
| rules | 転送ルール（custom\_address 宛を forward\_to へ転送） | <pre>list(object({<br/>    custom_address = string<br/>    forward_to     = string<br/>  }))</pre> | `[]` | no |

## Outputs

| Name | Description |
|------|-------------|
| rule\_ids | 作成した転送ルールの ID（キー: custom\_address） |
<!-- END_TF_DOCS -->
