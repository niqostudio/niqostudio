# ADR 0008: SaaS 課金を niqostudio 側に横断集約（entitlement モデル・PSP port・商品マスタの IaC）

- ステータス: 採用
- 決定日: 2026-06-12

## 背景

[ADR 0007](0007-saas-identity-project.md) で SaaS 共通アカウント基盤（niqostudio-saas）を分離した。
課金には2形態がある：サブスクリプション（org 全体・継続）と一回課金（特定対象・買い切り＝
対象ごとのワンタイムパス）。当初は「課金は各製品が Stripe を adapter として持つ」想定だったが、
製品が増えるたびに checkout / webhook / 失効処理が重複し、税務対応（英語圏販売の sales tax / VAT）も
製品ごとに分散する。一方、一回課金の価値は「サインアップの壁なしで 払う→即解錠」の手軽さであり、
ログインを前提に集約すると殺してしまう。

## 決定

### 1. entitlement モデル：grants は「スコープと期限を持つ org の利用権」

`identity.product_grants` に `scope`（NULL=org 全体 / 値あり=対象束縛）と `expires_at`（NULL=無期限）を持たせ、
サブスクも一回課金も同じ行で表す。有効判定は「status=active かつ 未失効 かつ scope が対象を覆う」。

- `scope` は **niqostudio から見て opaque な製品定義文字列**（製品が計算し checkout metadata で渡す
  → verbatim 保存。意味の解釈・正規化を platform に持たせない＝platform は製品非依存）。
- org 全体 grant は製品ごとに1行（partial unique）、scope 付きは対象ごとに1行（`UNIQUE(org, product, scope)`）。
  **再購入は upsert で expires_at を延長**し行を増やさない＝grants は「現在の authz 状態」。
  購入履歴・PSP イベントは課金側の ledger（別テーブル）に持ち、grants に積まない。

### 2. 課金は niqostudio 側の billing service に集約・PSP は ports/adapters

checkout session の作成・webhook 受信・grants の upsert・失効（refund / dispute）は
niqostudio-saas 側の billing service（Edge Functions / Worker）が持つ。**製品は PSP のコード・鍵を一切持たない**。
PSP は port の背後に置き、初期 adapter は Stripe。port の実益は**英語圏販売の税務**で、
Merchant of Record（Paddle / Lemon Squeezy 等）への adapter 交換を製品無変更で可能に保つこと。

- 価格の正本（PSP の price）は niqostudio 側に集約し、製品は plan コードだけを参照する
  （billing service が lookup key で解決）。
- checkout 作成エンドポイントは匿名で叩けるため、rate limit ＋ サーバ側の product / price 允許リストを必須とする。

### 3. 一回課金＝匿名 checkout ＋ 署名レシート（手軽さを殺さない）

- **匿名 checkout**：email のみで決済 → webhook で get-or-create user（既存トリガが個人 org を暗黙生成）
  → scoped grant を upsert。買い手の体験は「払う→解錠」でサインアップの壁ゼロ。
  ログインは任意（マジックリンクは製品クライアントの `signInWithOtp`＝秘密不要）。
- **即解錠は署名レシート**：success リダイレクトに billing が署名した「paid・scope・exp」を載せ、
  製品はローカル検証で往復ゼロの解錠。署名は**非対称（Ed25519 / ES256 の JWT）**とし製品は公開鍵で検証する
  （HMAC は共有鍵＝製品がレシートを偽造できるため不可。「製品に秘密を渡さない」不変条件を維持）。
  レシートは短 TTL の capability、恒久の正本は grants。製品のローカル解錠キャッシュは
  セッション復元時に grants で再検証する。
- **冪等性**：PSP の event id で dedup／user は get-or-create by email／grant は upsert。
  既存ユーザーの匿名購入は**個人 org に着地**する（仕様）。
- サブスクリプションは関係前提のため just-in-time ログインを要求してよい（org 文脈が要る）。

### 4. 製品・商品マスタの正本は core（業務データ）。Stripe へは Terraform、identity へは射影で反映

- **正本は core DB**：製品＝既存の `core.products`（ポートフォリオ台帳。SaaS・受託成果物・屋号自身が混在
  するため、顧客がサインアップ・課金できる SaaS 製品を `is_saas` で明示）、商品＝`core.product_offers`
  （offer キー・通貨・金額・billing_interval の有無でサブスク / 一回課金）。**管理は studio**（業務データ）。
- **商品は (product, key) ごとに現行価格1行**。改定＝行の直接 UPDATE → sync で Stripe へ
  新 price として反映（Stripe の price は immutable）。改定履歴は Stripe のアーカイブ済み price、
  販売の事実は台帳（billing.purchases）の金額スナップショットが持つ。
  ※当初は version 付き不変行（改定＝新 version 行）としたが、grants / 台帳 / 契約のどこからも
  version を参照しておらず、core に履歴を持つ実益がないため現行価格1行に改定した（2026-06）。
- **Stripe への反映は Terraform**：`saas-products: sync` workflow が core から
  `products.auto.tfvars.json`（gitignore）を書き出し、`infra/stacks/stripe` を apply する。
  price の lookup key は `<製品コード>_<offer キー>`。billing service は販売中 offer を
  このキーで解決し、price ID をどこにも焼き込まない。改定時の lookup key は
  `transfer_lookup_key` が新 price へ引き継ぎ、旧 price はアーカイブになる
  （既存サブスクは旧 price のまま継続）。
- **`identity.products` は core の射影**（code=slug / name / status のみ・対象は is_saas の部分集合）。
  「コピー」ではなく core→website の公開 view と同じ truth→射影で、別信頼ドメインのため view でなく
  同 workflow の別 job（`saas-platform-production`）が upsert する。書き出しから消えた code は
  inactive 化（grants から参照されるため行は消さない）。saas ドメインは実行時に core を読まず自己完結
  （サインアップトリガの code 検証・grants の FK・keep-alive ping 先を維持）。
- sync の起動は workflow_dispatch（将来は studio の操作ボタン＝既存 DeployTrigger の作法で叩く）。

## 影響

- niqostudio-saas に**初のアプリケーションコード**（billing service）が生まれる。デプロイ・secrets
  （PSP 鍵・レシート署名秘密鍵）・監視の運用面が増える（実装は製品の課金が繋がる時点）。
- 可用性結合が強まる：billing 停止＝全製品で販売停止。free tier の一時停止が販売も塞ぐため、
  有料化の判断は前倒し気味に行う。
- 製品追加の定型手順：①studio で `core.products`（is_saas）と `core.product_offers` を登録 →
  ②`saas-products: sync` を dispatch（Stripe ＋ identity.products へ反映）→
  ③`config.<env>.json` に redirect URL を追加（supabase-saas apply）→
  ④製品側は plan コード＋publishable key＋公開鍵（レシート検証）のみ。
- 既知の許容リスク：匿名購入の email typo（即解錠は通る・復元アカウントが orphan 化）／
  webhook 前の `signInWithOtp` 空振り（リトライまたは `shouldCreateUser: true` で吸収）。
