# Coding Conventions（共通）

モノリポ全体の共通規約。**各モジュール固有の規約**（DB/RLS・Astro/射影・Terraform 等）は
各モジュールの `CLAUDE.md` に書く。

## コメント

- コメントは薄く保つ。追従コストが高いので「何をしているか」は書かない。
- 構造と命名で語る。意図が読み取れない命名・分割は、コメントを足す前に直す。
- 書いてよいのは自明でない「なぜ」だけ（非自明なトレードオフ・回避策の理由）。
- コメントは日本語で書く。
- スケジュール（時期・順序・「いつまでに」）は書かない（変わるため）。
- 未確定の候補値・選択肢・説明用の例示は書かない。確定した事実のみを書く。
- docs 化していない実装方針の符牒（特定の会話・作業の文脈でしか通じない呼称や採番）を書かない。コメントの読者は docs とコードしか持たず通じないため、機構そのものを意味で説明する。

## public リポ衛生

- 全リポ public 前提。**シークレットの値は追跡ファイルに置かない**（`.env` / `*.tfvars` / state は gitignore、CI Secret / Environment で注入）。
- 実顧客データをコミットしない（seed・サンプルに実データを入れない）。本番データは各サービスのコンソールから投入。
- 公開定数は root の [`config.<env>.json`](../../config.production.json)（env ごとに1ファイル・committed）に集約（ドメイン等）。infra（Terraform）と website が直読する。

## ツール / 型

- パッケージマネージャは pnpm。
- DB の型は `supabase gen types` で生成する（手書きしない）。生成先は [`packages/db-types`](../../packages/db-types/)。

## コミット

- [commit.md](commit.md) を参照（Conventional Commits / 日本語 / AI 署名なし / 秘密値コミット禁止）。
