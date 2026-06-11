# 製品統合契約（product ⇄ niqostudio-saas）

> **責務**：SaaS 製品（各 private repo）が niqostudio の共通基盤と繋がるために知るべきこと**だけ**を定義する正本。
> 製品 repo はこのページと公開値のみで実装できる（monorepo の内部を参照しない）。
> 背景・設計は [アーキテクチャ](architecture.md)・[ADR 0007](../adr/0007-saas-identity-project.md)・
> [ADR 0008](../adr/0008-saas-billing-centralized.md)。変更はこのページの更新＋（構造変更なら）ADR を伴う。

## 製品が受け取る値（すべて公開値・秘密は渡さない）

| 値 | 用途 |
| --- | --- |
| `SAAS_SUPABASE_URL` | niqostudio-saas プロジェクトの URL（`https://<ref>.supabase.co`） |
| `SAAS_SUPABASE_PUBLISHABLE_KEY` | supabase-js のクライアントキー（`sb_publishable_`・RLS 準拠） |
| 製品コード | `core.products.slug`＝registry（`identity.products.code`）の値。niqostudio が発行 |
| レシート検証公開鍵（後段） | 署名レシートのローカル検証用（課金提供開始時に配布） |

事前に niqostudio 側で済んでいること：製品コードの registry 登録（`saas-products: sync`）と、
メールフローの戻り先 URL の允許リスト登録（必要な URL を伝えること）。

## アカウント

クライアントは supabase-js（schema は `identity`）：

```ts
import { createClient } from '@supabase/supabase-js';
const saas = createClient(SAAS_SUPABASE_URL, SAAS_SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: 'identity' },
});
```

- **サインアップ**：metadata に製品コードを渡すだけで、プロフィール・個人 org・membership・
  この製品の利用権（plan=free）まで DB 側で自動生成される。

```ts
await saas.auth.signUp({
  email, password,
  options: {
    data: {
      product: PRODUCT_CODE, // 製品コードのみでよい。表示名は registry から自動付与（下記）
      display_name: name,    // 任意
      locale: 'en',          // 任意・将来のメール多言語化用（フロントの表示言語をそのまま渡す。現状は英語のみ）
    },
    emailRedirectTo: 'https://<製品ドメイン>/auth/callback', // 允許リスト登録済みの URL のみ
  },
});
```

- **ログイン**：`signInWithPassword` / `signInWithOtp`（マジックリンク）。セッション管理は supabase-js に委譲。
- パスワードリセット等の `redirectTo` も允許リスト登録済み URL のみ有効（未登録は site_url にフォールバック）。
- **auth メールの差出人は `noreply@niqostudio.com`（NIQO STUDIO 名義）**で全製品共通。
  件名・文面には**製品の表示名が自動で入る**——`product` コードから registry の表示名
  （core.products.name の射影）が挿入時に metadata へ正規化されるため、**製品側から表示名を渡さない**
  （改竄・改名ドリフトの根を断つ。製品の改名はマスタ変更＋sync だけで以後のメールに反映）。
  製品側の責務として、**サインアップフォーム近くに「確認メールは NIQO STUDIO（アカウント基盤）から届く」旨を
  一行表示する**こと——見知らぬ差出人によるスパム誤認・confirmation 率低下を防ぐ。
  製品ドメイン差出人・製品ブランド（色・フォント）のメールは Send Email hook で後段（必要が実測されたら）。

## テナント解決（org）

製品は **user_id でなく org_id をテナントキー**として扱う。RLS が自分の所属分しか返さないため、
フィルタ不要で取得できる：

```ts
async function resolveOrgId(): Promise<string | null> {
  const { data: memberships } = await saas.from('memberships').select('organization_id');
  // provisioning（サインアップトリガ）直後の遅延・異常時は空がありうる。
  // throw せず null を返し、呼び出し側でリトライまたは「初期化中」表示にする。
  if (!memberships?.length) return null;
  return memberships[0].organization_id; // 現状は全員が個人 org 1つ＝先頭を採用。複数 org は将来（スイッチャー導入まで考慮不要）
}
```

- org という概念を UI に出す必要はない（チーム機能導入までは内部キーとしてのみ使う）。
- `memberships.role`（owner / member）は**製品の機能の出し分けに使わない**。entitlement は org 単位（role 非依存）で、
  role は将来の管理操作（org 設定・メンバー管理）用の予約。

