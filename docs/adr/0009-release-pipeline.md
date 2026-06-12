# ADR 0009: CI を verify / release の2本化（変更検出＋依存順の単一入口）

- ステータス: 採用
- 決定日: 2026-06-12

## 背景

workflow がモジュール別に十数本（PR チェック5本＋本番反映の dispatch 5本＋website / docs）に分かれ、
**本番反映の依存解決が人手**だった：core migration の後に website（公開 view を SSG が読む）、
saas migration と Edge Functions は同一コミットで、スキーマ露出（settings）はスキーマ作成後、
Worker 束ねは Worker 作成後——どれも取り違えると本番が壊れるが、順序の知識は docs と頭の中にしかない。
また「どの workflow をいつ叩くか」自体が運用知識になっており、モジュールが増えるほど誤操作の確率が上がる。

## 決定

**入口を2本＋横断に畳む。** どちらの入口も「変更モジュールを diff で検出し、該当 job だけ走らせる」。

### `verify`（検証・秘密ゼロ）

PR / push(main) で自動、dispatch で全量。fork PR でも安全（secret を一切使わない）。

- core / saas：適用済み migration の改竄防止＋local Supabase 実適用＋型ドリフト検知
- studio：typecheck・テスト／ website：build（PR は一時 Supabase で実適用検証）
- infra：`terraform fmt` / `validate` / terraform-docs ／ docs：mkdocs build

### `release`（本番反映・dispatch・apply boolean）

**未反映の変更（git の HEAD ＋ core の商品マスタ）を依存順で本番に収束させる単一入口。**

- **二段運用**：`apply=false`＝全ジョブ dry-run（migration status / terraform plan / build のみ）で差分を読み、
  `apply=true` で反映する。従来の plan-first（settings / infra）と同じ作法の一般化。
- **変更検出**：前回成功した apply 実行の commit と HEAD の diff。判定不能（初回等）は全モジュール対象（冪等）。
- **依存順は needs に焼き込む**：core/saas migration → Edge Functions / website / 商品同期 / docs → infra
  （スキーマ露出・ドメイン束ね）。人が覚える順序をなくす。
- **商品マスタ同期（core データ → Stripe / identity）は apply のたびに収束**：正本が DB のデータで diff 検出
  できないため。無変更なら terraform no-op・射影は冪等 upsert。意図のゲートは studio の draft→publish が担う。
- **信頼境界は不変**：Environment は workflow でなく **job 単位**で張れるため、各 job が従来どおり
  モジュール別 Environment（`infra-production` / `saas-platform-production` / `website-production`）を名乗る。
  secret の置き場（[変数の配置](../variables.md)）・ADR 0003 / 0007 の分離はそのまま。
  1 run 内の複数 Environment 承認は GitHub の UI でまとめて行える。
- docs（GitHub Pages）も release に含める＝ドキュメントはシステムと同じタイミングで公開される
  （未リリース機能の記述が先に公開されない）。

### 横断（入口ではない）

- `website.yml`：build / deploy 手順の正本。verify（deploy=false）と release（deploy=true）が
  `workflow_call` で共有（重複させない）。
- `secret-scan`（push / PR・セキュリティ）・`keep-alive`（cron）。

studio のデプロイボタンは `release.yml` の dispatch（apply=true）に差し替え＝website 単発デプロイから
「未反映を依存順で全部反映」へ。

## 影響

- 旧 workflow 11本（check 系5・dispatch 系5・docs）を削除（履歴は git に残る）。運用 docs は verify / release 前提に更新。
- `saas-platform-production` に `SUPABASE_ACCESS_TOKEN`（secret）と `SAAS_SUPABASE_PROJECT_REF`（var）を
  追加投入する（Edge Functions deploy 用・infra-production の同名と同値）。
- branch protection の required checks を使う場合は job 名（verify の db_check 等）へ付け替える。
- dry-run でも Environment 承認が要る（plan にも secret が要るため。従来の settings plan と同じ）。
- terraform の plan と apply は別 run＝plan 後に state が動けば apply 結果はずれうる（従来の plan-first
  運用と同等の許容。気になる場合に plan ファイルの artifact 引き渡しを将来検討）。
