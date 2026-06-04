# デプロイ手順（運用 runbook）

> 全モジュール（core / infra / website）の**反映手順**を横断でまとめる。初回だけのブートストラップと
> 通常の反映を分ける。プラットフォーム固有の ✋ 手順は [Cloudflare 手順](infra/cloudflare.md) /
> [Resend 手順](infra/resend.md) / [core 運用](core/operations.md) に委譲し、ここは overview とオーケストレーション
> （順序・どの段で何が落ちるか・検証）に徹する。値の配置は [変数の配置](variables.md)、設計は [アーキテクチャ](architecture.md)。

## 前提ツール
- Node / pnpm（`.nvmrc` 準拠）。
- Terraform CLI（CI は 1.15.5）。ローカルは validate / plan のみ（apply は CI）。
- Supabase CLI（core の devDependency。`pnpm -F @niqostudio/core exec supabase ...`）。
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
8. **GitHub Environments を作成**（`core-production` / `infra-production` / `website-production`・Required reviewers）→ 各 Environment に Secret / Variable を設定（一覧は [変数の配置](variables.md)。`RESEND_DNS_RECORDS` 含む）。

### B. 反映（CI・依存順）
9. `core: migrate`（apply=true）：スキーマ＋ `inquiry_writer` ロールを作る。
10. **`profile` singleton を投入**（Studio）：website ビルドは実データ前提（profile 欠落で throw）。→ [core 運用](core/operations.md)
11. `inquiry_writer` JWT を発行 → `SUPABASE_INQUIRY_JWT` を設定（ロール作成後）。→ [Supabase 手順](infra/supabase.md)
12. `website: build & deploy` を dispatch：**Worker の箱を作る**（`wrangler deploy`）。JWT / Turnstile secret も投入。fail-closed のため 11・Turnstile・`PUBLIC_*` 値が前提。
13. `infra: apply` を dispatch：DNS（SPF / DMARC / DKIM / `send.`）＋ **Worker カスタムドメイン束ね**。束ねは Worker 実体が要るので **12 の後**。
14. 検証：Resend verify・`dig`・フォーム疎通（下の「apply 後の検証」）。
15. `core: migrate`（apply=true）で **anon の INSERT 剥奪**（JWT 経路の疎通を確認した後・別 migration）。
16. DMARC を `quarantine`→`reject` へ段階強化。→ [メール設計](infra/email.md)

> 肝の依存：ゾーン委譲 → 以降の DNS 操作すべて／ 受信 Email Routing 先行（→ 自動 SPF 削除）／ R2 は infra apply の前提／ ロール作成・JWT 発行・`profile` 投入 → website build/deploy（fail-closed・実データ前提）／ website が箱を作ってから infra がドメイン束ね／ JWT 経路の疎通確認後に anon 剥奪。
> 以後の通常運用では 9 / 12 / 13 は順不同・冪等（初回のみ 12→13 の順序依存）。

## 通常の反映（繰り返し）

| 対象 | トリガ | 実行内容 |
| --- | --- | --- |
| core スキーマ | `core: migrate` を dispatch（apply=true） | Session pooler 経由で `supabase db push` |
| infra | `infra: apply` を dispatch | `terraform apply`（承認ゲート） |
| website | `website: build & deploy` を dispatch | build → `wrangler deploy` → `wrangler secret bulk` |

- 本番反映はすべて**承認ゲート付き Environment**（`<module>-production`）で実行する。secret はローカルに置かない。
- PR では検証のみ（下表）。

## どの失敗がどの段で出るか
「秘密ゼロで落とせる検証は PR、秘密・本番が要るものは承認ゲート」で分離している。

| 段 | ワークフロー | 落とすもの |
| --- | --- | --- |
| PR（秘密なし） | `website: build & deploy`（build） | 型・ビルド（`pnpm build` / `pnpm check`） |
| PR | `core: types check` | migration 適用可否（local Supabase 起動で実適用）・型ドリフト |
| PR | `infra: validate` | `terraform fmt` / `validate` |
| deploy（承認後） | `website: build & deploy`（deploy） | Turnstile / JWT の構成整合（fail-closed）・deploy 失敗 |
| apply（承認後） | `infra: apply` | `terraform apply`（plan 段の取りこぼしはここで顕在化） |
| migrate（承認後） | `core: migrate` | 本番 `db push` |

- infra は PR で `plan` を走らせない（state / secret が要・fork-safe 優先）＝ plan 段の差分は apply で出る。
- secret は該当モジュールの Environment にしか無いため、secret 整合（Turnstile / JWT）は deploy job で検査する。

## apply 後の検証（突合せ）
DNS / 設定の値は Terraform が正本なので、**ここでは再掲せず検証で突合せる**：

1. `infra: apply` 後にもう一度 `terraform plan` ＝ **no-drift**（望ましい状態と一致）。
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

> GitHub 側は値・配置を API で読めないため 2 は目視が要る（不便だが避けられない）。1 の「配線 ⟷ 正本」は将来 `list-secrets` を拡張して variables.md と自動 diff する余地がある。

## リリース前チェックリスト
- [ ] PR の検証（build / types / validate）が緑。
- [ ] 影響範囲の Environment Secret / Variable が揃っている（[変数の配置](variables.md)）。
- [ ] 初回 or 順序依存の有無を確認（Worker 作成 → infra apply）。
- [ ] apply 後に `terraform plan` が no-drift。
- [ ] フォーム疎通（送信 → 受信通知 → DB INSERT）。
- [ ] SPF / DKIM / DMARC が dig で期待どおり。
