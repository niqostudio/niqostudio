# ADR 0007: SaaS 共通アカウント基盤を専用 Supabase プロジェクト（niqostudio-saas）に分離

- ステータス: 採用
- 決定日: 2026-06-12

## 背景

NIQO STUDIO が提供する SaaS 製品群（各 private repo・独自ドメイン運用）に共通のアカウント基盤
（認証・テナント・利用権）が必要になった。候補は次の3つだった。

1. 既存プロジェクト（core / studio）に identity 専用スキーマを足す
2. 専用の Supabase プロジェクトに分離する
3. 各製品が独立に auth を持つ（共通アカウントなし）

スキーマ分離（案1）はデータ面の隔離（GRANT を identity スキーマに閉じる）には十分だが、
**Auth（GoTrue）はプロジェクトに1つ**で、サインアップ有効化・auth 設定・レート制限・quota は
スキーマでは切れない。さらに **auth エンドポイント（issuer / JWKS の URL）はプロジェクト ref に
紐づき全製品のデプロイ設定に焼き込まれる**ため、後からの移設はセッション無効化と全製品の設定変更を
伴う実質恒久の決定になる。テーブルは後から持ち上げられるが、auth は持ち上げられない。

## 決定

- **専用プロジェクト `niqostudio-saas`** を新設し、Supabase Auth（サインアップ有効）と
  `identity` スキーマ（users / organizations / memberships / products / product_grants）を置く。
  既存プロジェクトは内部ドメイン（core / studio・サインアップ無効・authenticated なし）のまま不変。
- **ログインは各製品ドメインの固有フォーム**（supabase-js で直ログイン＝同一アカウント・セッションは
  製品ごと）。ドメイン横断 SSO（中央フォーム）は複数製品ユーザーが現実になった段階で
  Supabase Auth の OAuth 2.1 サーバ機能により**同じ auth.users 上に追加**できるため後段とする。
- **製品に secret を渡さない**: 製品側は URL・publishable key・公開 JWKS（ES256）のみ。
  サインアップ provisioning（プロフィール・個人 org・membership・利用権の作成）は
  `auth.users` の AFTER INSERT トリガ（SECURITY DEFINER）で DB 側に閉じる。
- **core と FK で繋がない**: `core.clients`（受託台帳・内部 CRM）と `identity.organizations`
  （顧客が作る SaaS テナント）は別概念として保ち、重なりは将来 FK なしの参照値で表現する。
- スキーマの正本は monorepo の **`saas-platform/`**（dbmate・`public.saas_platform_migrations` で追跡）。
  設定 IaC は `infra/stacks/supabase-saas`（state 分離）、ローカルスタックは `infra/supabase-saas`
  （55xxx ポート帯で内部スタックと並走）。本番適用の Environment は **`saas-platform-production`**
  （顧客向け信頼ドメインのため `infra-production` と分離・[ADR 0003](0003-environment-per-module.md) の
  `<module>-<env>` 命名に従う）。

## 影響

- 内部プロジェクトの posture（サインアップ無効・authenticated ゼロ GRANT・anon は公開 view のみ）は
  一切変わらない。「authenticated への GRANT は identity スキーマ（= saas プロジェクト）のみ」という
  機械的な境界規約が成立する。
- Free Tier の最後の1枠を使う。一時停止は全製品のログイン停止を意味するため keep-alive の対象に加え、
  実ユーザーが付いた製品が出た時点で本プロジェクトを有料化する。
- publishable key のローテーションは全製品の再デプロイを要する（運用結合）。
- 製品追加の定型手順: ①`config.<env>.json` の `saas.auth.additional_redirect_urls` に URL 追加
  （`stacks/supabase-saas` apply）→ ②製品・商品マスタの登録と反映（[ADR 0008](0008-saas-billing-centralized.md)
  ＝core が正本・`saas-products: sync` が identity / Stripe へ反映）→
  ③製品側は URL＋publishable key＋製品コードで実装。
- プロジェクト作成・SMTP・ES256 署名鍵はダッシュボード管理（`supabase_project` リソースは
  DB パスワードを state に残すため使わない＝秘密を state に残さない規約）。
