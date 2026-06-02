# ADR 0003: 環境モデル（モジュール別 Environment・環境独立・branch 切替）

- ステータス: 採用
- 決定日: 2026-06-03

## 背景
本番反映（migration apply / terraform apply）は GitHub Environment の承認ゲートで保護する。これを単一の `production` Environment にまとめ、全 secret（`CF_TERRAFORM_TOKEN` / `R2_*` / `EMAIL_FORWARD_TO` / `SUPABASE_DB_URL`）を1か所に置くと、`environment:` を宣言したジョブは**その Environment の全 secret を読める**ため、`db-push`（必要なのは `SUPABASE_DB_URL` だけ）が infra のトークンまで読めてしまう＝最小権限違反。あわせて、環境（production / staging）の切り替え方と、環境間の接続の扱いを決める必要があった。

## 決定
- Environment を **`<module>-<env>`**（`core-production` / `infra-production`、将来 `core-staging` 等）に分割し、各 apply ジョブは**自分のモジュールの Environment** だけを参照する。secret 名は環境に依存させず、同名を Environment で出し分ける。
- **環境は branch で選ぶ**（`main`→production / `develop`→staging）。現状は production 単一で、staging は additive に足す。
- **環境は完全に独立**させる。あるデプロイ環境のアプリは**同じ環境のサービスにだけ接続**し、環境を跨いだ接続を作らない（接続は環境内で閉じる）。

割り当て：

- `db-push` → `core-production`（`SUPABASE_DB_URL`）
- `terraform-apply`（2 stack）→ `infra-production`（CF / R2 / EMAIL トークン・公開 Variable）

## 影響
- 各ジョブが自分のモジュールの secret しか読めない（最小権限・漏洩の爆心を限定）。
- staging 追加は `<module>-staging` を additive に作るだけ（リネーム不要）。承認ゲートも Environment ごとに設定。
- 環境独立により、ある環境の資格情報・障害・データが他環境へ波及しない。
