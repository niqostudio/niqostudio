# Supabase 手順（プロジェクト・鍵・JWT）

> Supabase コンソール / CLI での ✋ 手順（プロジェクト準備と資格情報の発行）。Supabase は core が使う
> プラットフォームのためここ（infra）に置く。日々の運用（マイグレーション・db push・型生成・RLS 検証）は
> [core 運用](../core/operations.md)、値の置き場は [変数の配置](../variables.md)、反映の順序は [デプロイ手順](../deploy.md)。

## プロジェクト / 接続
- プロジェクトを作成し、`PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_PUBLISHABLE_KEY`（公開鍵）を控える（配置は [変数の配置](../variables.md)）。
- 本番 `db push` 用の接続文字列は Database → Connection string → **Session pooler**（CI は IPv4 のみ）。`SUPABASE_DB_URL` に設定。詳細は [core 運用](../core/operations.md)。

## inquiry_writer JWT の発行（署名鍵・ES256）
`SUPABASE_INQUIRY_JWT` は `role: inquiry_writer` を名乗る自前 JWT。署名できるのは**自分で持つ秘密鍵**だけなので、Supabase 生成鍵ではなく**自前の鍵ペアを作って import** する（Supabase が生成した鍵の秘密鍵は取り出せない＝署名に使えない）。ロール本体（`inquiry_writer` と権限）は migration で作成済み（`core/supabase/migrations/`）。

**前提**：Docker 起動＋ローカルスタック（`pnpm -F @niqostudio/core exec supabase start`）。署名コマンドはローカル CLI / スタックを使う（本番接続は不要）。config.toml は**ローカル開発用の共有設定**で本番には効かない。

1. 鍵ペアを生成：
   ```sh
   pnpm -F @niqostudio/core exec supabase gen signing-key --algorithm ES256
   ```
   出力を `core/supabase/signing_keys.json` に保存（**gitignore 済み**・JSON 配列 `[ { ... } ]` 形式）。
2. **一時的に** `core/supabase/config.toml` の `# signing_keys_path = "./signing_keys.json"` を uncomment し、`supabase start`（起動済みなら再起動）で反映。**コミットしない**：鍵は gitignore のため committed にすると CI / 他クローンの `supabase start` が鍵不在で壊れる。
3. ダッシュボードへ import：Authentication → JWT Keys → **Create Standby Key →「Import an existing private key」を ON** → 秘密鍵を貼付 → **Rotate** で現行鍵へ昇格（本番がこの公開鍵で検証できるようにする）。
4. トークンを発行：
   ```sh
   pnpm -F @niqostudio/core exec supabase gen bearer-jwt --role inquiry_writer --valid-for 8760h
   ```
   出力を Secret `SUPABASE_INQUIRY_JWT`（`website-production`）に設定。`exp` は必須（無期限にしない）。
5. **後始末**：`git checkout core/supabase/config.toml` で signing_keys_path をコメントへ戻す（永続差分を残さない）。

これで `/api/contact` が anon を介さず最小権限（inquiries への INSERT のみ）で INSERT する。設計は [セキュリティ](../security.md)。

> docs は public。`role: inquiry_writer` は誰でも知り得るが、**有効な JWT は自前の秘密鍵でしか署名できない**ため、ロール名が漏れても偽造トークンは作れない。秘密鍵（`signing_keys.json`）はコミットせずオフライン保管する。

## ローテーション
`SUPABASE_INQUIRY_JWT` は有効期限付き。期限前、または漏洩が疑われたら再発行する：

- **JWT だけ差し替え**：オフライン保管の `signing_keys.json` を使い手順 2→4→5（import 不要）を実行 → `SUPABASE_INQUIRY_JWT` を更新。**署名鍵を失うと再発行できない**ので鍵はバックアップする（コミットはしない）。
- **署名鍵ごと入れ替え**（鍵漏洩時）：ダッシュボードで新しい Standby Key を import→rotate してから JWT を再発行する。旧鍵で署名した JWT は失効する。

## 一次ソース
- [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Supabase CLI リファレンス](https://supabase.com/docs/reference/cli/introduction)