## 利用権（entitlement / authz）

**判定は2軸**：有効性（covers＝その対象を使う権利があるか）と機能段（plan＝どの段か）は**別物**。
サインアップ provisioning は **`plan=free`・`scope=null`・無期限の grant を自動作成する**ので、
**free ユーザーでも covers() は true になる**。「covering grant が存在する」を有料判定に使うと全員有料になる。
有料判定＝「対象を覆う grant のうち plan が free でないものがあるか」。

```ts
const { data: grants } = await saas
  .from('product_grants')
  .select('plan, scope, status, expires_at, products!inner(code)')
  .eq('products.code', PRODUCT_CODE)
  .eq('organization_id', orgId); // アクティブ org に絞る（複数 org 化しても他 org の grant を拾わない）

// 有効性：active かつ 未失効 かつ scope が対象を覆う
const covers = (g: Grant, target: string | null) =>
  g.status === 'active' &&
  (g.expires_at === null || new Date(g.expires_at) > new Date()) &&
  (g.scope === null || g.scope === target);

// 機能段：対象を覆う grant の plan 集合から決める（plan 間の優先順位は製品が定義）
const plansFor = (target: string | null) => (grants ?? []).filter((g) => covers(g, target)).map((g) => g.plan);
const isPaid = (target: string | null) => plansFor(target).some((p) => p !== 'free');
```

- **enforcement はサーバ側で行う**。上のクライアント判定は**表示の出し分け専用**（クライアントは改竄できる前提）。
  課金機能の真のゲートは製品バックエンドが、ユーザーの JWT を `Authorization: Bearer` に載せて
  PostgREST を読んで判定する（RLS が効く・時刻比較もサーバ）。
- **fail-closed**。grants の読み取りに失敗した場合（ネットワーク・認証切れ・RLS エラー）は
  **権利なし（free）に落とす**。エラーで開かない。
- **scope の形式は append-only**。grant は購入時の scope 文字列のまま不変なので、製品側が正規化規則を
  破壊的に変えると**既存の付与が無言で失効（orphan 化）する**。形式変更は新旧併存（照合時に旧形式も試す）で行う。
- **`status` の値集合は `active / suspended / cancelled` の3値で固定**。PSP のライフサイクル状態
  （trialing / past_due / unpaid 等）は **billing が正規化してこの3値に写す**（trialing→active、
  past_due→猶予中は active・猶予超過で suspended、解約→cancelled）。製品は PSP の状態を意識せず、
  covers() は今後も active のみ通せばよい——試用・猶予の扱いが変わっても billing 側のマッピングで吸収し、
  この enum は変えない（変える場合は破壊的変更＝ADR＋通知）。
- `scope = null`＝org 全体（サブスク等）。`scope = <文字列>`＝対象束縛（一回課金等）。
  **scope の意味（projectKey 等の形式・正規化）は製品が定義する**——niqostudio は verbatim で保存するだけ。
- `plan` は offer キー（例 `launch_pass` / `pro_monthly`）。意味づけ（機能の出し分け）は製品側。
- **カバレッジと機能段は別軸**：対象のカバレッジ（scope / expires_at＝どこまで・いつまで使えるか）は
  **grant が決め**、機能段（plan の意味＝何ができるか）は**製品が決める**。covers() と「plan→機能」を
  混同しない（covers は機能を何も語らない）。
- grants の**書き込みは製品からはできない**（読み取り専用。付与は課金 webhook / niqostudio 側の管理操作）。
- 前提（基盤側で保証）：`identity.products` は authenticated に SELECT が開かれている（上記 join の成立条件）。
  列名は `memberships` / `product_grants` とも `organization_id`（生成型を正とする）。

## ブランド・運営者情報（正本は manifest 配信）

運営者情報（名称・リンク・ロゴ・将来の特商法表記等）の正本は **`GET https://niqostudio.com/operator.json`**。
製品はフッターの attribution・©・法務リンク・ロゴをこの manifest から描画する——運営情報の改定
（住所・表記・ページ URL）で製品の再デプロイを不要にするため。**値をハードコードしない**。

