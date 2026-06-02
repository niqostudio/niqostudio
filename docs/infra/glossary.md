# 用語集（インフラの読み方）

> **責務**：用語の**定義**だけ。手順は [setup.md](setup.md)、配置は [変数の配置](../variables.md)。

このリポを読むのに必要な用語を、niqostudio の文脈に即して説明する。

## DNS まわり
- **ドメイン / ゾーン (zone)** … `niqostudio.com` のような名前と、その配下レコード全体の管理単位。
  Cloudflare では1ドメイン = 1ゾーン。`zone_id` はその識別子。
- **DNS レコード** … 名前→値の対応。種類で役割が変わる：
  - **A / AAAA** … 名前→IP（v4 / v6）。
  - **CNAME** … 名前→別の名前の別名。apex(裸ドメイン) でも Cloudflare は「CNAME flattening」で使える。
  - **MX** … そのドメイン宛メールを**受け取るサーバ**。`priority`（小さいほど優先）を持つ。
  - **TXT** … 任意テキスト。SPF / DKIM / DMARC はすべて TXT で表現する。
- **TTL** … レコードのキャッシュ時間（秒）。Cloudflare では `1` = Auto。
- **proxied（オレンジ雲）** … Cloudflare をリバースプロキシとして通す設定。通すと CDN/WAF や
  **エッジでのリダイレクト**が効く。通さない（DNS only）と素通し。

## メール認証（なりすまし対策の3点セット）
- **SPF** … 「この**ドメインから送ってよいサーバ**」のリスト（TXT）。`include:` で外部送信元を許可。
  **1つの名前に SPF は1本だけ**（複数あると無効）。
- **DKIM** … 送信メールに付ける**電子署名**。公開鍵を `<selector>._domainkey` の TXT に置く
  （Resend の selector は `resend`）。受信側が署名を検証する。
- **DMARC** … SPF/DKIM が**失敗した時どう扱うか**の方針（`_dmarc` の TXT）。
  `p=none`（監視）→ `quarantine` → `reject` と段階的に強くする。`rua=` でレポート送付先を指定。
- **整列 (alignment)** … 送信ドメインと SPF/DKIM のドメインが一致していること。DMARC 合格の条件。
- **Return-Path / バウンス** … 配送失敗の戻り先。Resend(SES) は `send.<domain>` サブドメインを使う。

## サービス
- **Cloudflare Email Routing** … ドメイン宛メールを**受信して転送**する仕組み（送信はしない）。
- **Resend** … メール**送信**サービス（内部は AWS SES）。ドメイン認証を DNS で行う。
- **Cloudflare Pages** … 静的サイト/フロントの**ホスティング**。`<project>.pages.dev` が既定ホスト。
- **Turnstile** … Cloudflare の CAPTCHA 代替。
- **Supabase** … Postgres ベースの BaaS（DB/認証）。スキーマは core モジュールが正本。
- **R2** … Cloudflare のオブジェクトストレージ（S3 互換）。ここに Terraform state を置く。

## Terraform / IaC
- **IaC (Infrastructure as Code)** … インフラ構成をコードで宣言し、再現可能にする考え方。
- **provider** … 対象サービスを操作するプラグイン（ここでは `cloudflare/cloudflare`）。
  `required_providers` で**出所とバージョン**を固定する。
- **resource** … 作成・管理する実体（例: `cloudflare_dns_record`）。
- **data source** … 既存値を**読むだけ**（例: `cloudflare_zone` でゾーンを名前引き）。
- **module** … 再利用する resource のまとまり（`modules/`）。
- **stack** … ドメイン/環境ごとに module を組み合わせた最終構成（`stacks/`）。**state はこの単位**。
- **state** … Terraform が「今あるもの」を記録するファイル。実体と1:1。壊すと差分検知が狂う。
- **backend** … state の保管場所（ここでは R2）。`backend.tfbackend` で接続情報を注入。
- **variable / tfvars** … 入力値。`*.tfvars` に実値、`*.tfvars.example` に雛形。
- **locals** … ファイル内で使う計算済みの値（導出のためによく使う）。
- **output** … stack の外へ公開する値（例: `domain` / `zone_id`）。
- **plan / apply** … 差分を表示 / 実際に適用。`fmt`=整形、`validate`=構文検査。
- **import** … 既存の実リソースを state に取り込む（復旧時に使う）。

## このリポ特有
- **config.\<env\>.json** … 公開してよい**定数の正本**（root の `config.<env>.json`＝env ごとに1ファイル・committed）。infra（Terraform・`var.env` で選択）と website が直読する。
- **正本 (source of truth)** … その値を「決める唯一の場所」。重複定義を避けるための原則。
- **モジュール** … 1つの monorepo 内の独立した単位（`website/` `core/` `infra/` `packages/`）。公開定数は root の `config.<env>.json` が正本で、infra と website が直読する（跨ぎ配布・注入はしない）。
