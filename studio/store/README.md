# studio store

studio 自前 store（下書き・由来・運用状態）の DDL とシード。**core（`public`）とは別系統**で、`studio` スキーマに置く。
当面は core と同一 Supabase の `studio` スキーマに同居するが、別 Supabase プロジェクトへそのまま移送できる形にしている。

- アクセスは service_role 専用（RLS バイパス）。接続は `STUDIO_STORE_URL` / `STUDIO_STORE_SECRET_KEY`、未指定なら `SUPABASE_*` に同居。
- この `studio` スキーマは core migration とは別系統。**root の `pnpm db:reset` が core 再適用に続けて自動で `db:migrate`（studio）を流す**（DB は両スキーマを含むため）。単体で作り直すなら下記 `db:migrate`。
- supabase-js（PostgREST）経由で `studio` スキーマを読むには Data API に公開が要る（`core/supabase/config.toml` の `[api] schemas` に `studio`）。

## migration ↔ owner ↔ table

中央集約のまま、ファイル名に owner を入れて対応を明示する（`<seq>_<owner>_<table>.sql`）。

| migration | owner | table | 使う feature |
| --- | --- | --- | --- |
| `0001_records_base.sql` | records 基盤 | `studio.records`（＋`set_updated_at`） | collections（下書き）/ schema-config（overlay が相乗り） |
| `0002_records_versions.sql` | records 基盤 | `studio.record_versions` | collections（版履歴＝CRUD 編集の history） |
| `0003_terminal_command_runs.sql` | terminal | `studio.command_runs` | terminal（daemon 実行ログ） |
| `0004_git_import_extractions.sql` | git-import | `studio.extractions` | git-import（取り込み中間表現のストック） |

`records` は単一 feature の持ち物ではなく、collections と schema-config が相乗りする**共有基盤**。

## 適用

`migrations/` / `seeds/` を名前順に流す（冪等＝`create … if not exists` / `on conflict`）。`run.mjs` は直 PG 接続を使う
（DDL は PostgREST 越しに流せない）。接続は `STUDIO_STORE_DB_URL`（無ければ `DATABASE_URL`、既定はローカル supabase）。

```sh
pnpm --filter @niqostudio/studio db:migrate   # studio スキーマを作る／更新する
pnpm --filter @niqostudio/studio db:seed       # 妥当な overlay と下書きのダミーを投入
```

どちらも最後に PostgREST へ `notify pgrst, 'reload schema'` を送る。反映されない場合は REST コンテナ（または supabase）を再起動する。
