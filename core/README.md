# core

NIQO STUDIO の**データ層**モジュール（PostgreSQL 17）。スキーマ・RLS・migration の正本。
migration の適用は dbmate、ローカルスタックと型生成は infra の Supabase が担う（core は supabase に依存しない）。

> モノリポの一部。詳細・固有規約は [CLAUDE.md](CLAUDE.md)、運用は [docs/database.md](../docs/database.md)、
> スキーマは [docs/core/schema.md](../docs/core/schema.md)、設計判断は [docs/adr/](../docs/adr/)。

## 技術スタック
- PostgreSQL 17 / SQL / dbmate（migration）。ローカルスタックと本番プロジェクトは infra の Supabase。

## 前提
- Node.js 24（root `.nvmrc` 準拠）/ Docker Desktop（ローカルスタック用）

## セットアップ
DB ライフサイクル（`db:*`）は **root から**実行する（DB は core / studio 両スキーマを含み、root が両方を面倒見る）。
```bash
pnpm install
pnpm db:start             # ローカルスタック起動（root → infra の supabase）
pnpm db:reset             # クリーンスタック → dbmate up（core / studio）→ seed
```

> クラウド link（`functions deploy` 等のリモート操作）は infra 文脈で実行する：
> `pnpm --filter @niqostudio/infra run login` / `… run link`。

## ワークフロー（スキーマ変更）
1. `core/migrations/` に dbmate 形式の SQL（先頭 `-- migrate:up`）を追加。
2. ローカル検証: `pnpm db:reset`（root）。
3. 本番反映: CI の `db: migrate`（dbmate up・[docs/database.md](../docs/database.md)）。
4. 型再生成: `pnpm db:start` → `pnpm db:types`（root・local スキーマから生成）→ consumer（website 等）が `@niqostudio/db-types` を参照。

## 本番データ
- Supabase Studio から投入する（リポに実顧客データを置かない）。詳細は [docs/database.md](../docs/database.md)。

## ライセンス
MIT（root [LICENSE](../LICENSE)）
