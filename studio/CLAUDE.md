# CLAUDE.md — studio

NIQO STUDIO の運用バックオフィス（業務システム）。core を編集する面（**website は読む／studio は書く**）。

## スタック

- Next.js（App Router）+ React + TypeScript + Tailwind v4（トークンと UI パーツのスキンは `@niqostudio/ui` を共有）。
- core(Supabase) の `core` スキーマへ service_role で接続する adapter を持つ（`db.schema='core'`）。自前 store は `studio` スキーマ。

## 構造（依存方向＝疎結合の要）

NIQO 単一の業務システム。汎用核（schema 駆動の record CRUD）に features を載せ、composition root で配線する。

```
app（薄いルート）→ features → shared / domain ← adapters
                       ↑
                composition（配線：binding・instance・adapter 組立）
```

- **domain**：canonical model＋ports（interface）。外部 import 禁止（Supabase/vendor を知らない）。
- **shared**：横断核。`records`（ports/schema/overlay＝**構造×意味**）・`ui`（`@niqostudio/ui` スキン）・`i18n`・`utils`。
- **adapters**：ports の実装。`supabase`＝core（`db.schema='core'`・service_role・`server-only`・introspection は `Accept-Profile: core`）／`studio-store`＝自前 store（`studio` スキーマ：下書き/版/overlay/実行/抽出）。
- **features**：機能単位（`collections` / `schema-config` / `terminal` / `git-import` / `feedback` …）。domain・shared を参照。
- **composition**：composition root。collection binding（structure × overlay × store × workflow × references）・instance を組み立てる。

設計の核：**構造は core から live introspection、意味は overlay（studio が被せる）**。CRUD 編集（`/<col>/<id>/edit`）と詳細・ワークフロー（一覧の右ペイン＝master-detail）を分離する。

## このモジュールの規約

- スタイル値をハードコードしない（`@theme` のセマンティックユーティリティ：`text-muted` / `border-border` / `bg-surface` / `text-accent` …）。
- 秘密鍵はサーバ専用（`server-only`）。クライアントに出さない。

## 開発

- `pnpm --filter @niqostudio/studio dev` / `build` / `typecheck`。
- 実データ表示は core 起動＋`studio/.env.local`（`SUPABASE_URL` / `SUPABASE_SECRET_KEY` ＝ `db:status`）。
- 型は core 側で生成（`@niqostudio/db-types` を参照）。

## 共通規約

- コーディング [../.claude/rules/conventions.md](../.claude/rules/conventions.md) / コミット [../.claude/rules/commit.md](../.claude/rules/commit.md)。
