# メール設計（受信 + 送信を niqostudio.com に集約）

> **責務**：メールの設計と **DNS の混ぜ方**（メール系の正本）。用語は [用語集](glossary.md)、
> 障害時の切り分けは [recovery.md](recovery.md)。

niqostudio.com は **受信も送信も同じドメイン**で運用する。役者が3つ（Cloudflare 受信 /
Resend 送信 / 自前のポリシー）いて、DNS レコードを1ゾーンに**混ぜる**必要があるため、
「誰がどのレコードを持つか」を最初に固定する。

## 結論（現状の構成）

| | ドメイン | 仕組み | 状態 |
| --- | --- | --- | --- |
| **受信** | `niqostudio.com` | Cloudflare Email Routing → `hi@` を個人受信箱へ転送 | apply + 転送先検証で有効 |
| **送信** | `niqostudio.com` | Resend（AWS SES）で verify して送信 | **Resend の DNS を入れるまで未完** |

→ 受信は apply すれば動く。送信は「niqostudio.com として送る」意図だが、**Resend が出す DNS を
`resend_dns_records`（tfvars）に入れて apply するまで完成しない**。両方とも apex は同じ niqostudio.com。

!!! warning "「`send.`」は送信ドメインではない（よくある誤解）"
    送信メールの**見かけのドメイン（ヘッダ From）は `niqostudio.com`**。例: `hi@niqostudio.com`。
    `send.niqostudio.com` は **Return-Path（Envelope From / バウンスの戻り先）専用のサブドメイン**で、
    受信者には見えない Resend(SES) の実装都合。SPF はこの Return-Path に対して評価され、
    DKIM は `d=niqostudio.com` で整列するので、**DMARC は niqostudio.com として pass する**。
    → 受信も送信も identity は **niqostudio.com**。`send.` は技術的な戻り先にすぎない。

## レコードの責任分界（これが「混ぜ方」の答え）

1ゾーンに入るレコードを**出所ごと**に分けて管理する。SPF だけは「1名前に1本」という制約があるので注意。

| レコード | 名前 | 用途 | 出所 | Terraform 管理 |
| --- | --- | --- | --- | --- |
| MX ×3（ゾーン固有名） | `niqostudio.com` | **受信** | Cloudflare が有効化時に自動付与 | ❌ CF に任せる |
| TXT SPF（apex 1本） | `niqostudio.com` | **転送(forward)** 用 | **Terraform**（config.<env>.json） | ✅ |
| TXT DMARC | `_dmarc.niqostudio.com` | ポリシー/監視 | **Terraform**（config.<env>.json） | ✅ |
| TXT DKIM | `resend._domainkey.niqostudio.com` | **送信**署名（d= 整列） | Resend ダッシュボード | ✅ `resend_dns_records` |
| MX（バウンス） | `send.niqostudio.com` | Resend feedback/Return-Path | Resend ダッシュボード | ✅ `resend_dns_records` |
| TXT SPF（バウンス） | `send.niqostudio.com` | **送信認証**（`_spf.resend.com`） | Resend ダッシュボード | ✅ `resend_dns_records` |

ポイント：
- **受信 MX は apex、送信(バウンス) MX は `send.` サブドメイン**。名前が違うので衝突しない。
- 受信 MX の宛先（`*.mx.cloudflare.net`）は**ゾーンごとに固有名が割り当てられる**ため、
  ハードコードできない。Cloudflare の有効化に任せて TF では管理しない。
- **DKIM は apex（niqostudio.com）配下の `resend._domainkey`**。これで送信メールの `d=niqostudio.com`
  が DKIM 整列し、DMARC を pass できる（だから From も niqostudio.com にできる）。

## ⚠️ SPF は apex に1本だけ（重複の罠）

Cloudflare は Email Routing 有効化時に apex へ自動で
`v=spf1 include:_spf.mx.cloudflare.net ~all` を入れる。**Terraform も apex SPF を入れる**ので、
放置すると apex に SPF が2本 → RFC 7208 違反で SPF 全体が無効になる。

対応：**自動で入った SPF を1つ消し、Terraform 版に一本化する**。apex SPF は
`config.<env>.json` の `domains.niqostudio.com.email.spf_includes` から組み立てる：

```
v=spf1 include:_spf.mx.cloudflare.net ~all
```
- `_spf.mx.cloudflare.net` … Cloudflare が**転送時**に使う送信を許可（CF 推奨）。apex はこれだけでよい。

**apex に Resend(SES) の include は入れない**。理由：
- Resend の送信は Envelope From = `send.niqostudio.com`。SPF はその**サブドメイン側**で評価されるので、
  Resend の SPF（現行は `include:_spf.resend.com`。旧 `amazonses.com` は古い値）は
  `send.niqostudio.com` に `resend_dns_records` 経由で入れる。**値はダッシュボード表示に従う**（ハードコードしない）。
- apex から Resend で送るわけではないため、apex に SES/Resend include は不要。From=niqostudio.com の
  DMARC は **DKIM 整列（`d=niqostudio.com`）** で pass する。

## 手順（送信を有効化するまで）

1. **受信を先に有効化**：Cloudflare ダッシュボードで niqostudio.com の Email Routing を Enable
   （ゾーン固有の受信 MX が自動で入る）。転送先メールの確認メールを承認。
2. apex に**自動で入った SPF TXT を削除**（次の apply で TF 版に一本化するため）。
3. **Resend にドメイン登録** → 表示される DKIM / `send.` の MX・SPF を控える。
4. それらを **公開 DNS** として注入する（FQDN・相対名は使わない）：本番は GitHub Variable
   `RESEND_DNS_RECORDS`（JSON 配列）、ローカル検証は `terraform.tfvars` の `resend_dns_records`。
5. apply：本番は `terraform-apply` を dispatch（Environment `infra-production`・承認ゲート）、ローカルは
   `terraform plan` → `apply`。`niqostudio.com TXT(SPF)` `_dmarc` `resend._domainkey` `send.*` が入る。
6. Resend ダッシュボードで verify 完了を確認。`hi@niqostudio.com` から/へ送受信テスト。
7. 数日 DMARC レポート（`dmarc_rua`）を見て問題なければ、`config.<env>.json` の
   `domains.niqostudio.com.email.dmarc_policy` を `quarantine`→`reject` に上げて apply。

## 確認コマンド（apply 後）

```sh
dig +short MX  niqostudio.com           # 受信: *.mx.cloudflare.net が3本
dig +short TXT niqostudio.com           # SPF が「1本だけ」
dig +short TXT resend._domainkey.niqostudio.com   # DKIM
dig +short TXT _dmarc.niqostudio.com    # DMARC
dig +short MX  send.niqostudio.com      # 送信バウンス: feedback-smtp...amazonses.com（SES 実体のため amazonses ドメインで正・SPF の _spf.resend.com とは別物）
```
