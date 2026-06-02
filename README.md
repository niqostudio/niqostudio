# NIQO STUDIO

屋号 NIQO STUDIO のシステム monorepo。公開サイト・データ層・インフラを1リポで管理する。

## モジュール

| パス | 役割 | スタック |
| --- | --- | --- |
| [website/](website/) | 公開サイト | Astro + Cloudflare |
| [core/](core/) | データ層（Supabase スキーマ / RLS / Functions） | Supabase / SQL |
| [infra/](infra/) | プラットフォーム（DNS / メール / Pages / Terraform state） | Terraform / Cloudflare |
| [packages/db-types/](packages/db-types/) | core スキーマの生成型 | TypeScript |

- 公開定数の正本: root の [config.\<env\>.json](config.production.json)（ドメイン等・env ごとに1ファイル・committed）。infra と website が直読する。
- ドキュメント: [docs/](docs/)（mkdocs で公開）。
- 規約: [.claude/rules/](.claude/rules/)（コーディング / コミット）。

プロダクトはここに置かない（別リポ / private）。
