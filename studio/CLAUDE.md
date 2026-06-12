# CLAUDE.md — studio

NIQO STUDIO の業務コックピット。**既存システムに被せる、storage / ドメイン非依存の管理画面**（studio 自身はドメインを持たない）。
業務データは接続先システムに在り、studio は adapter で接続して編集面を被せる。NIQO の最初の接続先は core（**website は読む／studio は書く**）。

## スタック

- Next.js（App Router）+ React + TypeScript + Tailwind v4（トークン/スキンは `@niqostudio/ui` 共有）。
- 認証は `@supabase/ssr`（anon＋cookie・operator ログイン）。接続先データは adapter 経由（NIQO は core スキーマへ service_role）。studio 自身の作業データは `studio` スキーマ。一覧は TanStack Table。

## 構造（依存方向＝疎結合の要）

汎用核（schema 駆動の record CRUD）に features を載せ、composition で「どのシステムを接続するか」を配線する。
**studio 本体に業務ドメイン知識を持たない**（接続先固有のものは composition＝インスタンス設定へ）。`domain/` レイヤは置かない。

```
app（薄いルート）→ shell / features → shared ← adapters → ports（契約）
                                ↑
        composition（配線＋インスタンス設定：接続先・collection 別 semantics/projection）
```

- **ports**：契約（interface）の独立層（domain には置かない）。`session`（operator）／`domain-store`（接続先システムのドメインデータ）／`studio-store`（studio 自身の作業データ）。行モデル `CollectionRecord` は `shared/model/record`（契約が運ぶ型。ports は interface のみ）。
- **adapters**：ports の実装＝コネクタ。`adapters/<port>/<tech>`（port＝capability 単位・細分化しすぎない）。今は全て supabase：
  - `session/supabase`（@supabase/ssr）／`domain-store/supabase`（core スキーマ・service_role・`server-only`・introspection は `Accept-Profile: core`）／`studio-store/supabase`（`studio` スキーマ：下書き/版/overlay/実行/抽出）。
  - port は**論理1本**。接続先が複数ソースに散っても adapter が束ねて1つに見せる。
- **shared**：横断核。`model`（`record`＝汎用行モデル）・`ui`（@niqostudio/ui スキン）・`i18n`・`utils`。
- **features**：汎用機能。**`domain-overlay`＝中核（構造×意味→実効スキーマ：buildSchema ＋ schema 記述子）** ／ `collections`（CollectionBinding ＋ 汎用 CRUD UI）／ `schema-config`（意味の編集）／ `terminal` / `git-import` / `feedback`。
- **composition**：配線＋**インスタンス設定**。collection binding（structure × overlay × store × workflow × references）・instance・接続先固有の `semantics` / `projection`。

設計の核：**構造は接続先から live introspection、意味は overlay（studio が被せる）**。CRUD 編集（`/<col>/<id>/edit`）と詳細・ワークフロー（master-detail）を分離。**publish＝studio-store(下書き) → domain-store(正本) への反映**。

## このモジュールの規約

- **studio は接続先データの保存場所/ドメインを関知しない**。業務データへの経路は `domain-store` ポートのみ（Supabase 固有は adapter 内に封じる）。接続先固有の設定は composition に置く。
- 契約は `ports/`、実装は `adapters/<port>/<tech>/`。port は capability 単位（細分化しすぎない）。
- スタイル値をハードコードしない（`@theme` のセマンティックユーティリティ：`text-muted` / `border-border` / `bg-surface` / `text-accent` …）。
- 秘密鍵はサーバ専用（`server-only`）。クライアントに出さない。

## 開発

- `pnpm --filter @niqostudio/studio dev` / `build` / `typecheck`。
- `studio/.env.local`：接続先＝`SUPABASE_URL` / `SUPABASE_SECRET_KEY`（service_role・`db:status`）。認証＝`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `STUDIO_ALLOWED_EMAILS`。
- **本番接続**は同じキーで `studio/.env.production` を作り、dotenv-cli で明示読み込みする（Next 単体の env 読みは `.env.local` が `.env.production` に勝つため、dev/build/start とも明示指定）。確認だけなら `dev:prod`、実運用は `build:prod` → `start:prod`（本番ビルド＝dev ウィジェット無し）。リモート接続時は shell に警告バナーが出る（判定＝`SUPABASE_URL` がローカル以外）。
- 型は root `pnpm db:types`（infra の local スキーマから）で生成（`@niqostudio/db-types` を参照）。

## 共通規約

- コーディング [../.claude/rules/conventions.md](../.claude/rules/conventions.md) / コミット [../.claude/rules/commit.md](../.claude/rules/commit.md)。
