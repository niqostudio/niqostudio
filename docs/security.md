# セキュリティ

> NIQO STUDIO システムの**脅威モデル・対策・実装状況**の正本。
> 2026-06 のセキュリティ監査に基づく。攻撃面ごとにチェックリストを持ち、各対策に**対応箇所（コード）**を併記する。
> 値の置き場は [変数の配置](variables.md)、メール認証は [メール設計](infra/email.md) も参照。
>
> 表記：`[x]`=実装済（本番反映は CI 経由）／`[ ]`=未対応・予定。「要 apply」はコードはあるが本番未適用。
> 対応箇所はパス末尾の短縮形で示す（同一節内の再掲は括弧で役割を区別）。

## 前提（脅威モデル）

- **全リポ public**。シークレットの値は追跡ファイルに置かない（CI Secret / Environment / `wrangler secret`）。
- **Supabase publishable key は公開前提**＝データ保護の関所は **RLS**（行＝ポリシー、機密列＝列 GRANT）。
- 実害の中心は **情報漏洩** と **公開エンドポイント（`/api/contact`）の悪用（スパム/コスト）**。
- 公開 auth（ユーザーログイン）は無効。**書き込みは最小権限の経路に限定**する。

## 攻撃面: お問い合わせフォーム（`/api/contact`）＋ Resend webhook（`/api/email-events`）

公開 SSR エンドポイント。スパム/コスト悪用・不正書き込み・偽装イベントが脅威。

- [x] 入力検証（必須 / email 形式 / 長さ上限）：client（`maxlength`＋`reportValidity`）＋ server — `ContactForm.astro` / `contact.ts`
- [x] CSRF：Astro `checkOrigin`（SSR 既定・同一オリジンの POST のみ） — フレームワーク既定
- [x] Bot 対策：Turnstile（site key 有りで検証必須。secret 欠落は deploy fail＋runtime 拒否＝フェイルクローズ） — `contact.ts`（siteverify）／ `ContactForm.astro`（ウィジェット）／ `website.yml`（deploy 整合チェック）
- [x] エッジレート制限：`POST /api/contact` を IP 単位で制限（しきい値は `config.<env>.json` の `rate_limit.contact`・既定 5 req/10s・要 apply） — `ratelimit.tf`
- [x] 最小権限書き込み：`inquiry_writer` JWT 経由のみ INSERT。JWT 欠落時は送信拒否（フェイルクローズ） — `contact.ts`（JWT 必須）／ `supabase.ts`（`inquiryClient`）
- [x] コスト面：通知メール（Resend）は Worker 経路のみ＝直叩きでメールは飛ばない — `contact.ts` / `email.ts`
- [x] webhook の署名検証：Svix（HMAC-SHA256）＋ ±5分のリプレイ防止。偽装イベントを拒否 — `email-events.ts`
- [x] webhook の最小権限：`inquiry_reader` JWT（SELECT＋`delivery_status` UPDATE のみ） — `email-events.ts` / `…060000_baseline.sql`

説明：publishable key は公開なので、攻撃者は Worker（Turnstile・レート制限）を**迂回して Supabase REST に直 INSERT** できる。これを塞ぐのが最小権限ロール `inquiry_writer` と anon の INSERT 剥奪。漏洩しても影響は inquiries への INSERT のみ。webhook は署名検証で偽装を弾き、権限も読取＋到達状況更新だけに限定する。

## 攻撃面: データ層（Supabase RLS）

publishable key 経由で anon が読めてしまう情報漏洩が脅威。

- [x] 全テーブル RLS 有効（ポリシー無し＝deny 既定） — `core/migrations/`（各テーブル定義）
- [x] 機密列の遮断：`real_name` / `internal_notes` は anon に列 GRANT しない — `…060000_baseline.sql`
- [x] 顧客の公開同意：`is_public_name_allowed = true` を RLS で必須化（未同意は `public_name` も出さない） — `…060000_baseline.sql`
- [x] 多層防御：公開 view 以外（生テーブル）への anon 表特権を REVOKE — `…060000_baseline.sql`
- [x] 書込み最小権限：`inquiry_writer` に inquiries の INSERT 列のみ GRANT、anon の INSERT は剥奪 — `…060000_baseline.sql`
- [x] **名前空間分離**：業務データを `core` スキーマへ集約し `public` を無効化（API 非公開・`REVOKE`）。anon は `core` に Supabase 既定権限を持たず、明示した `public_showcases` / `public_services` / `public_profile` view だけ SELECT（生テーブルは REVOKE） — `…060000_baseline.sql`

説明：RLS のポリシー有無だけに頼らず、表 GRANT でも書込みを遮断する二段構え。

## 攻撃面: 配信・セキュリティヘッダ（website）

XSS・クリックジャッキング・MIME スニッフィング等のブラウザ側脅威。ヘッダは `website/public/_headers`、CSP は Astro 設定。

