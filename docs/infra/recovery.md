# 復旧手順（Runbook）

> **責務**：障害・事故からの**復旧手順**。設計の背景は各 doc（メールは [email.md](email.md)）、
> 用語は [用語集](glossary.md)。

障害・事故からの復旧手順。infra は「実リソースの正本 = Terraform state」なので、
**state の保全**と**import による再取り込み**が軸になる。

## 0. 平常時の備え
- state は R2（バージョニング有効を推奨）。`backend.tfbackend` の bucket/endpoints を控える。
- `.terraform.lock.hcl` をコミット（provider 5.19.1 固定で再現性を担保）。
- config.<env>.json と tfvars.example があれば構成は再構築できる。**機微値（tfvars / secrets）だけは別管理**。

## 1. state を失った / 壊した
症状: `terraform plan` が全リソースを「新規作成」しようとする。

1. まず**焦って apply しない**（重複作成・上書きの危険）。
2. R2 バージョニングから直前の `terraform.tfstate` を復元できればそれが最短。
3. 復元できない場合は**空 state に import** で実リソースを取り込む（下記）。

### import の例（niqostudio-com）
```sh
cd infra/stacks/niqostudio-com
terraform init -backend-config=backend.tfbackend

# Email Routing 設定（zone 単位）
terraform import module.email_routing.cloudflare_email_routing_settings.this <ZONE_ID>

# 転送ルール（id は API/ダッシュボードで確認）
terraform import 'module.email_routing.cloudflare_email_routing_rule.rules["hi@niqostudio.com"]' <ZONE_ID>/<RULE_ID>

# 転送先アドレス（account 単位）
terraform import 'module.email_routing.cloudflare_email_routing_address.destinations["you@example.com"]' <ACCOUNT_ID>/<DEST_ID>

# DNS レコード（for_each キー = "type:name:hash"。terraform plan の差分でキーを確認）
terraform import 'module.dns.cloudflare_dns_record.this["TXT:niqostudio.com:<hash>"]' <ZONE_ID>/<RECORD_ID>

# Worker カスタムドメイン（キーは config の workers.<role>。例 "website"。Worker 本体は wrangler 管理＝import 不要）
# import ID は <ACCOUNT_ID>/<DOMAIN_ID>（custom domain の ID。CF API /workers/domains で確認）
terraform import 'cloudflare_workers_custom_domain.this["website"]' <ACCOUNT_ID>/<DOMAIN_ID>
```
import 後に `terraform plan` が **No changes** になるまで（content/priority 等を）突き合わせる。

### niqo-studio（リダイレクト）
```sh
terraform import module.redirect.cloudflare_ruleset.redirect <ZONE_ID>/<RULESET_ID>
terraform import 'module.dns.cloudflare_dns_record.this["A:niqo.studio:<hash>"]' <ZONE_ID>/<RECORD_ID>
```

## 2. 設定がドリフトした（手で触られた）
```sh
terraform plan        # 差分を確認
terraform apply       # コードを正本として戻す
```
手動変更を正としたい時だけ、コード/config.<env>.json 側を直してから apply する。

## 3. メールが届かない / 送れない
原因切り分けは [email.md](email.md) の確認コマンドで。よくある原因：
- **apex に SPF が2本**（CF 自動 + TF）→ 1本に統合（email.md 参照）。
- 受信 MX 不在 → Cloudflare で Email Routing が Enable か、転送先が検証済みか確認。
- 送信が DMARC で弾かれる → DKIM(`resend._domainkey`) 未投入 / Resend 未 verify。

## 4. niqo.studio のリダイレクトが効かない
- apex/www が **proxied（オレンジ雲）** か。proxied でないとエッジのリダイレクトが走らない。
- `terraform plan` で ruleset の差分が無いか。プレースホルダ A レコードが消えていないか。

## 5. シークレット漏洩時のローテーション
1. **失効が先**：Cloudflare でトークン revoke / R2 キー削除 / Resend キー無効化。
2. 新しい値を発行し、ローカル環境変数 / GitHub Secrets を更新。
3. `git log` に値が混入していないか確認（混入していれば履歴も対処）。
4. state は R2（非公開）にあるが、漏洩時はバケットのキーも回す。
5. CF API トークンは**対象ゾーン + 必要権限のみ**に絞り直す（被害範囲の最小化）。

## 6. ゼロから再構築
1. リポを clone、`config.<env>.json` はそのまま使える。
2. 各 stack で tfvars / backend.tfbackend を復元（機微値は secret 管理から）。
3. state があれば `init` → `plan`（差分ゼロを確認）。state が無ければ §1 の import。
