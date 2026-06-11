# Supabase 手順（プロジェクト・鍵・JWT）

> Supabase コンソール / CLI での ✋ 手順（プロジェクト準備と資格情報の発行）。Supabase は core のスキーマが載る
> プラットフォームのためここ（infra）に置く。日々の運用（マイグレーション・型生成・RLS 検証）は
> [core 運用](../database.md)、値の置き場は [変数の配置](../variables.md)、反映の順序は [デプロイ手順](../deploy.md)。

## プロジェクト / 接続
- **命名規約：プロジェクト名＝信頼ドメイン**（スキーマ名・モジュール名を名乗らない）。
  `niqostudio`（内部＝core / studio / 公開 view）／`niqostudio-saas`（顧客向け＝identity / billing）／
  将来 `niqostudio-staging`（混載・実データなし）。名前は表示専用でいつでも変更可（ref・URL・キーは不変）。
- プロジェクトを作成し、`PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_PUBLISHABLE_KEY`（公開鍵）を控える（配置は [変数の配置](../variables.md)）。
- 本番 migration（dbmate）用の接続文字列は Database → Connection string → **Session pooler**（CI は IPv4 のみ）。`SUPABASE_DB_URL` に設定。詳細は [core 運用](../database.md)。

## 設定の IaC（terraform `supabase_settings`）
プロジェクト設定は `infra/stacks/supabase`（terraform stack）で管理する。まず **api ブロック**
（Data API が露出するスキーマ＝`core` / `studio` / `graphql_public`）だけを管理する。`supabase_settings` は宣言した
block のみ partial 更新し、未宣言の設定には触れない（delete は no-op）。auth / storage / network は据え置き（後日 additive）。

- 必要な値：`SUPABASE_ACCESS_TOKEN`（Account → Access Tokens・発行名 `infra-supabase`・Secret）／`SUPABASE_PROJECT_REF`（Variable → `TF_VAR_project_ref`）／R2 state キー。配置は [変数の配置](../variables.md)。
- **plan-first**：初回は `pnpm --filter @niqostudio/infra exec terraform -chdir=stacks/supabase plan` で本番現行値と突合し、差分が意図したもの（例: `studio` 露出の追加）だけになることを確認してから apply（無断の設定変更を避ける）。
- **順序**：本番 `studio` スキーマは migration（`db: migrate`）適用後に作成されるため、`db_schema` への `studio` 追加 apply はその後に行う（存在するスキーマだけを露出に足す）。
- apply は当面手動。reconcile 済みを確認後に `infra: apply` へ取り込める。

### niqostudio-saas の SMTP パスワード（唯一の秘密・API で投入）

`stacks/supabase-saas` は SMTP の非秘密項目とメールテンプレートを宣言管理するが、**`smtp_pass`（Resend API キー）
だけは秘密のため宣言しない**（state に残さない規約）。ダッシュボードの SMTP フォームは全項目必須で
IaC 管理値の手入力を強いられるため使わず、**Management API の partial PATCH で1項目だけ**入れる：

```sh
# ①stacks/supabase-saas を apply（SMTP 非秘密＋テンプレート）→ ②パスワードのみ投入
curl -X PATCH "https://api.supabase.com/v1/projects/$SAAS_PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"smtp_pass": "<Resend API キー（発行名 supabase-saas-auth・Sending のみ）>"}'
```

キーのローテーションも同じ1コマンド。terraform はこの項目に触れない（partial 更新）ため上書きされない。

## 署名鍵と問い合わせ用 JWT の発行（ES256）
`/api/contact`・`/api/email-events` は最小権限ロールの自前 JWT で DB にアクセスする
（`SUPABASE_INQUIRY_WRITER_JWT`＝`inquiry_writer`／`SUPABASE_INQUIRY_READER_JWT`＝`inquiry_reader`）。
署名できるのは**自分で持つ秘密鍵**だけなので、Supabase 生成鍵ではなく**自前の鍵ペアを作って import** する
（Supabase が生成した鍵の秘密鍵は取り出せない＝署名に使えない）。ロール本体は migration で作成済み（`core/migrations/`）。

**前提**：Docker 起動＋ローカルスタック（`pnpm -F @niqostudio/infra exec supabase start`）。署名はローカル CLI を使う（本番接続は不要）。config.toml は**ローカル開発用の共有設定**で本番には効かない。

1. 鍵ペアを生成：
   ```sh
   pnpm -F @niqostudio/infra exec supabase gen signing-key --algorithm ES256
   ```
   出力を `infra/supabase/signing_keys.json` に保存（**gitignore 済み**・JSON 配列 `[ { ... } ]` 形式）。
2. **一時的に** `infra/supabase/config.toml` の `# signing_keys_path = "./signing_keys.json"` を uncomment し、`supabase start`（起動済みなら再起動）で反映。**コミットしない**：鍵は gitignore のため committed にすると CI / 他クローンの `supabase start` が鍵不在で壊れる。
3. ダッシュボードへ import：Authentication → JWT Keys → **Create Standby Key →「Import an existing private key」を ON** → 秘密鍵を貼付 → **Rotate** で現行鍵へ昇格（本番がこの公開鍵で検証できるようにする）。
4. 2つの JWT を発行（同じ鍵で署名・import は 3 の1回でよい）。`exp` は必須（無期限にしない）：
   ```sh
   pnpm -F @niqostudio/infra exec supabase gen bearer-jwt --role inquiry_writer --valid-for 8760h
   pnpm -F @niqostudio/infra exec supabase gen bearer-jwt --role inquiry_reader --valid-for 8760h
   ```
   それぞれ Secret `SUPABASE_INQUIRY_WRITER_JWT` / `SUPABASE_INQUIRY_READER_JWT`（`website-production`）に設定。
5. **後始末**：`git checkout infra/supabase/config.toml` で signing_keys_path をコメントへ戻す（永続差分を残さない）。

これで `/api/contact` は最小権限（INSERT のみ）で INSERT し、`/api/email-events` は最小権限（SELECT＋`delivery_status` UPDATE のみ）で到達状況を反映する。設計は [セキュリティ](../security.md)。

> ロール名は公開情報だが、**有効な JWT は自前の秘密鍵でしか署名できない**ため、ロール名が漏れても不正なトークンは作れない。秘密鍵（`signing_keys.json`）はコミットせずオフライン保管する。
>
> ⚠️ 署名鍵は任意の `role` を claim した JWT を署名できるため、**漏洩時の影響が大きい**（最小権限を担保するのは鍵ではなく各ロールの GRANT）。したがって `signing_keys.json` は**機密として扱い**、オフライン厳重保管・非コミット・バックアップする（writer/reader を分けてもこの性質は変わらない）。

## ローテーション
問い合わせ用 JWT は有効期限付き。期限前、または漏洩が疑われたら再発行する：

- **JWT だけ差し替え**：オフライン保管の `signing_keys.json` を使い手順 2→4→5（import 不要）を実行 → 両 Secret を更新。**署名鍵を失うと再発行できない**ので鍵はバックアップする（コミットはしない）。
- **署名鍵ごと入れ替え**（鍵漏洩時）：ダッシュボードで新しい Standby Key を import→rotate してから両 JWT を再発行する。旧鍵で署名した JWT は失効する。

## 一次ソース
- [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Supabase CLI リファレンス](https://supabase.com/docs/reference/cli/introduction)
