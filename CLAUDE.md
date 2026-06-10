# CLAUDE.md

NIQO STUDIO のシステム monorepo。屋号 NIQO STUDIO 自身の公開サイト・データ層・業務システム・インフラを1つのリポジトリで管理する。
**プロダクトはここに置かない**（別リポ / private）。

## モジュール

| パス | 役割 | スタック |
| --- | --- | --- |
| [website/](website/) | 公開サイト | Astro + Cloudflare |
| [studio/](studio/) | 業務システム（運用バックオフィス） | Next.js + Supabase |
| [core/](core/) | データ層（スキーマ / RLS / migration） | PostgreSQL / SQL / dbmate |
| [infra/](infra/) | プラットフォーム（Supabase / DNS / メール / Pages / state） | Supabase / Terraform / Cloudflare |
| [packages/db-types/](packages/db-types/) | core スキーマの生成型（横断共有） | TypeScript |
| [packages/ui/](packages/ui/) | デザイントークン＋UI パーツのスキン（横断共有） | CSS / Tailwind v4 |

各モジュールの詳細・固有規約はそのディレクトリの `CLAUDE.md` を参照。

## 共通

- 公開定数の正本は root の [config.\<env\>.json](config.production.json)（ドメイン等・env ごとに1ファイル・committed）。infra（Terraform）と website が直読する。
- ドキュメントは [docs/](docs/)（mkdocs で公開）。
- 規約: コーディング [.claude/rules/conventions.md](.claude/rules/conventions.md) / コミット [.claude/rules/commit.md](.claude/rules/commit.md)。

## データ / 秘密情報

- 全リポ public。**`.env` / `*.tfvars` / state / 各種キーをコミットしない**。CI は GitHub **Environments** でスコープして注入する。
- 本番データは各コンソール（Supabase Studio 等）から投入。リポに実顧客データを置かない。

## CI

- `.github/workflows/` は **paths でモジュール別に出し分け**（website / core / infra / docs）。
- 本番反映（migration apply / terraform apply / deploy）は承認ゲート付き Environment で実行する。
