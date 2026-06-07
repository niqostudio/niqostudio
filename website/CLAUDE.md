# CLAUDE.md — website

NIQO STUDIO の公開サイト。core データ層を「ビュー」として見せる Astro フロントエンド。

## スタック

- Astro 6（SSG）+ `@astrojs/cloudflare`（`/api/contact` のみ on-demand）
- Tailwind CSS 4（`@theme` のデザイントークン経由でスタイル）
- Supabase（publishable key は読み取り専用 / 生成型は workspace パッケージ `@niqostudio/db-types` を参照）

## アーキテクチャ（core → website 射影層）

ページ・コンポーネントは `content.ts` と `views.ts` のみに依存する（core の行型を直接 import しない）。

- `src/types/database.ts` … `@niqostudio/db-types`（core 生成型）を読み込む内部表現の集約層
- `src/lib/core.ts` … データアクセス。**fallback / モックは持たない**（接続不可・取得失敗・profile 欠落は throw してビルドを止める）
- `src/lib/projection.ts` … core 行 → ビューモデルへの純変換
- `src/lib/content.ts` … 画面向けファサード
- `src/types/views.ts` … ビューモデル型（website のドメイン語彙）

## このモジュールの規約

- **スタイル値をハードコードしない**。色・境界・タイポは `src/styles/global.css` の `@theme` に定義し、生成されるセマンティックユーティリティ（`text-muted`, `border-border`, `bg-fg` 等）経由で使う。生の値（`#fff`, `black/10`, `red-600` 等）をクラスに直書きしない。
- core の構造をそのまま画面に出さない。**射影層を必ず挟む**（上記）。`database.ts` / core の行型をページ・コンポーネントから直接 import しない。

## 開発

- `pnpm dev` / `pnpm build`（prebuild で OG 画像・favicon を生成）/ `pnpm check`
- 型の再生成は root の `pnpm db:types`（core の local スキーマから生成）。website は生成しない。
- **ビルドは実データ前提（fail-fast）**：Supabase 公開値（`.env`）が未設定、または root の `config.<env>.json`（canonical ドメイン）が読めなければ停止する。生成物は本番相当（モック・placeholder を出さない）。

## 共通規約

- コーディング [../.claude/rules/conventions.md](../.claude/rules/conventions.md) / コミット [../.claude/rules/commit.md](../.claude/rules/commit.md)。
