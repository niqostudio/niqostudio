# Seeds

開発用ダミーデータのみを管理する。本番データ（services / profile / 実顧客）は seed に置かず、Supabase Studio から手動入力する。

## ルール

- `dev.sql`：完全フィクションのダミー（実顧客名・本番データ禁止）

## 使い方

- 開発用ダミー投入：`pnpm --filter @niqostudio/core run db:seed`（通常は root `pnpm db:reset` 時に自動投入されるため不要）
