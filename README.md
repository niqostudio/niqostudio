# NIQO STUDIO

屋号 NIQO STUDIO のシステム monorepo。NIQO STUDIO 自身の**公開サイト・データ層・業務システム・インフラ**を1つのリポジトリで管理する。

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

## 開発フロー

単独開発者＋AI 支援の高速開発を前提にしている。そのため一般的な「機能ごとの短命ブランチ＋逐一の PR レビュー」は採らず、広めのトピックブランチ（`feat/*` 等）に直接コミットし、区切りで `main` に取り込む（履歴はほぼ線形）。public 履歴に細かい PR が見えないのは**意図的な選択**。

レビュー相手のいない単独開発では PR は儀式コストになりやすい。品質・安全は**ブランチ保護や PR ではなく、CI とデプロイゲートで担保する**：

- **push / PR ごとの CI**：型チェック・テスト・秘密値スキャン（gitleaks・履歴走査）・衛生チェック（絶対パス／秘密ファイルの誤追跡）をモジュール別に実行。
- **本番反映は承認ゲート付き**：migration / terraform apply / deploy は GitHub Environments のゲートを通す（誤反映を構造で止める）。
- **fail-closed**：秘密値や公開定数が欠けるとビルド／実行を止める。

## 規約

- コーディング: [.claude/rules/conventions.md](.claude/rules/conventions.md)
- コミット: [.claude/rules/commit.md](.claude/rules/commit.md)（Conventional Commits / 日本語）

## ライセンス

- リポジトリ全体は **MIT**（[LICENSE](LICENSE)）。
- ただし [`studio/`](studio/) のみ **BUSL-1.1**（[studio/LICENSE](studio/LICENSE)）。
