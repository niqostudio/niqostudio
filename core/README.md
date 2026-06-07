# core

NIQO STUDIO の**データ層**モジュール（Supabase / PostgreSQL 17）。スキーマ・RLS・マイグレーションの正本。

> モノリポの一部。詳細・固有規約は [CLAUDE.md](CLAUDE.md)、運用は [docs/core/operations.md](../docs/core/operations.md)、
> スキーマは [docs/core/schema.md](../docs/core/schema.md)。

## 技術スタック
- Supabase（PostgreSQL 17）/ リージョン: Northeast Asia (Tokyo)

## 前提
- Node.js 24（root `.nvmrc` 準拠）/ Docker Desktop（ローカル開発）/ Supabase アカウント

## セットアップ
DB ライフサイクル（`db:*`）は **root から**実行する（DB は core / studio 両スキーマを含み、root が両方を面倒見る）。
```bash
pnpm install
pnpm db:start             # ローカル Supabase 起動（root）
pnpm db:reset             # 全スキーマ再適用（core migration + dev シード → studio スキーマ再作成）
```

> クラウド link 系は core 文脈で実行する（pnpm 組込と衝突するため run 必須）：
> `pnpm --filter @niqostudio/core run login` / `… run link`。

## ワークフロー（スキーマ変更）
1. `supabase/migrations/` に新しい SQL ファイルを追加。
2. ローカル検証: `pnpm db:reset`（root）。
3. 本番反映: CI の `db push`（[operations.md](../docs/core/operations.md)）。
4. 型再生成: `pnpm db:start` → `pnpm db:types`（root・local スキーマから生成）→ consumer（website 等）が `@niqostudio/db-types` を参照。

## 本番データ
- Supabase Studio から投入する（リポに実顧客データを置かない）。詳細は [operations.md](../docs/core/operations.md)。

## ライセンス
MIT（root [LICENSE](../LICENSE)）
