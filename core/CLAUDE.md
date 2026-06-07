# CLAUDE.md — core

NIQO STUDIO のデータ層（PostgreSQL 17）。スキーマ・RLS・migration の正本。
migration の適用は **dbmate**、ローカルスタックと型生成は **infra の supabase** が担う（core は supabase に依存しない）。
他モジュール（website 等）はこの DB を読む。型は [packages/db-types](../packages/db-types/) に生成する。

## コマンド（pnpm）

- ローカル（要 Docker）: root から `pnpm db:start` → `pnpm db:reset`（DB は core / studio 両スキーマを含み、reset が両方を作り直す）。
- 本番反映は CI（`.github/workflows/`）。手順は [docs/database.md](../docs/database.md)。

## スキーマ / マイグレーション

- 正本は `core/migrations/`（dbmate・適用は `public.core_migrations` で追跡）。**DDL は migration 経由のみ**（Studio で直接変更しない・適用済みは編集しない）。検証は root の `pnpm db:reset`。
- 構造: [docs/core/schema.md](../docs/core/schema.md)。設計判断: [docs/adr/](../docs/adr/)。

## このモジュールの規約（DB / RLS）

- 命名は snake_case、テーブルは複数形。各テーブルに `id uuid` PK（`gen_random_uuid`）、`created_at` / `updated_at`（timestamptz, NOT NULL, now()）＋ `set_updated_at` トリガ。
- `status` は text + CHECK（enum は使わない）。多値は text[]、構造体は jsonb。jsonb の形・配列の許可値は SQL コメントでなく [docs/core/schema.md](../docs/core/schema.md) に書く。
- DDL は必ずタイムスタンプ付き migration 経由。適用済み migration は編集しない。
- 全テーブルで RLS 有効（ポリシー無し＝deny-all を既定に）。公開読み取りは anon SELECT ＋ status / active フィルタ。
- 機密列は列単位 GRANT で遮断（anon に `real_name` / `internal_notes` を出さない）。内部専用テーブルは anon に REVOKE ALL。
- 管理は service_role（RLS バイパス）。authenticated ポリシーは作らず、公開サインアップは無効のまま。顧客の公開識別子は `public_name` のみ。

## 共通規約

- コーディング [../.claude/rules/conventions.md](../.claude/rules/conventions.md) / コミット [../.claude/rules/commit.md](../.claude/rules/commit.md)。
