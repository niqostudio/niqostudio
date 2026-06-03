# このスタックが正本として管理する値。website / core はこれらを参照して二重定義を避ける。
output "domain" {
  description = "正本として管理するルートドメイン"
  value       = local.domain
}

output "zone_id" {
  description = "Cloudflare ゾーン ID（domain から導出 or 上書き値）"
  value       = local.zone_id
}

output "account_id" {
  description = "Cloudflare アカウント ID"
  value       = local.account_id
}

output "worker_custom_domains" {
  description = "Worker のカスタムドメイン（role => hostname）"
  value       = { for role, d in cloudflare_workers_custom_domain.this : role => d.hostname }
}

output "dns_record_ids" {
  description = "投入した DNS レコードの ID"
  value       = module.dns.record_ids
}

output "email_routing_rule_ids" {
  description = "Email Routing 転送ルールの ID"
  value       = module.email_routing.rule_ids
}
