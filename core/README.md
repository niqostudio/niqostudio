# core

NIQO STUDIO の**データ層**モジュール（Supabase / PostgreSQL 17）。スキーマ・RLS・マイグレーションの正本。

> モノリポの一部。詳細・固有規約は [CLAUDE.md](CLAUDE.md)、運用は [docs/core/operations.md](../docs/core/operations.md)、
> スキーマは [docs/core/schema.md](../docs/core/schema.md)。

## 技術スタック
- Supabase（PostgreSQL 17）/ リージョン: Northeast Asia (Tokyo)

## 前提
- Node.js 24（root `.nvmrc` 準拠）/ Docker Desktop（ローカル開発）/ Supabase アカウント

## セットアップ
```bash
pnpm install
pnpm run login            # Supabase ログイン（pnpm 組込と衝突するため run 必須）
pnpm run link             # クラウドプロジェクトに link（project-ref を入力）
pnpm run db:start         # ローカル Supabase 起動
pnpm run db:reset         # マイグレーション + dev シード適用
```

> `login` / `link` は pnpm 組込コマンドと衝突するため、必ず `pnpm run login` / `pnpm run link` で実行する。

## ワークフロー（スキーマ変更）
1. `supabase/migrations/` に新しい SQL ファイルを追加。
2. ローカル検証: `pnpm run db:reset`。
3. 本番反映: CI の `db push`（[operations.md](../docs/core/operations.md)）。
4. 型再生成: `pnpm run db:start` → `pnpm run db:types`（local スキーマから生成）→ consumer（website 等）が `@niqostudio/db-types` を参照。

## 本番データ
- Supabase Studio から投入する（リポに実顧客データを置かない）。詳細は [operations.md](../docs/core/operations.md)。

## ライセンス
MIT（root [LICENSE](../LICENSE)）