```jsonc
{
  "schema_version": 1,
  "name": "NIQO STUDIO",
  "copyright_holder": "NIQO STUDIO",        // © 表記は「© <year> <copyright_holder>」（year は製品側で算出）
  "contact": "hi@niqostudio.com",
  "links": {
    "site": "https://niqostudio.com/en",     // attribution のリンク先（英語の運営者ページ）
    "site_ja": "https://niqostudio.com",
    "privacy": "https://niqostudio.com/privacy"
    // 特商法表記ページの公開後に "legal_jp_tokushoho" が追加される。
    // 課金（billing）提供開始時には、購入導線からの特商法リンク表示を必須化する
  },
  "logos": {
    "wordmark_png_dark": "https://niqostudio.com/email-logo.png", // ダーク地用・auth メールと同一アセット
    "mark_svg": "https://niqostudio.com/favicon.svg"              // currentColor 継承
  }
}
```

- **取得はビルド時**を推奨（fetch してフッターに焼き込む＝ランタイム依存を作らない）。
  キーの削除・意味変更は破壊的変更（`schema_version` を上げる＋ADR・通知）。キー追加は非破壊。
- **attribution の文言規約**：*"{{製品名}} is built and operated by NIQO STUDIO"*（短縮形 *"by NIQO STUDIO"*）、
  リンク先は `links.site`。ロゴの改変（色変更・変形・余白侵食）はしない。テキストで足りる場面は
  mono・大文字・字間広めの「NIQO STUDIO」表記でもよい。
- サインアップ導線の差出人予告（前述）とこの attribution が対になって、auth メールの
  「NIQO STUDIO から届く」体験が説明可能になる。

## セキュリティ注記（製品側の責務）

- セッションは supabase-js 既定（localStorage）＝**XSS でトークン窃取されうる前提**で扱う。
  認証・課金 UI を出すページに第三者スクリプトを置かない。CSP を設定する。
- 型生成（`supabase gen types --project-id`）には**プロジェクトへの dev 認証**が要る（runtime の秘密ではないが
  「公開値だけ」の例外）。アクセスが無い場合は niqostudio が型スナップショットを渡す。

## JWT 検証（製品バックエンドがある場合）

- access token は ES256 署名の Supabase JWT。検証は公開 JWKS：
  `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`
- `sub` クレーム＝user_id。org・grants はトークンに載らないので、必要なら上記クエリで引く（ユーザーの JWT を
  `Authorization: Bearer` に載せて PostgREST を叩けば RLS が効く）。

## 型

`@niqostudio/db-types` は配布しない（リポ跨ぎの配布機構は持たない）。製品 repo で自前生成する：

```sh
supabase gen types typescript --project-id <ref> --schema identity > src/types/saas-database.ts
```

## 課金（billing v1・実装中＝この形で固定予定。「確定」表記になるまで実 URL は叩けない）

製品が触るのは次の3点だけ。**Stripe のコード・鍵・price ID は製品から完全に消える**。
エンドポイントは niqostudio-saas の Edge Functions（`https://<ref>.supabase.co/functions/v1/...`）。

### 1. checkout 作成 — `POST /functions/v1/billing-checkout`

- **認証不要**（匿名 checkout が一級市民）。その代わり billing 側で次を必須とする：
  ①製品コード・offer キーを registry と突合（不一致は 400）
  ②success / cancel URL の origin を製品ごとの允許リストで縛る（未登録 origin は拒否）
  ③**IP / origin 単位のレート制限**（カードテスティング・session 量産・Stripe レート消費への防御）
  ④**offer 種別と scope の整合検証**（サブスク offer に scope 付き、対象束縛 offer に scope 欠落、は 400）。
- リクエスト（JSON）：

```jsonc
{
  "product": "exampleapp",         // 製品コード（registry の code）
  "offer": "launch_pass",          // offer キー（バージョン・price ID は billing が現行版に解決）
  "scope": "<projectKey>",         // 対象束縛の一回課金のみ。org 全体（サブスク）は null
  "success_url": "https://…",      // 允許リスト登録済み origin のみ
  "cancel_url": "https://…",
  "locale": "en"                   // 任意（Stripe Checkout の表示言語）
}
```

- レスポンス：`{ "url": "<Stripe Checkout の URL>" }` — 製品はリダイレクトするだけ
  （既存の `/api/checkout` はこの呼び出しへのプロキシに置き換えられる）。

### 2. 成功リダイレクト＋署名レシート

