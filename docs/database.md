# 運用

NIQO STUDIO core（Supabase IaC）の運用手順。

## 前提

- Node 24（root `.nvmrc` 準拠）/ pnpm / Docker Desktop / Supabase アカウント。
- セットアップは core の `README.md` を参照。

## ローカル開発

DB ライフサイクルは**リポジトリ root から**実行する（root が core / studio に委譲）。

| 操作 | コマンド（root） |
|---|---|
| ローカル Supabase 起動 | `pnpm db:start` |
| 全マイグレーション再適用（リセット） | `pnpm db:reset` |
| 状態・接続情報の表示（ローカル専用キー） | `pnpm db:status` |
| 停止 | `pnpm db:stop` |
| 型再生成（local スキーマから） | `pnpm db:types` |

`db:reset` は「supabase クリーンスタック → `dbmate up`（core / studio）→ seed」を一手で行う（[`scripts/db-reset.mjs`](../../scripts/db-reset.mjs)）。migration の適用は **dbmate**（`core/migrations`→`public.core_migrations`、`studio/migrations`→`public.studio_migrations` で追跡）。supabase はローカルスタックと型生成のみ（infra 管轄）。ツール選定は [docs/adr/0001](../adr/0004-migration-tooling.md)。

## マイグレーション

スキーマ変更は必ずマイグレーション経由。**Studio で直接 DDL を変更しない**（ファイルと実体が乖離する）。

### 手順

1. `core/migrations/` に `YYYYMMDDHHMMSS_説明.sql` を追加（dbmate 形式・先頭に `-- migrate:up`・down は空可）。
2. ローカル検証：`pnpm db:reset`（root・エラーなく適用されるか）。
3. 本番反映：`dbmate up`（後述）。
4. consumer（website 等）で型再生成（後述）。

### 原則

- **適用済みマイグレーションは編集しない**。変更は新しい前方向マイグレーションで行う（編集すると本番の適用履歴とズレる）。
- マイグレーションには**本番データを書かない**（DDL のみ）。データは Studio で投入（後述）。
- Postgres は DDL もトランザクション対応。1ファイルに DDL＋データ変換をまとめれば原子的に適用される（`CREATE INDEX CONCURRENTLY` 等の例外を除く）。

### 既存データの整形（データ移行）

- rename / NULL 許容カラム追加 / 型の拡大 → データは自動保持。
- 型変換 → `ALTER COLUMN ... TYPE ... USING <式>`。
- 構造変換 → 新カラム追加 →`UPDATE` で詰め替え → 旧カラム削除。
- 本番にデータがある場合、変換は既存行に対して走る。大きなテーブルはロック・所要時間に注意。

### 列順を整えたい / 大きな再構築

`ALTER ADD COLUMN` は末尾追加で、Postgres に列の並べ替えコマンドは無い。整えるならテーブルを**再作成**する（`DROP`→`CREATE`→index / trigger / RLS を再宣言）。**inbound FK が無く、データが空または再現可能なテーブルに限り安全**（services・cases で実施）。

## 本番への適用（dbmate up）

本番 DB への反映は **CI（GitHub Actions の `db: migrate` ワークフロー）** で行う。

- 実適用ジョブは **Environment `core-production`（承認ゲート付き）** で実行する（infra apply と対称）。接続は同 Environment の Secret **`DATABASE_URL`**。**CI は IPv4 のみ**なので **Session pooler** の接続文字列を使う（直結 `db.<ref>.supabase.co` は IPv6 で CI からは不達）。
- 適用：`DATABASE_URL=<session pooler> pnpm exec dbmate --migrations-dir core/migrations --migrations-table core_migrations up`（未適用の前進 migration のみ・`public.core_migrations` で追跡）。
- **baseline 採用（初回のみ）**：本番には既にスキーマがある。baseline を再実行せず「適用済み」として記録する（`insert into public.core_migrations(version) values ('<baseline version>')`）→ 以降は新しい前進 migration だけが流れる。baseline は現行スキーマ忠実なので drift しない。

### リモート link（db:pull / functions deploy 用）

`db:pull` や `functions:deploy` などリモートを直接触る操作は `supabase link --project-ref <ref>` で紐づける（`<ref>` は公開＝`PUBLIC_SUPABASE_URL` の `https://<ref>.supabase.co` 部分・dashboard でも確認可）。link 情報は gitignore の `supabase/.temp/` に保存され、`.env` には置かない。db push は `--db-url` 直指定なので link 不要。

## 本番データの投入（Studio）

- **本番データはリポジトリに置かず、Supabase Studio から投入**（SQL Editor で実行 or Table Editor）。
- `seeds/production-initial.sql`（gitignore）は Studio 投入用のローカル下書き。
- 実顧客データ（`clients.real_name` 等）は seed に絶対書かない。
- 開発用ダミーは `core/seeds/dev.sql`（完全フィクション）。`db:reset` オーケストレータが dbmate 適用後に投入する（`studio/seeds/dev.sql` も）。状態マスタ等のスキーマ参照データは seed でなく baseline に持つ。

## RLS の検証

スキーマ変更後は anon ロールで挙動を確認する。ローカルでトランザクション＋`ROLLBACK`：

1. テストデータを投入し `SET ROLE anon`。
2. 各テーブルの SELECT / INSERT 可否を確認。
3. `ROLLBACK`（データを残さない）。

期待挙動：`works`/`cases` は published、`services` は is_active のみ閲覧／`clients.real_name`・`internal_notes` は拒否／`projects` は不可視／`inquiries` は指定列 INSERT のみ・SELECT 不可。

## 型生成（packages/db-types）

- **local スキーマから生成**する：`pnpm db:start`（migrations 適用）→ `pnpm db:types`（root・`supabase gen types --local` を `packages/db-types/src/database.ts` に書き出し）。consumer（website 等）は workspace 依存 `@niqostudio/db-types` を参照する。
- 型の正本は **migrations**（live プロジェクトでなく local の適用結果を introspection）。**CI（`db: check` workflow の drift ジョブ）が migrations と生成型のドリフトを検知**し、guard ジョブが適用済み migration の改竄を拒否するので、スキーマ変更時は再生成してコミットする。

## keep-alive

- Free Tier の7日自動停止対策（`profile` への定期 ping）は **`.github/workflows/keep-alive.yml`**（infra 管轄）が担当（core モジュールでは管理しない）。
- 必要な変数（公開値の Variables）の命名・配置は [docs/variables.md](../variables.md) を正本とする。

## コミット

- Conventional Commits・日本語・AI 署名なし。詳細は `.claude/rules/commit.md`。

## バックアップ

- 必要時に `supabase db dump`（または `pg_dump`）でスキーマ／データを取得する。
