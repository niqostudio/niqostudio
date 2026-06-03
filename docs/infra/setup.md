# セットアップ手順（infra）

> **責務**：infra の構築・apply の**手順**と `config.<env>.json` 各キーの**意味**。値がどこに置かれるかの
> 一覧は [variables.md](../variables.md)、全体像は [architecture.md](../architecture.md)、用語は
> [glossary.md](glossary.md) を参照（ここでは繰り返さない）。

## 1. 前提ツール
- Terraform CLI `>= 1.6`（CI は 1.15.5 を使用 / provider は lock で 5.19.1 を固定）
- Cloudflare アカウント / 対象ゾーン（niqostudio.com, niqo.studio）
- state 用の R2 バケット（S3 互換）

## 2. 値の置き場所
どの値をどこに置くかの一覧は **[variables.md](../variables.md) が正本**。原則だけ再掲する：
- 値そのものは state にもコードにも残さない。
- `zone_id` / `account_id` は各ドメイン名から導出（書かない）。
- 公開定数=root `config.<env>.json`（infra と website が直読）/ 機微値=`*.tfvars`（gitignore）/ シークレット=環境変数・Environment Secret。

### tfvars のまとめ方 / 本番値の置き場
- Terraform は tfvars を**ディレクトリ横断で自動共有できない**（各 stack 自分の `terraform.tfvars` のみ）。
  共有スカラは `TF_VAR_*` 環境変数を1か所（ローカル=`.env`/direnv、CI=Environment Secrets/Variables）から流す。
- **本番 apply は CI（`terraform-apply` を dispatch・Environment `infra-production`・承認ゲート）** で実行。値は機微度で分け（下記台帳）、本番値はローカルに置かない。
  ローカルは**検証用ダミー tfvars**のみ。niqo-studio は tfvars 不要（config.<env>.json と導出で完結）。
- public リポでも Secrets はマスクされ fork PR に渡らないため、本番値の置き場として安全。

### state backend（R2 / S3 互換）
state は stack ごとに R2 へ置く。`backend.tfbackend`（追跡しない）で partial backend を注入する。

| 値 | 例 / 由来 | CI |
| --- | --- | --- |
| `bucket` | `niqostudio-tfstate` | Variable `R2_TFSTATE_BUCKET` |
| `endpoints.s3` | `https://<account_id>.r2.cloudflarestorage.com`（**account_id から導出**） | Repository Variable `CF_ACCOUNT_ID` から組み立て |
| `key` | `<stack>/terraform.tfstate`（例 `niqostudio-com/...` `niqo-studio/...`） | workflow が stack ごとに指定 |

- endpoint は account_id から一意に決まるので **account_id（`CF_ACCOUNT_ID`）だけを持ち**、CI は `backend.tfbackend` 生成時に組み立てる（backend は `init` 前に読まれ HCL 補間が効かないため、導出は workflow / ローカル手書き側で行う）。`CF_ACCOUNT_ID` は Worker deploy（website）とも共有の Repository Variable。
- R2 のアクセスキー（`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`）は Secret。

### トークン台帳（発行名 ＋ 注入先）
**配置の正本は [variables.md](../variables.md)**。ここは作成手順に要る**発行名・権限・注入先**だけを扱う。
トークン名は役割/用途ベース（命名規約は [variables.md](../variables.md)）。**発行名**＝プラットフォームでトークンを作る時に付ける名前（識別・失効のため）。`scripts/list-secrets` で workflow が参照する Secret 名を一覧できる。

