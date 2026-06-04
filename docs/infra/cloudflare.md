# Cloudflare 手順（コンソールでの ✋ 操作）

> Cloudflare ダッシュボードでの手動操作をまとめる（IaC＝Terraform / wrangler が担う分は対象外）。
> トークンの権限内訳・値の置き場は [変数の配置](../variables.md)、反映の順序は [デプロイ手順](../deploy.md)、
> メールの設計は [メール設計](email.md)。

## アカウント / ゾーン
- 対象ゾーン：`niqostudio.com`（本番）、`niqo.studio`（リダイレクト専用）。
- アカウント ID を控え、Repository Variable `CF_ACCOUNT_ID` に設定（R2 endpoint 組立と Worker deploy で共有）。

## API トークンの作成
役割ごとに3本を分離発行する。**権限の内訳は [変数の配置](../variables.md) のトークン表**に従い、ここでは発行操作のみ：

- `infra-terraform`（Account API Token）… My Account → API Tokens → Create Token → Custom token → 権限表どおり選択。→ Secret `CF_TERRAFORM_TOKEN`。
- `website-worker-deploy`（Account API Token）… 同様に Workers Scripts: Edit のみ。→ Secret `CF_DEPLOY_TOKEN`。
- `infra-tfstate`（R2 API Token）… R2 → Manage R2 API Tokens → Object Read & Write（バケット個別指定）。→ Secret `R2_TFSTATE_KEY_ID` / `R2_TFSTATE_SECRET_KEY`。

発行値は GitHub の各 Environment に設定する（配置は [変数の配置](../variables.md)）。

> 紛らわしい Zone 系の違い（だから権限表のものだけ選ぶ）：
> - `DNS`＝DNS **レコード**の CRUD（選ぶ）。`Zone DNS Settings`＝ゾーンの **DNS 設定**（DNSSEC 等）→不要。
> - `Zone`＝**ドメイン実体**（id/account_id を Read）。`Zone Settings`＝機能トグル（SSL/キャッシュ）→不要。
> - `Zone Access`＝**Cloudflare Access (Zero Trust)** の認証ポリシー。DNS と無関係→不要。

## R2（Terraform state）
- R2 → Create bucket → `niqostudio-tfstate`（Variable `R2_TFSTATE_BUCKET`）。
- S3 認証は上の `infra-tfstate` トークン。endpoint は account_id から導出（`https://<account_id>.r2.cloudflarestorage.com`）＝書かない。

## Email Routing（受信）
1. niqostudio.com → Email → Email Routing を Enable（受信 MX が自動付与される）。
2. 転送先（個人受信箱）の確認メールを承認。
3. **自動で入った apex SPF TXT を削除**。CF は有効化時に `v=spf1 include:_spf.mx.cloudflare.net ~all` を自動追加するが、Terraform も apex SPF を入れるため放置すると2本＝ RFC 7208 違反で SPF 全体が無効になる。Terraform 版に一本化する（理由は [メール設計](email.md)）。

## Worker / カスタムドメイン
- Worker 本体は website の `wrangler deploy`、カスタムドメイン束ねは infra の `workers.tf` が管理。
- ダッシュボードでは Workers & Pages → 対象 Worker で、カスタムドメインが意図どおり束ねられているかを確認（workers.dev は無効）。

## Worker ランタイム secret の目視確認
- deploy 時に CI が `wrangler secret bulk` で投入する（手動配置しない）。
- Workers & Pages → 対象 Worker → Settings → Variables and Secrets で `RESEND_API_KEY` / `TURNSTILE_SECRET_KEY` / `SUPABASE_INQUIRY_WRITER_JWT` / `SUPABASE_INQUIRY_READER_JWT` / `RESEND_WEBHOOK_SECRET` が入っているか目視確認（値は表示されない）。

## Turnstile
- Turnstile → Add site → ドメイン登録。
- site key（公開＝Repository Variable `PUBLIC_TURNSTILE_SITE_KEY`）と secret（`TURNSTILE_SECRET_KEY`）を発行し、GitHub に設定。

## 一次ソース
- [API トークンの作成](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [Email Routing](https://developers.cloudflare.com/email-routing/)
- [R2 の S3 API トークン](https://developers.cloudflare.com/r2/api/tokens/)
- [Workers のカスタムドメイン](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Turnstile](https://developers.cloudflare.com/turnstile/)
