# セキュリティ

> NIQO STUDIO システム（website / core / infra）の**脅威モデル・対策・実装状況**の正本。
> 2026-06 のセキュリティ監査に基づく。値の置き場は [変数の配置](variables.md)、メール認証は
> [メール設計](infra/email.md)、復旧は [recovery](infra/recovery.md) も参照。

## 前提（脅威モデル）

- **全リポ public**。シークレットの「値」は追跡ファイルに置かない（CI Secret / Environment /
  `wrangler secret` で注入）。
- **Supabase の publishable key は公開前提**。データ保護の関所は **RLS**（行＝ポリシー、機密列＝列 GRANT）。
- 実害の中心は **情報漏洩** と **公開エンドポイント（`/api/contact`）の悪用（スパム/コスト）**。
- 公開 auth（ユーザーログイン）は無効。**書き込みは最小権限の経路に限定**する。

## 実装状況（チェックリスト）

✅=コード実装済（本番反映は CI 経由）／🔜=予定・適用待ち

| 領域 | 対策 | 重要度 | 状態 |
| --- | --- | --- | --- |
| データ層 | 顧客の公開同意フラグ `is_public_name_allowed` を RLS で必須化 | 高 | ✅ |
| データ層 | 公開読みテーブルの anon 書込み表特権を REVOKE（多層防御） | 中 | ✅ |
| データ層 | `profile` を列単位 GRANT に限定（将来列の暗黙露出防止） | 低 | ✅ |
| 問い合わせ | 入力検証（必須 / email 形式 / 長さ） | - | ✅ |
| 問い合わせ | 最小権限 `inquiry_writer` 経由 INSERT、anon 直叩きを封鎖 | 高 | 🔜 phase2 適用待ち |
| 問い合わせ | エッジレート制限（Cloudflare・5 req/10s/IP） | 高 | ✅ apply 待ち |
| 問い合わせ | Turnstile（site key 有り＋secret 欠落は deploy を fail） | 中 | ✅ |
| ヘッダ | nosniff / Referrer-Policy / Permissions-Policy / X-Frame-Options / HSTS | 中 | ✅ |
| ヘッダ | CSP | 低 | 🔜 Report-Only（強制へ昇格予定） |
| シークレット | 値を追跡しない・gitleaks で誤コミット検出 | - | ✅ |
| インフラ | CF/CI トークン最小権限・PII/公開値の分離・承認ゲート | - | ✅ |
| メール | SPF / DKIM / DMARC | 中 | 🔜 DMARC を none→reject へ段階強化中 |
| 依存 | `minimumReleaseAge` cooldown | 低 | ✅ |
| 依存 | wrangler バージョン固定 | 低 | 🔜 |
| 依存 | CI 依存監査（pnpm audit / Dependabot） | 低 | 🔜 |

## システム全体

### シークレット衛生
- `.env` / `*.tfvars` / state / 各種鍵は gitignore。CI は GitHub **Environment** でモジュール別にスコープ注入。
- `signing_keys.json`（JWT 秘密鍵）も gitignore。gitleaks（[secret-scan.yml](https://github.com/niqostudio/niqostudio/blob/main/.github/workflows/secret-scan.yml)）で誤コミットを CI 検出。
- 状態: ✅（監査で追跡ファイルへの実値混入なしを確認）。

### Cloudflare / CI トークン
- infra の TF トークンは対象ゾーン限定＋必要権限のみ。website deploy は別トークン（Workers Scripts:Edit）。
- PII（転送先・通知宛先）は Secret、公開 DNS（Resend 認証レコード）は Variable に分離。
- 本番反映（terraform apply / db push / deploy）は**承認ゲート付き Environment**で実行。
- 状態: ✅。

### メール認証（SPF / DKIM / DMARC）
- apex SPF は1本（CF 転送用）、DKIM は `resend._domainkey`、DMARC は監視から。詳細は [メール設計](infra/email.md)。
- 状態: 🔜 DMARC を `p=none` から rua 設定 → `quarantine` → `reject` へ段階強化予定。

### データ層（Supabase RLS）
- publishable key は公開前提＝**RLS が関所**。機密列（`real_name` / `internal_notes`）は列 GRANT で遮断。
- 顧客の公開は **同意フラグ `is_public_name_allowed` を RLS で必須化**（未同意なら関連実績を公開しても `public_name` を出さない）。
- 公開読みテーブル（works / cases / services / profile）は **SELECT のみ**＝書込み表特権を anon から REVOKE。
- `profile` は全列開放をやめ**公開列のみ GRANT**（将来 internal 列を足しても暗黙露出しない）。
- 状態: ✅（`core/supabase/migrations/20260604000000_security_hardening_rls.sql`）。

## website

### お問い合わせフォーム（`/api/contact`）
唯一の公開 SSR エンドポイント。多層で守る：

1. **入力検証**: 必須 / email 形式 / 長さ上限（[contact.ts](https://github.com/niqostudio/niqostudio/blob/main/website/src/pages/api/contact.ts)）。
2. **CSRF**: Astro の `checkOrigin`（同一オリジンの POST のみ許可）。
3. **Bot 対策**: Turnstile。site key があるのに `TURNSTILE_SECRET_KEY` が欠落＝検証 skip の構成ミスは
   **deploy job で fail**（フェイルクローズ）。
4. **流量制限**: Cloudflare レート制限で `POST /api/contact` を IP 単位 **5 req/10s**（`infra/.../ratelimit.tf`）。
5. **書き込み（最小権限）**: 最小権限ロール **`inquiry_writer`**（inquiries への INSERT だけ）を名乗る
   JWT 経由でのみ INSERT。publishable key の**直叩き**（Worker / Turnstile / レート制限の迂回）は
   phase2 で anon の INSERT を REVOKE して封鎖。JWT は非対称 signing key で署名し、website-production の
   secret（`SUPABASE_INQUIRY_JWT`）として Worker に渡す。漏洩時の影響は inquiries への INSERT のみ。

- 通知メール（Resend）は **Worker 経路だけ**＝直叩きではメールが飛ばず、コスト悪用にならない。
- 状態: 1–4 ✅、5 は JWT 経路が稼働済み・**phase2（anon 剥奪）適用待ち**。

### セキュリティヘッダ
- `website/public/_headers` で `X-Content-Type-Options: nosniff` / `Referrer-Policy` /
  `Permissions-Policy` / `X-Frame-Options: DENY` / `Strict-Transport-Security` を全アセットに付与。
- **CSP** は Turnstile（`challenges.cloudflare.com`）と Supabase を許可しつつ、誤検知で壊さないよう
  **Report-Only** で導入。preview で違反ゼロを確認してから強制へ昇格する。
- 状態: ✅（CSP は Report-Only）。

## 監査・再点検
- 本ドキュメントは監査所見の要約。深掘り再監査は `/code-review ultra` 等で随時。
- 新しい公開エンドポイント・テーブル・第三者リソースを足したら、本チェックリストに項目を追加する。