| Secret（Environment `infra-production`） | 発行元 → 発行名 | 注入先 / 用途 |
| --- | --- | --- |
| `CF_TERRAFORM_TOKEN` | Cloudflare → API Tokens：**`infra-terraform`** | `CLOUDFLARE_API_TOKEN`。権限は下の権限表 |
| `R2_TFSTATE_KEY_ID` / `R2_TFSTATE_SECRET_KEY` | Cloudflare R2 → API Tokens：**`infra-tfstate`** | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`。S3 鍵ペア（ID も機密＝AWS 方針） |
| `EMAIL_FORWARD_TO` | （個人メール・発行物でない） | `TF_VAR_forward_to`（PII） |

#### トークンの権限（スコープ × 権限グループ × アクセス）
**`infra-terraform`**（Cloudflare Account API Token）— UI ラベルどおり：

| スコープ | 権限グループ | アクセス |
| --- | --- | --- |
| Account（NIQO STUDIO） | Workers Scripts | **Edit** |（Worker のカスタムドメイン束ね）
| Account | Email Routing Addresses | **Edit** |
| Account | Account Rulesets | **Edit** |
| Zone（niqostudio.com / niqo.studio） | DNS | **Edit** |
| Zone | Email Routing Rules | **Edit** |
| Zone | Dynamic URL Redirects | **Edit** |
| Zone | Zone | **Read** |

> **紛らわしい Zone 系の違い**（だから上記だけ選ぶ）：
> - `DNS` … DNS **レコード**の CRUD（← 選ぶ）。`Zone DNS Settings` … ゾーンの **DNS 設定**（DNSSEC/NS種別/CNAME flattening）＝レコードでない→不要。
> - `Zone` … **ドメインという実体**（id/account_id を読むだけ→ Read）。`Zone Settings` … サイトの**機能トグル**（SSL/キャッシュ等）→不要。
> - `Zone Access` … **Cloudflare Access (Zero Trust)** の認証ポリシー。DNS と無関係→不要。

**`infra-tfstate`**（Cloudflare R2 API Token・**Account 所有**・S3 認証用）:

| スコープ | 権限グループ | アクセス |
| --- | --- | --- |
| バケット `niqostudio-tfstate`（個別指定） | Object | **Read & Write** |

> 権限グループ名・アクセスは Cloudflare 公式の権限定義に準拠。Terraform リソース→権限の
> 対応は公式の一覧が無いため、初回 `plan`/`apply` で過不足を確認する。

> **注入先 env 名**は2種類：**固定**＝消費ツールが要求する名前で変更不可
> （CF provider=`CLOUDFLARE_API_TOKEN` / S3 backend=`AWS_ACCESS_KEY_ID`・`AWS_SECRET_ACCESS_KEY` /
> Terraform=`TF_VAR_*`）。**内部用**（state の bucket 等）は**配置名に揃える**
> （`R2_TFSTATE_BUCKET`）と翻訳が消えて読みやすい。account_id は Worker deploy と共有のため Repository Variable `CF_ACCOUNT_ID`。

公開値の CI **Variables**（`R2_TFSTATE_BUCKET` / `CF_ACCOUNT_ID` / `RESEND_DNS_RECORDS` / `PUBLIC_SUPABASE_*`）の配置は [variables.md](../variables.md) を参照（ここでは再掲しない）。

## 3. config.\<env\>.json（定数の意味）

root の `config.<env>.json`（env ごとに1ファイル・committed。infra の stack が `var.env` で選んで直読し、website も同じファイルを直読する）：

ドメインごとに転置した構成。各ドメインが自分の email / workers / redirect を持ち、Terraform stack（1 stack = 1 ドメイン）と 1:1 で対応する。

```jsonc
{
  "primary": "niqostudio.com",                   // 主ドメイン名。zone/account 導出・website の正 URL
  "domains": {
    "niqostudio.com": {
      "email": {
        "spf_includes": ["_spf.mx.cloudflare.net"], // apex SPF の include（転送用のみ。Resend は send. 側）
        "spf_all": "~all",                       // SPF 修飾子。~all=softfail / -all=fail
        "dmarc_policy": "none",                   // none→quarantine→reject と段階強化
        "dmarc_rua": ""                           // 集約レポート先。空だと監視が機能しない
      },
      "workers": {                               // role ごとのマップ。増えたら additive に追加
        "website": {
          "name": "website",                     // Worker 名。空=この role を束ねない。CI が deploy 名をこの値に上書き＋infra の service 束ねも一致
          "subdomain": ""                        // 束ねるサブドメイン（空=apex）。例 "admin"→admin.niqostudio.com
        }
      }
    },
    "niqo.studio": {                             // リダイレクト専用ドメイン（別ゾーン=niqo-studio stack）
      "redirect_to": "niqostudio.com",           // 転送先
      "placeholder_ip": "192.0.2.1"              // proxied A レコードのプレースホルダ
    }
  }
}
```
詳細な email の混ぜ方は [email.md](email.md) を参照。

## 4. apply（CI 専用）

apply は**必ず CI**（`terraform-apply` を dispatch・Environment `infra-production`・承認ゲート）。初回も同じで、前提（R2 state バケットと CF ゾーンの存在、Environment の Secret/Variable 設定）が揃えば dispatch するだけ。シークレットをローカルに置かず、state ロックも CI に集約するため。

```text
GitHub → Actions → terraform apply → Run workflow（dispatch）
→ Environment infra-production の承認 → init/apply（state は R2）
```

ローカル Terraform は **apply には使わない**。使うのは次のときだけ：

- **構文確認**：`terraform init -backend=false && terraform validate`（creds/state 不要）。
- **plan の事前確認 / state 復旧・import / state 操作**：R2 state に繋ぐため `backend.tfbackend`（`.example` からコピー）と必須変数（`TF_VAR_forward_to` 等。niqostudio-com は `terraform.tfvars.example` 参照）を与えて `terraform plan`。import など state 操作は [recovery.md](recovery.md)。
- `.terraform.lock.hcl` は**コミットする**（provider 固定）。

## 5. 自動化の現状
- **入出力リファレンス**：terraform-docs が各 README に自動生成（`scripts/gen-docs` / `terraform-docs` workflow）。
- **fmt/validate**：`terraform` workflow が PR で自動チェック。
- **本番 apply**：`terraform-apply` workflow（dispatch・Environment `infra-production`・承認ゲート）。
- **必要 secret 一覧**：`scripts/list-secrets` で workflow から自動抽出。
