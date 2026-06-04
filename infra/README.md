# infra

NIQO STUDIO の**プラットフォーム（IaC）**モジュール。ドメイン・DNS・メール・配信（Worker カスタムドメイン等）・
Terraform state を Terraform で管理する。アプリ実装は持たない。

> モノリポの一部。全体像・規約は root の [README](../README.md) / [CLAUDE.md](CLAUDE.md)、
> ドキュメントは [docs/](../docs/)（[architecture](../docs/architecture.md) / [variables](../docs/variables.md) /
> [deploy](../docs/deploy.md) / [cloudflare](../docs/infra/cloudflare.md) / [resend](../docs/infra/resend.md) / [email](../docs/infra/email.md) / [recovery](../docs/infra/recovery.md)）。

## 構成
```
modules/                      再利用モジュール
  cloudflare-dns-records/     ゾーンへ任意の DNS レコード群を投入
  cloudflare-email-routing/   ドメイン受信（転送ルール）
  cloudflare-redirect/        ゾーン全体の動的リダイレクト（Single Redirect）
stacks/                       合成（state はこの単位）
  niqostudio-com/             niqostudio.com（Web + 受信 + Resend 送信 DNS）
  niqo-studio/                niqo.studio -> niqostudio.com への 301 リダイレクト
scripts/                      gen-docs（terraform-docs 生成）/ list-secrets
```
- 公開定数の正本は root の [`config.<env>.json`](../config.production.json)（env ごとに1ファイル・committed）。各 stack が `jsondecode(file("${path.module}/../../../config.${var.env}.json"))` で読む（env は `var.env`・既定 production）。website も同じファイルを直読する。
- CI（fmt/validate・terraform apply・terraform-docs）は root `.github/workflows/`（paths=`infra/**`）。

## 設定の置き場
- **公開定数** → root `config.<env>.json`（ドメイン・SPF/DMARC 既定・Worker 名・リダイレクト元）。infra と website が直読する。
- **機微値 / 個人情報**（転送先メール・Resend の DNS 値）→ `*.tfvars`（gitignore）/ Environment Variable。
- **シークレット**（CF トークン・R2 キー）→ Environment Secret。state にも残さない。
- `zone_id` / `account_id` は各ドメイン名から **データソースで導出**（注入は API トークン1本）。

各 module / stack の入出力表は `README.md` に terraform-docs で自動生成する（`scripts/gen-docs`。CI で差分チェック）。

## ローカル Terraform（apply は CI 専用）
apply は CI（`terraform-apply` dispatch・Environment `infra-production`・承認ゲート）。ローカルは **構文確認** と **plan 確認 / state 復旧・import** にのみ使う。
```sh
# 構文確認だけ（creds / state 不要）
terraform -chdir=stacks/niqostudio-com init -backend=false && terraform -chdir=stacks/niqostudio-com validate

# plan 確認 / 復旧（R2 state に接続）
cd stacks/niqostudio-com
cp backend.tfbackend.example backend.tfbackend     # R2 の bucket/endpoints を埋める
export CLOUDFLARE_API_TOKEN=...                     # CF トークン（最小権限）
export AWS_ACCESS_KEY_ID=...  AWS_SECRET_ACCESS_KEY=...   # R2 の S3 互換キー（state 用）
export TF_VAR_forward_to=...                         # 必須変数。詳細は terraform.tfvars.example
terraform init -backend-config=backend.tfbackend && terraform plan
```
import など state 操作は [docs/infra/recovery.md](../docs/infra/recovery.md)。

## メール / リダイレクト設計
- 受信: Cloudflare Email Routing（apex MX は CF 管理）→ `hi@niqostudio.com` 転送。送信: Resend で `niqostudio.com` を verify（認証 DNS は `send.` ＋ `resend._domainkey`）。**apex SPF は転送用1本のみ**。詳細は [docs/infra/email.md](../docs/infra/email.md)。
- `niqo.studio` への全アクセスを `https://niqostudio.com` へ **301**（`modules/cloudflare-redirect`。apex/www は proxied プレースホルダ A で通す）。
