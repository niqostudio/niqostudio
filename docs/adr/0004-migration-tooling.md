# ADR 0004: migration ツールに dbmate を採用し supabase を infra に集約する

## ステータス

採用（2026-06）

## 背景

core のスキーマ migration は supabase CLI で管理していた（`supabase db reset` / `db push`）。これは core が supabase CLI に依存することを意味する。supabase の利用（プロジェクト・ローカルスタック・設定）はプラットフォーム＝infra の関心であり、core の関心はスキーマそのものに限定したい。あわせて、1つの Supabase データベース上で `core` スキーマと `studio` スキーマの migration を**名前空間（スキーマ）単位で独立に**管理したい。

## 決定

migration の適用ツールに **dbmate**（npm `dbmate`）を採用する。supabase CLI とローカルスタック（`config.toml`）は infra へ移し、infra を npm パッケージ（`@niqostudio/infra`）化する。core は migration（SQL）のみを持つ。

per-namespace は dbmate の追跡テーブル名指定で実現する：

- `core/migrations` → `public.core_migrations`
- `studio/migrations` → `public.studio_migrations`

`db:reset` は「supabase クリーンスタック → `dbmate up`（core / studio）→ seed」のオーケストレータ（`scripts/db-reset.mjs`）に再構成する。型生成とローカルスタック操作は infra の supabase CLI 経由。

## なぜ dbmate か

- **追跡テーブル名が設定可能**。1スキーマ（public）内に別名の台帳を並べられるため、core/studio を別ディレクトリ・別台帳で独立管理できる（履歴の混線がない）。台帳が public にあるため、core の生成型（`gen types --schema core`）を汚さない。
- **clean DB チェックが無い**。supabase が用意した既存スキーマ（auth/storage 等）がある DB に対してもそのまま適用できる。
- **plain SQL をそのまま実行**。views / triggers / functions / RLS / grants を含む migration を忠実に適用できる（`pnpm db:reset` で現行スキーマとの構造 diff=0 を確認済み）。
- **npm（pure JS・Windows 対応）**。lockfile で再現可能・クロスプラットフォーム・バイナリ導入が不要。

### 検討した代替

- **supabase CLI（現状維持）**：core が supabase CLI に依存し続ける。剥がす目的に合わない。
- **Atlas**：Community Edition の宣言（schema-as-code）エンジンは views / triggers / functions / RLS / policies / grants をモデル化しない（実機・公式で確認）。これらを扱うには標準バイナリ＋`atlas login` が必要。versioned mode は適用自体は可能だが、revisions テーブル名が固定のため、1 DB に複数ディレクトリを当てる per-namespace 構成で `--allow-dirty` や台帳スキーマの分離（スキーマ作成との順序依存）を要した。npm wrapper は Windows 非対応だった。

## 適用済み migration の改竄検知

dbmate はバージョン番号のみを記録し、内容ハッシュを持たない。適用済み migration の改竄は「マージ済み migration ファイルが PR で変更されていないか」を検査する CI ゲートと、既存の db-types ドリフト検知で担保する（ツールに依存しない）。

## 結果

- core から supabase 文脈が消え、supabase は infra の責任範囲に集約された。
- 散在していた migration は単一の baseline に統合され、現行スキーマを忠実に再現する（構造 diff=0）。
- 台帳は `public.core_migrations` / `public.studio_migrations`。state machine の参照データは baseline に明示する（schema-only dump 非収録のため）。
