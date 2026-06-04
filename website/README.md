# NIQO STUDIO — website

NIQO STUDIO の公開サイト。Supabase の読み取りビュー兼、問い合わせの受け口。

## Stack

- Astro 6 (static + Cloudflare adapter)
- Tailwind CSS 4
- Supabase (`@supabase/supabase-js`, publishable key)
- Cloudflare Pages（ホスティング / Pages Functions）
- Resend（問い合わせメール送信）
- Node 24 / pnpm（monorepo workspace）

## Setup

```bash
pnpm install
cp .env.example .env   # 値を設定
pnpm dev
```

> ビルドは実データ前提（fail-fast）。Supabase 公開値が未設定、または root の `config.<env>.json` が
> 読めない場合はフォールバックせず停止する（生成物は本番相当）。

## Scripts

| script           | 内容                                            |
| ---------------- | --------------------------------------------- |
| `pnpm dev`       | 開発サーバー                                       |
| `pnpm build`     | 本番ビルド（`dist/`）                                |
| `pnpm preview`   | ビルド結果のプレビュー                                  |
| `pnpm check`     | astro check（型チェック）                            |

## 型とスキーマ

core スキーマの生成型は workspace パッケージ `@niqostudio/db-types`（正本）。
`src/types/database.ts` はそれを読み込み、画面で使う別名・サブ型に集約する薄い層。
型の再生成は core 側で `pnpm --filter @niqostudio/core run db:types`（スキーマ変更時・local スキーマから）。

## 環境変数

配置（公開/秘密・置き場）の正本は [docs/variables.md](../docs/variables.md)。**canonical ドメインは root の `config.<env>.json`**（infra と共有する committed の単一正本）を `astro.config` が直読する（`DEPLOY_ENV` で選択・既定 production）。env 変数では渡さない。

dev の `.env`（`.env.example` 参照）に置くのは Supabase 公開値のみ：

| 変数                                  | 用途                              |
| ----------------------------------- | ------------------------------- |
| `PUBLIC_SUPABASE_URL`               | データ取得 / 問い合わせ INSERT（`https://<ref>.supabase.co`） |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY`   | 同上（公開されてよい publishable key・`sb_publishable_`） |

問い合わせ系の秘密（`RESEND_API_KEY` / `TURNSTILE_SECRET_KEY` / `SUPABASE_INQUIRY_WRITER_JWT` / `SUPABASE_INQUIRY_READER_JWT` / `RESEND_WEBHOOK_SECRET`・site key）は dev の `.env` に置かず、本番は **wrangler secret**、CI は **Environment** で注入する（未設定なら送信・検証は skip）。メールの送信元・宛先アドレスは秘密でなく config.json（`email.addresses`）由来。`service_role` / `sb_secret_` key は含めない（純フロントには不要）。

## License

MIT
