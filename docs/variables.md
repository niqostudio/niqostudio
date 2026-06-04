# 変数の配置（monorepo）

> **責務**：「どの値を・どこに」の**配置マトリクス**と**命名・配置の原則**（正本）。**置き場を見出し**にし、各値が
> どのモジュールに要るかを示す。設計は [architecture.md](architecture.md)、メールの混ぜ方は [infra/email.md](infra/email.md)、反映手順は [deploy.md](deploy.md)。

## 環境の見立て（モジュール × 環境）
どのモジュールがどの環境を持つか。環境は branch で選ぶ（`main`→production / `develop`→staging）。現状は production 単一。
Environment 名は **`<module>-<env>`**（例 `core-production`・`infra-production`／将来 `core-staging`）。設計は [ADR 0003](adr/0003-environment-per-module.md)。

| モジュール | 環境の単位 | 現状 | 複数環境を持つ場合 |
| --- | --- | --- | --- |
| infra | 共有 Cloudflare アカウント（単一） | `infra-production` のみ | 共有のため分割しない |
| core | Supabase プロジェクト単位 | `core-production` のみ | staging は別プロジェクト＝`core-staging`（同名 secret を Environment で出し分け） |
| website | デプロイ単位 | production のみ | staging サイトを `website-staging` で出し分け |
| core-types | 環境なし（build 時の型生成） | — | — |

## 凡例と原則
- **見出し＝置き場**。公開/秘密は置き場で判る（`config.<env>.json` / Variable ＝公開、Secret / wrangler secret ＝秘密）。**配置**＝✋手動 / 🤖自動（CI・Terraform）。**必要とするモジュール**＝消費側（Repository Variable は複数モジュールが参照しうる）。
- **命名**：`[PUBLIC_]<SERVICE>_<ROLE>`。`PUBLIC_` は **Astro/Vite がブラウザ/出力に inline する公開値**にだけ付ける（envPrefix）。ブランド名・環境名は埋めない。
- **公開定数は env ごとのファイル**：環境で変わる公開定数（ドメイン等）は root の `config.<env>.json` に env ごとに分け、infra（`var.env`）と website（`DEPLOY_ENV`）が直読する（設計は [ADR 0002](adr/0002-config-domain-centric.md)）。
- **環境はモジュール別 Environment にスコープ**：secret 名は環境に依存させず、同名を `<module>-<env>` Environment で出し分ける。各環境は独立（設計は [ADR 0003](adr/0003-environment-per-module.md)）。
- **publishable / site key は公開鍵**（フロントに載ってよい）。secret key・API key はサーバ専用。Supabase は新キーモデル（`sb_publishable_` / `sb_secret_`）。

## root `config.<env>.json`（infra と website が直読・committed）

| 値 | 配置 | 必要とするモジュール | 備考 |
| --- | --- | --- | --- |
| `primary` | ✋ | infra, website | 主ドメイン名。zone/account 導出・website 正 URL |
| `domains.<domain>.email.*` | ✋ | infra | `spf_includes` / `spf_all` / `dmarc_policy` / `dmarc_rua` |
| `domains.<domain>.workers.<role>.*` | ✋ | infra, website | `name`（Worker 名＝CI が deploy 名に使用＆infra が service 束ね） / `subdomain`（role マップ） |
| `domains.<domain>.{redirect_to,placeholder_ip}` | ✋ | infra | リダイレクト専用ドメイン |

> `zone_id` / `account_id` は各ドメイン名から **data source で導出**（🤖）＝書かない。

### 各キーの意味（`config.production.json`）

ドメインごとに転置（各ドメインが email / workers / redirect を持ち、Terraform stack＝1 ドメインと 1:1）。