- [x] `X-Content-Type-Options: nosniff` — `_headers`
- [x] `Referrer-Policy: strict-origin-when-cross-origin` — `_headers`
- [x] `Permissions-Policy`（カメラ/マイク/位置情報等を無効） — `_headers`
- [x] `X-Frame-Options: DENY`（クリックジャッキング・CSP meta で効かない frame-ancestors の代替） — `_headers`
- [x] `Strict-Transport-Security`（HSTS） — `_headers`
- [x] CSP 強制（Astro が `<meta>` 出力・インライン script/style の hash をビルド毎に自動生成） — `website/astro.config.mjs`

説明：CSP は Astro の `security.csp` が `<meta>` で出力。Turnstile・Supabase・Cloudflare Web Analytics（`*.cloudflareinsights.com`）を許可し、インライン hash は自動付与（Astro 更新でも壊れない）。`<meta>` では `frame-ancestors` が効かないため `X-Frame-Options: DENY` で代替する。

## 攻撃面: シークレット衛生

公開リポへの秘密値の混入・流出。

- [x] `.env` / `*.tfvars` / state / 鍵を gitignore（雛形 `*.example` のみ追跡） — ルート / 各モジュールの `.gitignore`
- [x] `signing_keys.json`（JWT 署名の秘密鍵）を gitignore — `infra/supabase/.gitignore`
- [x] gitleaks で誤コミットを CI 検出 — `.github/workflows/secret-scan.yml`
- [x] 監査で追跡ファイルへの実値混入なしを確認 — （手動監査）

## 攻撃面: インフラ / CI トークン

トークン過剰権限・本番への無断反映。

- [x] CF/CI トークンは対象スコープ＋必要権限のみ（infra=Workers Scripts/DNS/Email、website=Workers Scripts） — 正本 [変数の配置](variables.md)
- [x] PII（転送先・通知宛先）は Secret、公開 DNS は Variable に分離 — `infra-apply.yml` / `website.yml`
- [x] 本番反映（terraform apply / dbmate up / deploy）は承認ゲート付き Environment — `infra-apply.yml` / `db-migrate.yml` / `website.yml`
- [x] Environment はモジュール別（`<module>-<env>`）にスコープ＝ジョブが他モジュールの secret を読めない — [ADR 0003](adr/0003-environment-per-module.md)

## 攻撃面: メール認証（SPF / DKIM / DMARC）

なりすまし送信・到達率。詳細は [メール設計](infra/email.md)。

- [x] apex SPF は1本に統合（CF 転送用） — `config.production.json`（`email.spf_*`）
- [x] DKIM（`resend._domainkey`）で `d=niqostudio.com` 整列 — infra DNS（`resend_dns_records`）
- [ ] DMARC 強化（現状 `p=none`・rua 未設定） — `config.production.json`（`email.dmarc_*`）

## 攻撃面: 依存・サプライチェーン

乗っ取りパッケージ・既知脆弱性。

- [x] `minimumReleaseAge` で新規バージョンの取り込み cooldown — `pnpm-workspace.yaml`
- [x] wrangler を devDeps に版固定（CI は `pnpm exec` で実行・`dlx` の最新追従をやめる） — `website/package.json` / `website.yml`
- [x] 依存更新の監視：Dependabot（npm / github-actions・週次） — `.github/dependabot.yml`

## OWASP Top 10（2025）対応

各攻撃面を OWASP の枠で俯瞰する（網羅性の確認用）。詳細・対応箇所は上の各節。

| カテゴリ | 主な対応 | 状況 |
| --- | --- | --- |
| A01 アクセス制御の不備（SSRF 統合） | RLS＋列 GRANT、書込みは `inquiry_writer` 最小権限のみ。SSRF：公開 SSR は固定の外部 API（Turnstile / Resend / Supabase）のみ呼びユーザー指定 URL を fetch しない | ✅ |
| A02 セキュリティ設定ミス | deploy 前の構成整合チェック、承認ゲート、セキュリティヘッダ | ✅ |
| A03 ソフトウェアサプライチェーンの不備 | `minimumReleaseAge`、wrangler 版固定、Dependabot（npm / actions） | ✅ |
| A04 暗号化の失敗 | HTTPS / HSTS、秘密値は CI Secret・`wrangler secret` 管理 | ✅ |
| A05 インジェクション | Supabase クライアント（パラメータ化）、入力検証、CSP（強制） | ✅ |
| A06 安全でない設計 | 最小権限の書込み経路・フェイルクローズ設計 | ✅ |
| A07 認証・識別の失敗 | 公開 auth 無効、書込みは短命 JWT の最小権限ロールのみ | ✅ |
| A08 ソフトウェア/データ完全性の不備 | gitleaks、署名鍵を gitignore、本番反映は承認ゲート | ✅ |
| A09 ログ・アラートの不備 | Worker のエラーログ（`console.error`）、集約・アラートは未整備 | ◐ |
| A10 例外条件の不適切な処理 | フォームは try/catch で 500、各前提を fail-closed にして「黙って通す」を排除 | ✅ |

## 再点検

- 新しい公開エンドポイント・テーブル・第三者リソースを足したら、対応する攻撃面のチェックリストと対応箇所を更新する。
- 本ページは継続メンテ対象（変更時に対応箇所を追従）。
- 深掘りの再監査には `/code-review ultra` 等を用いる。
