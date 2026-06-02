# @niqostudio/db-types

core（Supabase）スキーマの生成型（**フルスキーマ**）。consumer（website / 将来の admin 等）が import する単一の正本。pnpm workspace で `@niqostudio/db-types` として参照する。**このパッケージは生成物を保持するだけ**（ビルド不要・TS ソースを直接 export）。

- **生成は core が行う**（schema＝migrations を持つ側）。core の local Supabase から型を作り、ここに書き出す：
  `cd core && pnpm db:start`（migrations 適用）→ `pnpm --filter @niqostudio/core run db:types`。
- 型の正本は **migrations**。`supabase gen types --local` で local スキーマを introspection するため、live プロジェクトや PAT は不要。CI（`db-types` workflow）が migrations と `src/database.ts` のドリフトを検知する。
- RLS / 列 GRANT は型に反映されない（型はフル）。公開面の絞り込みは各 consumer の射影層と実行時 RLS が担う。
