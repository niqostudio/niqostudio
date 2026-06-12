# デプロイ手順（運用 runbook）

> 全モジュール（core / infra / website）の**反映手順**を横断でまとめる。初回だけのブートストラップと
> 通常の反映を分ける。プラットフォーム固有の ✋ 手順は [Cloudflare 手順](infra/cloudflare.md) /
> [Resend 手順](infra/resend.md) / [core 運用](database.md) に委譲し、ここは overview とオーケストレーション
> （順序・どの段で何が落ちるか・検証）に徹する。値の配置は [変数の配置](variables.md)、設計は [アーキテクチャ](architecture.md)。

## 前提ツール
- Node / pnpm（`.nvmrc` 準拠）。
- Terraform（infra の npm devDependency `@jahed/terraform`・`pnpm -F @niqostudio/infra exec terraform ...`・1.15.5）。ローカルは validate / plan のみ（apply は CI）。
- Supabase CLI（infra の devDependency。`pnpm -F @niqostudio/infra exec supabase ...`）。
- 各プラットフォームのアカウント（Cloudflare / Supabase / Resend）。

## 初回ブートストラップ（一度きり）
依存順がある。詳細は各リンク先へ委譲し、ここは順序と「なぜその順か」を示す。

### A. プラットフォーム準備（コンソール ✋）
1. アカウント作成（Cloudflare / Supabase / Resend）。
2. **ゾーンを Cloudflare に追加**し、レジストラの NS を Cloudflare へ向けて有効化（niqostudio.com / niqo.studio）。Terraform はゾーンを**名前で参照**（作成しない）ため、これが全 DNS 操作の前提。
3. **Cloudflare 受信を先に**：Email Routing を有効化（受信 MX が自動付与・転送先確認を承認）→ **自動で入る apex SPF を削除**（Terraform 版と二重になり SPF が無効化するため）。→ [Cloudflare 手順](infra/cloudflare.md)
4. Resend：ドメイン登録 → DKIM / `send.` の値を取得。→ [Resend 手順](infra/resend.md)
5. **R2**：state バケット作成＋ tfstate トークン発行（infra apply の backend 前提）。→ [Cloudflare 手順](infra/cloudflare.md)
6. CF API トークン（`infra-terraform` / `website-worker-deploy`）と Turnstile キーを発行。→ [Cloudflare 手順](infra/cloudflare.md)
7. Supabase：プロジェクト作成 → 署名鍵を import→rotate。→ [Supabase 手順](infra/supabase.md)
8. **GitHub Environments を作成**（`infra-production` / `saas-platform-production` / `website-production`・Required reviewers）→ 各 Environment に Secret / Variable を設定（一覧は [変数の配置](variables.md)。`RESEND_DNS_RECORDS` 含む）。`release` の core_db job も `infra-production` を使う（[ADR 0005](adr/0005-supabase-into-infra-platform.md)）。

### B. 反映（CI・依存順）
9. `release`（apply=true）1回目：core/studio スキーマ＋ `inquiry_writer` ロールを作る（website は `PUBLIC_*`・JWT 未設定のため、ここではまだ deploy しない）。
10. **`profile` singleton を投入**（Studio）：website ビルドは実データ前提（profile 欠落で throw）。→ [core 運用](database.md)
11. `inquiry_writer` JWT を発行 → `SUPABASE_INQUIRY_WRITER_JWT` を設定（ロール作成後）。→ [Supabase 手順](infra/supabase.md)
12. `release`（apply=true）2回目：website deploy（**Worker の箱を作る**・JWT / Turnstile secret 投入）→ infra apply（DNS ＋ **Worker カスタムドメイン束ね**）。**箱→束ねの順序は release の needs が保証**する。
13. 検証：Resend verify・`dig`・フォーム疎通（下の「apply 後の検証」）。
14. anon の INSERT 剥奪 migration を入れて `release`（JWT 経路の疎通を確認した後・別 migration）。
15. DMARC を `quarantine`→`reject` へ段階強化。→ [メール設計](infra/email.md)

> 肝の依存：ゾーン委譲 → 以降の DNS 操作すべて／ 受信 Email Routing 先行（→ 自動 SPF 削除）／ R2 は infra apply の前提／ ロール作成・JWT 発行・`profile` 投入 → website build/deploy（fail-closed・実データ前提）／ website が箱を作ってから infra がドメイン束ね（release の needs に焼き込み済み）／ JWT 経路の疎通確認後に anon 剥奪。

## 通常の反映（繰り返し）

**入口は `release` workflow 1本**。未反映の変更（git の HEAD ＋ core の商品マスタ）を変更検出し、
依存順（core/saas migration → functions / website / 商品同期 → infra）で本番に収束させる。

