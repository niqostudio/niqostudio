# Commit Rule

コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) に従う（モノリポ共通）。

## フォーマット

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **type**: 必須。下記一覧から選ぶ。
- **scope**: 任意。変更モジュール/範囲（例: `website` / `core` / `infra` / `db-types` / `db` / `ui` / `dns` / `email` / `supabase`）。
- **subject**: 必須。日本語で簡潔に（例: `ログインフォームを追加`）。末尾に句点を付けない。
- **body**: 任意。「何を・なぜ」。1行72文字以内を目安に折り返す。
- **footer**: 任意。破壊的変更や Issue 参照（例: `Closes #123`）。

## type 一覧

| type | 用途 |
| --- | --- |
| `feat` | 新機能・リソース・モジュールの追加 |
| `fix` | バグ・設定ミスの修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | 動作に影響しない整形（fmt 等） |
| `refactor` | 挙動を変えないコード/構成変更 |
| `perf` | パフォーマンス改善 |
| `test` | テストの追加・修正 |
| `build` | ビルド・依存関係（pnpm / supabase / terraform 等） |
| `ci` | CI 設定・スクリプト |
| `chore` | その他の雑務 |
| `revert` | 以前のコミットの取り消し |

## ルール

1. 1コミット = 1つの論理的な変更。
2. subject は50文字以内を目安にする。
3. 破壊的変更は type の後に `!`、または footer に `BREAKING CHANGE:`。
4. 日本語で統一する（type / scope は英語、subject / body は日本語）。
5. WIP コミットを main に残さない。
6. **シークレットの値（API トークン・キー・接続文字列・tfstate 等）を絶対にコミットしない。**
7. コミットに Claude / AI 名義を残さない。
   - `Co-Authored-By: Claude ...` などの trailer を付けない。
   - `🤖 Generated with Claude Code` のような署名・絵文字を入れない。
   - author / committer は必ずユーザー本人の git 設定にする。
   - push 前に `git log --format='%an <%ae>%n%b'` で名義と本文を確認する。

## 例

```
feat(website): お問い合わせフォームを追加
```

```
fix(core): 重複ユーザーの挿入を防止

ユニーク制約違反時のリトライ処理を追加。
```

```
feat(infra)!: 送信ドメインを niqostudio.com に集約

BREAKING CHANGE: Resend の DNS が send. サブドメインへ移る。
```