- `success_url` に **`#receipt=<JWT>`**（URL **フラグメント**）として付与される。
  クエリでなくフラグメントなのは漏洩面のため（フラグメントは Referer・サーバログ・analytics に乗らない）。
  製品側の責務：成功ページに `Referrer-Policy: no-referrer` を設定し、読み取ったら
  `history.replaceState` で URL から即時除去する。第三者スクリプトを置かない（セキュリティ注記参照）。
- claims：`iss` / `iat` / `jti` / `product` / `scope` / `plan`（=offer キー）/ `exp`（短 TTL）。
- **検証チェックリスト（必須）**：署名（`kid` で鍵解決）／`iss`／`product` が自製品と一致／
  `scope` が対象と一致／`exp`。どれか欠けると製品跨ぎ・対象跨ぎ・replay を許す。
  `exp` / `iat` の比較には小さな clock skew 許容（±60s 程度）を持たせる（発行側と検証側の時計差で
  「発行直後なのに失効」と誤判定しないため）。
- 検証鍵：`GET /functions/v1/billing-keys`（JWKS・`kid` 付き）。**auth の JWKS とは別系統**＝
  レシート鍵のローテーションで製品の再デプロイは不要。
- **エンタイトルメントの解決規則（表示と enforcement を分ける）**：
  - **表示（クライアント）**：有効なレシートがあれば即 paid 表示してよい（往復ゼロの価値はここ）。
  - **enforcement（サーバ）**：権威は常に1つで、矛盾は発生させない。
    - ユーザーの JWT がある（ログイン済み）→ **grants のみが権威**。レシートはサーバ判定に使わない
      （返金・失効が即反映される）。
    - JWT が無い（匿名）→ **サーバ側でのレシート検証**（チェックリスト全項目）が唯一の根拠。
      検証成功時に製品は自分の永続化（自 DB の解錠レコード等）を行う——レシートは
      「購入直後の証明」であり、長期アクセストークンではない。

### 3. 表示価格 — `GET /functions/v1/billing-prices?product=<code>`

- 公開・認証不要。**現行版 offer の一覧**を返す（/pricing 等の表示はこれを読む＝製品から Stripe への
  price 取得が消える）：

```jsonc
[
  { "key": "launch_pass", "currency": "usd", "unit_amount": 900,  "interval": null,    "access_period_days": 30 },
  { "key": "pro_monthly", "currency": "usd", "unit_amount": 1900, "interval": "month", "access_period_days": null }
]
```

- `unit_amount` は **Stripe の最小通貨単位**（usd は 900=$9.00、ゼロ小数通貨の jpy は 900=¥900）。
  表示整形は製品側の責務。
- `access_period_days` は**一回課金の付与窓（日数・null=無期限）**。webhook が grant に書く
  `expires_at`（購入時刻＋この値）と同じマスタから出る＝**表示と enforcement の単一の正本**。
  製品は「30日」をハードコードせず必ずこの値を表示に使う（サブスクは null＝期間は `interval` が表現）。
  値は商品マスタの不変フィールド（変更＝新 version）なので、表示中に黙って変わることはない。

### 補足

- **匿名 checkout（一回課金）**：email のみで決済 → webhook が裏でアカウント・個人 org・grant を自動生成。
  ログインは任意（`signInWithOtp({ shouldCreateUser: true })` で webhook との順序競合も吸収できる）。
- webhook（Stripe→billing）は製品非関与。grant は webhook で恒久化され、レシートの即時解錠とは独立。
- offer キーの正準リストは製品登録時に確定して通知する（製品が参照するのは **offer キーのみ**。
  Stripe の lookup key `<code>_<key>_v<version>` は billing 内部表現で、製品からは見えない）。

## 変更管理

- この契約の正本は本ページ。**破壊的変更は事前に ADR ＋ 製品側への通知を伴う**。
- **offer キーは安定 join キー**（`billing-prices.key` ⋈ `grant.plan` ⋈ 製品の機能マップを貫く）。
  **リネーム・削除は破壊的変更**（既存 grant.plan・製品の機能マップ・価格 join が同時に壊れる＝ADR＋通知）。
  新規追加は非破壊。
- 製品追加・offer 追加は niqostudio 側の手順（[アーキテクチャ](architecture.md) のマスタ反映経路）で行い、
  製品 repo 側の変更は製品コード・plan キーの参照のみ。
