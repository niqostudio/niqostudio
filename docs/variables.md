# 変数の配置（monorepo）

> **責務**：「どの値を・どこに」の**配置マトリクス**と**命名・配置の原則**（正本）。**置き場を見出し**にし、各値が
> どのモジュールに要るかを示す。各値の**意味**は [infra/setup.md](infra/setup.md) / [infra/email.md](infra/email.md)、概念図は [architecture.md](architecture.md)。

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

## GitHub Environment Secret（承認ゲート・モジュール別）

### `core-production`
| 値 | 配置 | 必要とするモジュール | 備考 |
| --- | --- | --- | --- |
| `SUPABASE_DB_URL` | ✋ | core | Session pooler 接続文字列。db push（承認ゲート） |
| `SUPABASE_SECRET_KEY`（admin API がある場合のみ） | ✋ | core | `sb_secret_`・BYPASSRLS。migration には不要 |

### `infra-production`
| 値 | 配置 | 必要とするモジュール | 備考 |
| --- | --- | --- | --- |
| `CF_TERRAFORM_TOKEN` | ✋ | infra | TF が CF 操作。最小権限。発行名 `infra-terraform`（→ `CLOUDFLARE_API_TOKEN`） |
| `R2_TFSTATE_KEY_ID` / `R2_TFSTATE_SECRET_KEY` | ✋ | infra | S3 鍵ペア（ID も機密）。発行名 `infra-tfstate` |
| `EMAIL_FORWARD_TO` | ✋ | infra | 転送先メール（PII）→ `TF_VAR_forward_to` |

### `website-production`
| 値 | 配置 | 必要とするモジュール | 備考 |
| --- | --- | --- | --- |
| `CF_DEPLOY_TOKEN` | ✋ | website | Worker を deploy ＋ secret 投入する API トークン（Account → Workers Scripts: **Edit**）。発行名 `website-worker-deploy`（→ `CLOUDFLARE_API_TOKEN`）。infra の TF トークンとは分離 |
| `RESEND_API_KEY` | ✋ | website | 問い合わせ通知の送信（CI が `wrangler secret` へ投入） |
| `CONTACT_TO` | ✋ | website | 通知先アドレス（個人メール＝PII。CI が `wrangler secret` へ投入） |
| `TURNSTILE_SECRET_KEY` | ✋ | website | ボット検証 secret（未設定なら検証 skip。CI が `wrangler secret` へ投入） |
| `SUPABASE_INQUIRY_JWT` | ✋ | website | `role:inquiry_writer` を名乗る長寿命 JWT（最小権限・INSERT のみ）。`/api/contact` が anon 直叩きを避けて INSERT する経路。未設定なら publishable=anon にフォールバック。JWT secret で署名し発行 |

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

## wrangler secret（website ランタイム・サーバ側のみ）

> Worker 実行時に `/api/contact` が読む値（公開値でない＝ビルドにインラインされない）。手動設定ではなく
> **`website.yml` の deploy が `website-production` Environment から `wrangler secret bulk` で投入**する（空値は skip）。

| 値 | 配置 | 必要とするモジュール | 備考 |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | ✋ | website | 問い合わせ送信 |
| `CONTACT_TO` | ✋ | website | 通知先アドレス（個人メールなら PII） |
| `TURNSTILE_SECRET_KEY` | ✋ | website | ボット検証の secret |
| `SUPABASE_SECRET_KEY`（サーバ機能がある場合のみ） | ✋ | website | `sb_secret_`・BYPASSRLS。**純フロントなら不要** |

## wrangler var（website ランタイム・公開）

| 値 | 配置 | 必要とするモジュール | 備考 |
| --- | --- | --- | --- |
| `CONTACT_FROM` | ✋ | website | 通知メールの送信元（認証済みドメインのアドレス） |

> dev のローカル `.env`（website が必要とする値）は `website/.env.example` を正本とする。