```jsonc
{
  "primary": "niqostudio.com",                    // 主ドメイン名。zone/account 導出・website の正 URL
  "domains": {
    "niqostudio.com": {
      "email": {
        "spf_includes": ["_spf.mx.cloudflare.net"], // apex SPF の include（転送用のみ。Resend は send. 側）
        "spf_all": "~all",                          // SPF 修飾子。~all=softfail / -all=fail
        "dmarc_policy": "none",                     // none→quarantine→reject と段階強化
        "dmarc_rua": ""                             // 集約レポート先。空だと監視が機能しない
      },
      "workers": {                                  // role ごとのマップ。増えたら additive に追加
        "website": {
          "name": "website",                        // Worker 名。空=この role を束ねない。CI が deploy 名をこの値に上書き＋infra の service 束ねも一致
          "subdomain": ""                           // 束ねるサブドメイン（空=apex）。例 "admin"→admin.niqostudio.com
        }
      }
    },
    "niqo.studio": {                                // リダイレクト専用ドメイン（別ゾーン＝niqo-studio stack）
      "redirect_to": "niqostudio.com",              // 転送先
      "placeholder_ip": "192.0.2.1"                 // proxied A レコードのプレースホルダ
    }
  }
}
```

email レコードの混ぜ方の設計は [メール設計](infra/email.md) を参照。

## GitHub Environment Secret（承認ゲート・モジュール別）

### `core-production`
| 値 | 配置 | 必要とするモジュール | 備考 |
| --- | --- | --- | --- |
| `SUPABASE_DB_URL` | ✋ | core | Session pooler 接続文字列。db push（承認ゲート） |
| `SUPABASE_SECRET_KEY`（admin API がある場合のみ） | ✋ | core | `sb_secret_`・BYPASSRLS。migration には不要 |

### `infra-production`
| 値 | 配置 | 必要とするモジュール | 備考 | 権限（発行時） |
| --- | --- | --- | --- | --- |
| `CF_TERRAFORM_TOKEN` | ✋ | infra | TF が CF 操作。最小権限。発行名 `infra-terraform`（→ `CLOUDFLARE_API_TOKEN`） | Account(NIQO STUDIO)<br>　Workers Scripts: Edit<br>　Email Routing Addresses: Edit<br>　Account Rulesets: Edit<br>Zone(niqostudio.com / niqo.studio)<br>　DNS: Edit<br>　Email Routing Rules: Edit<br>　Dynamic URL Redirects: Edit<br>　Zone: Read |
| `R2_TFSTATE_KEY_ID` / `R2_TFSTATE_SECRET_KEY` | ✋ | infra | S3 鍵ペア（ID も機密）。発行名 `infra-tfstate` | バケット `niqostudio-tfstate`<br>　Object: Read & Write |
| `EMAIL_FORWARD_TO` | ✋ | infra | 転送先メール（PII）→ `TF_VAR_forward_to` | — |

### `website-production`
| 値 | 配置 | 必要とするモジュール | 備考 | 権限（発行時） |
| --- | --- | --- | --- | --- |
| `CF_DEPLOY_TOKEN` | ✋ | website | Worker を deploy ＋ secret 投入する API トークン。発行名 `website-worker-deploy`（→ `CLOUDFLARE_API_TOKEN`）。infra の TF トークンとは分離 | Account(NIQO STUDIO)<br>　Workers Scripts: Edit |
| `RESEND_API_KEY` | ✋ | website | 問い合わせ通知の送信（CI が `wrangler secret` へ投入） | — |
| `CONTACT_TO` | ✋ | website | 通知先アドレス（個人メール＝PII。CI が `wrangler secret` へ投入） | — |
| `TURNSTILE_SECRET_KEY` | ✋ | website | ボット検証 secret。site key 設定時は必須（欠落で deploy fail＋runtime 拒否＝フェイルクローズ）。site key 無しなら検証 skip。CI が `wrangler secret` へ投入 | — |
| `SUPABASE_INQUIRY_WRITER_JWT` | ✋ | website | `role:inquiry_writer` を名乗る長寿命 JWT（最小権限・INSERT のみ）。`/api/contact` が anon 直叩きを避けて INSERT する経路。**必須**（欠落で送信 500＝フェイルクローズ／deploy 整合チェックでも弾く）。発行手順は [Supabase 手順](infra/supabase.md) | DB role `inquiry_writer`<br>　inquiries: INSERT のみ |
| `SUPABASE_INQUIRY_READER_JWT` | ✋ | website | `role:inquiry_reader` を名乗る長寿命 JWT。`/api/resend-webhook` が到達状況を反映するための SELECT＋更新経路。発行手順は [Supabase 手順](infra/supabase.md) | DB role `inquiry_reader`<br>　inquiries: SELECT＋`delivery_status` UPDATE のみ |
| `RESEND_WEBHOOK_SECRET` | ✋ | website | Resend webhook の Svix 署名検証用（`whsec_…`）。`/api/resend-webhook` が偽装イベントを弾く。登録手順は [Resend 手順](infra/resend.md) | — |

