# cloudflare-redirect

ゾーン全体の動的リダイレクト（Single Redirect）。`http_request_dynamic_redirect` フェーズの
ruleset を作り、別ホストへ 301/302 等で転送する。対象ホストの DNS は proxied で通すこと。

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
| [cloudflare_ruleset.redirect](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/ruleset) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| target\_base\_url | 転送先のベース URL（例: https://niqostudio.com）。末尾スラッシュは付けない。 | `string` | n/a | yes |
| zone\_id | リダイレクト元ゾーンの ID | `string` | n/a | yes |
| description | ルールの説明 | `string` | `""` | no |
| expression | リダイレクトを発火させる条件式（Wireshark 風）。既定はゾーン全体。 | `string` | `"true"` | no |
| name | ruleset 名 | `string` | `"redirect"` | no |
| preserve\_path | true なら元のパスを転送先に連結する。 | `bool` | `true` | no |
| preserve\_query\_string | true ならクエリ文字列を維持する。 | `bool` | `true` | no |
| status\_code | リダイレクトのステータスコード。 | `number` | `301` | no |

## Outputs

| Name | Description |
|------|-------------|
| ruleset\_id | 作成した動的リダイレクト ruleset の ID |
<!-- END_TF_DOCS -->