1. `release`（apply=false）を dispatch → 全ジョブの **dry-run**（migration status / terraform plan / build / deploy 対象）を1つの run で読む。
2. 差分が意図どおりなら `release`（apply=true）→ 各 Environment の承認をまとめて行い、依存順に反映。

- 各 job は従来どおり**モジュール別 Environment**（`<module>-production`・承認ゲート）を張る＝secret の置き場・信頼境界は不変。secret はローカルに置かない。
- 商品マスタ（core.products / product_offers）の Stripe / identity への同期は **apply のたびに収束**する（データが正本＝diff 検出外。無変更なら no-op・冪等）。
- PR では検証のみ（下表）。

## どの失敗がどの段で出るか
「秘密ゼロで落とせる検証は PR、秘密・本番が要るものは承認ゲート」で分離している。

| 段 | ワークフロー | 落とすもの |
| --- | --- | --- |
| PR / push（秘密なし） | `verify`（website_check） | 型・ビルド（`pnpm build` / `pnpm check`・PR は一時 Supabase で実適用検証） |
| PR / push | `verify`（db_check / saas_check） | migration の改竄・適用可否（local Supabase で実適用）・型ドリフト |
| PR / push | `verify`（studio_check / infra_check / docs_check） | studio 型・テスト／`terraform fmt` / `validate` / terraform-docs／mkdocs build |
| dry-run（承認後） | `release`（apply=false） | migration の pending・terraform plan の差分・website build |
| apply（承認後） | `release`（apply=true） | deploy / apply の実失敗（Turnstile / JWT の構成整合は website deploy job が fail-closed で検査） |

- infra は verify で `plan` を走らせない（state / secret が要・fork-safe 優先）＝ plan 段の差分は release の dry-run で出る。
- secret は該当モジュールの Environment にしか無いため、secret 整合（Turnstile / JWT）は deploy job で検査する。

## apply 後の検証（突合せ）
DNS / 設定の値は Terraform が正本なので、**ここでは再掲せず検証で突合せる**：

1. `release`（apply）後にもう一度 `release`（apply=false）＝ 全 plan / status が **no-drift**（望ましい状態と一致）。
2. TF 管理外の交点だけ `dig` で確認：
   ```sh
   dig +short MX  niqostudio.com                     # 受信 MX が *.mx.cloudflare.net で入っているか
   dig +short TXT niqostudio.com                     # SPF が「1本だけ」（自動 SPF を消したか）
   dig +short TXT resend._domainkey.niqostudio.com   # DKIM
   dig +short TXT _dmarc.niqostudio.com              # DMARC
   dig +short MX  send.niqostudio.com                # 送信バウンス（amazonses ドメインで正）
   ```
   レコードの期待値・役割は [メール設計](infra/email.md)。
3. website：`/api/contact` の疎通と、Worker ランタイム secret の投入確認（[Cloudflare 手順](infra/cloudflare.md)）。

## ローカル Terraform の用途（apply はしない）
- 構文確認：`terraform init -backend=false && terraform validate`（creds / state 不要）。
- plan / state 操作：`backend.tfbackend`（`.example` からコピー）＋必須変数を与えて `terraform plan`。state 復旧・import は [recovery](infra/recovery.md)。
- `.terraform.lock.hcl` は**コミットする**（provider 固定）。

## Secret / Variable の突き合わせ
[変数の配置](variables.md) が**正本（spec）**で、実装（ワークフローの配線）と GitHub の実配置はこれに**追従**する。名前しか機械確認できないため、variables.md を軸に2方向で照合する：

1. **配線 ⟷ 正本**：`pwsh infra/scripts/list-secrets.ps1` でワークフローが参照する Secret / Variable 名を抽出し、variables.md の表と差分が無いか（実装が spec を満たし、未定義の参照が無いか）。
2. **実配置 ⟷ 正本**：GitHub → Settings → Environments / Secrets and variables を開き、variables.md の各行が正しい Environment / scope に存在するか目視照合（値は読めないので名前と置き場のみ）。

> GitHub 側は値・配置を API で読めないため 2 は目視が要る（不便だが避けられない）。

## リリース前チェックリスト
- [ ] PR の検証（build / types / validate）が緑。
- [ ] 影響範囲の Environment Secret / Variable が揃っている（[変数の配置](variables.md)）。
- [ ] 初回 or 順序依存の有無を確認（Worker 作成 → infra apply）。
- [ ] apply 後に `terraform plan` が no-drift。
- [ ] フォーム疎通（送信 → 受信通知 → DB INSERT）。
- [ ] SPF / DKIM / DMARC が dig で期待どおり。
