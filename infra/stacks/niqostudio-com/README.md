# stack: niqostudio-com

niqostudio.com の合成: Web(Pages) DNS + Email Routing(受信) + Resend(送信)用 DNS。
送受信を同一ルートに集約し、SPF は1本に統合する。state はこの stack 単位で分離。

apply は CI（`terraform-apply` dispatch）。ローカルは plan 確認 / 復旧用。

```sh
cp terraform.tfvars.example terraform.tfvars        # forward_to・resend_dns_records を記入
cp backend.tfbackend.example backend.tfbackend      # R2 の bucket/endpoints を埋める
export CLOUDFLARE_API_TOKEN=...
terraform init -backend-config=backend.tfbackend
terraform plan
```

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.6 |
| cloudflare | ~> 5.0 |

## Providers

| Name | Version |
|------|---------|
| cloudflare | ~> 5.0 |

## Resources

| Name | Type |
|------|------|
| [cloudflare_pages_domain.this](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/pages_domain) | resource |
| [cloudflare_pages_project.this](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/pages_project) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| forward\_to | Email Routing の既定転送先（Cloudflare で検証済みの個人受信箱） | `string` | n/a | yes |
| cloudflare\_account\_id | Cloudflare アカウント ID（空ならゾーンから導出） | `string` | `""` | no |
| env | デプロイ環境（読み込む config.<env>.json を選ぶ） | `string` | `"production"` | no |
| inbound\_forwards | 受信転送ルール。キー=ローカルパート（@より前）、値=転送先。空なら hi@ を forward\_to へ1本作る。 | `map(string)` | `{}` | no |
| resend\_dns\_records | Resend ドメイン認証用の DNS レコード群 | <pre>list(object({<br/>    name     = string<br/>    type     = string<br/>    content  = string<br/>    ttl      = optional(number, 1)<br/>    priority = optional(number)<br/>    comment  = optional(string)<br/>  }))</pre> | `[]` | no |
| zone\_id | ゾーン ID（空ならドメイン名から導出） | `string` | `""` | no |

## Outputs

| Name | Description |
|------|-------------|
| account\_id | Cloudflare アカウント ID |
| dns\_record\_ids | 投入した DNS レコードの ID |
| domain | 正本として管理するルートドメイン |
| email\_routing\_rule\_ids | Email Routing 転送ルールの ID |
| pages\_project\_names | Cloudflare Pages プロジェクト名（role => name） |
| zone\_id | Cloudflare ゾーン ID（domain から導出 or 上書き値） |
<!-- END_TF_DOCS -->
