# stack: niqo-studio

niqo.studio -> niqostudio.com への 301 リダイレクト（パス・クエリ保持）。
Cloudflare 管理ドメイン。apex/www を proxied プレースホルダで通し、エッジで転送する。

apply は CI（`terraform-apply` dispatch）。ローカルは plan 確認 / 復旧用。tfvars は不要（zone_id は導出）。

```sh
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

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| env | デプロイ環境（読み込む config.<env>.json を選ぶ） | `string` | `"production"` | no |
| zone\_id | ゾーン ID（空なら config.<env>.json の source\_domain から導出） | `string` | `""` | no |

## Outputs

| Name | Description |
|------|-------------|
| dns\_record\_ids | プレースホルダ DNS レコードの ID |
| redirect\_ruleset\_id | 動的リダイレクト ruleset の ID |
<!-- END_TF_DOCS -->
