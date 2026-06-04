# Resend 手順（送信ドメインの認証）

> Resend コンソールでの ✋ 手順。送信メールの**設計**（identity・どのレコードが要るか）は
> [メール設計](email.md)、値の置き場は [変数の配置](../variables.md)、反映の順序は [デプロイ手順](../deploy.md)。

niqostudio.com を送信ドメインとして認証する。Resend が提示する DNS（DKIM と `send.` の MX/SPF）を
公開 DNS として Terraform に渡す。**値はダッシュボード表示に従う**（ハードコードしない）。

## 1. ドメイン登録
1. Resend → Domains → Add Domain → `niqostudio.com`。
2. 表示される DNS レコードを控える：
   - DKIM（`resend._domainkey` の TXT）
   - `send.niqostudio.com` の MX（Return-Path / バウンス）
   - `send.niqostudio.com` の SPF TXT（`include:_spf.resend.com`）

## 2. レコードを Terraform へ渡す
控えた値を**公開 DNS** として注入する（FQDN・相対名の扱いはダッシュボード表示どおり）：
- 本番：GitHub Variable `RESEND_DNS_RECORDS`（JSON 配列）。
- ローカル：`terraform.tfvars` の `resend_dns_records`。

レコードの役割と「混ぜ方」は [メール設計](email.md)。反映（`infra: apply`）は [デプロイ手順](../deploy.md)。

## 3. verify
apply 後、Resend ダッシュボードで verify 完了を確認 → `hi@niqostudio.com` から送信テスト。

## 4. Webhook（自動返信の到達確認）
問い合わせの自動返信が届いたら hi@ へ通知する仕組み（`/api/email-events`）の登録：
1. Resend → Webhooks → Add Endpoint → URL を `https://niqostudio.com/api/email-events`。
2. イベントは **`email.delivered`** と **`email.bounced`** を選ぶ。
3. 表示される **Signing Secret（`whsec_…`）** を Secret `RESEND_WEBHOOK_SECRET`（`website-production`）に設定。
4. Worker の deploy 後（secret 投入後）に有効。設計は [セキュリティ](../security.md)。

## 一次ソース
- [Domains](https://resend.com/docs/dashboard/domains/introduction)
- [DNS レコードの設定](https://resend.com/docs/knowledge-base/how-do-i-configure-dns-records)
- [Webhooks](https://resend.com/docs/dashboard/webhooks/introduction)