> トークン・JWT の**発行手順**と権限名の細かい注釈は各プラットフォーム手順へ：CF トークンは [Cloudflare 手順](infra/cloudflare.md)、`SUPABASE_INQUIRY_WRITER_JWT` は [Supabase 手順](infra/supabase.md)。権限グループ名・アクセスは Cloudflare 公式の権限定義に準拠（TF リソース→権限の対応表は公式に無く、初回 `plan` / `apply` で過不足を確認）。

## GitHub Environment Variable（モジュール別・公開・環境依存）
非秘密だが apply / deploy だけが使う＝各モジュールの Environment にスコープ（`PUBLIC_` は付けない＝ブラウザに出ないため）。

### `infra-production`
| 値 | 配置 | 必要とするモジュール | 備考 |
| --- | --- | --- | --- |
| `R2_TFSTATE_BUCKET` | ✋ | infra | R2 の state バケット名（endpoint は `CF_ACCOUNT_ID` から組み立て・ローカルは backend.tfbackend） |
| `RESEND_DNS_RECORDS` | ✋ | infra | Resend 認証 DNS。**JSON 配列のみ**（`resend_dns_records =` の代入頭は付けない）。CI が `.auto.tfvars.json` に包んで渡す。ローカルは `terraform.tfvars`（HCL）側に書く |

### `website-production`
| 値 | 配置 | 必要とするモジュール | 備考 |
| --- | --- | --- | --- |
| `CONTACT_FROM` | ✋ | website | 通知メールの送信元（認証済みドメインのアドレス。非秘密。CI が `wrangler secret` へ投入） |

## GitHub Repository Variable（公開・環境非依存・複数モジュールが参照しうる）
複数モジュールが共有する非秘密値。`PUBLIC_` 付き＝website が bundle に焼き込む公開値（Vite envPrefix）。

| 値 | 配置 | 必要とするモジュール | 備考 |
| --- | --- | --- | --- |
| `CF_ACCOUNT_ID` | ✋ | infra, website | Cloudflare アカウント ID（非秘密）。infra=R2 endpoint 組立 / website=Worker deploy（wrangler `accountId`） |
| `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✋ | website, infra(keep-alive) | フロントに載る公開鍵（`sb_publishable_`・RLS 準拠）。SSG ビルド＆ping |
| `PUBLIC_TURNSTILE_SITE_KEY` | ✋ | website | ボット対策の公開 site key（未設定なら検証 skip） |

## Worker ランタイム値（独立した置き場を持たない）

`/api/contact` が実行時に読む値（`RESEND_API_KEY` / `CONTACT_TO` / `TURNSTILE_SECRET_KEY` / `SUPABASE_INQUIRY_WRITER_JWT` / 公開の `CONTACT_FROM`）は、上の `website-production` Environment の Secret/Variable と**同一値**。deploy 時に `website.yml` が `wrangler secret bulk` / var で Worker へ投入する（空値は skip）＝**手動配置しない**ので、ここに別表は持たない。投入済みかの目視確認は [デプロイ手順](deploy.md) を参照。

> dev のローカル `.env`（website が必要とする値）は `website/.env.example` を正本とする。
