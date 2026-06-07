# NIQO STUDIO

屋号 NIQO STUDIO のシステム monorepo。NIQO STUDIO 自身の**公開サイト・データ層・業務システム・インフラ**を1リポで管理する。

全リポジトリ public。**シークレット（`.env` / `*.tfvars` / state / 各種キー）はコミットしない**（CI は GitHub Environments で注入）。実顧客データはリポジトリに置かない。プロダクトはここに置かない（別リポ / private）。

## モジュール

| パス | 役割 | スタック |
| --- | --- | --- |
| [website/](website/) | 公開サイト（core を読むビュー） | Astro 6 + Cloudflare |
| [studio/](studio/) | 業務システム（core に書く運用バックオフィス） | Next.js 16 + Supabase |
| [core/](core/) | データ層（スキーマ / RLS / Functions） | Supabase / SQL |
| [infra/](infra/) | プラットフォーム（DNS / メール / Pages / state） | Terraform + Cloudflare |
| [packages/db-types/](packages/db-types/) | core スキーマの生成型（横断共有） | TypeScript |
| [packages/ui/](packages/ui/) | デザイントークン＋UI パーツのスキン（横断共有） | CSS / Tailwind v4 |

各モジュールの詳細・固有規約はそのディレクトリの `CLAUDE.md` を参照。

## アーキテクチャ

- **core が事業データの正本**。`website` はそれを読み（公開サイト）、`studio` はそれを書く（業務システム）。読みと書きを別アプリに分ける。
- **公開定数の正本は root の `config.<env>.json`**（ドメイン等・env ごとに1ファイル・committed）。`infra`（Terraform）と `website` が直読する。
- **型は core から生成**（`supabase gen types` → `packages/db-types`）。`website` / `studio` はこれを参照し、手書きしない。
- **デザインの正本は `packages/ui`**（warm 単一トークン＋ボタン/カード等のスキン）。`website`（Astro）と `studio`（Next.js）が同じ CSS を共有し、各フレームワークは薄いラッパーだけを持つ。

```
config.<env>.json ──直読──► infra / website

website ──read──► core（Supabase＝正本）◄──write── studio
                       │ gen types
                       ▼
                  packages/db-types ──► website / studio

packages/ui（warm tokens ＋ UI skin）──► website / studio
```

## 開発

- パッケージマネージャは **pnpm**（workspace）。
- モジュール別のコマンド・前提は各ディレクトリの `CLAUDE.md` を参照。
- ドキュメントは [docs/](docs/)（mkdocs で公開）。

## 規約

- コーディング: [.claude/rules/conventions.md](.claude/rules/conventions.md)
- コミット: [.claude/rules/commit.md](.claude/rules/commit.md)（Conventional Commits / 日本語）

## ライセンス

- リポジトリ全体は **MIT**（[LICENSE](LICENSE)）。
- ただし [`studio/`](studio/) のみ **BUSL-1.1**（[studio/LICENSE](studio/LICENSE)）。
