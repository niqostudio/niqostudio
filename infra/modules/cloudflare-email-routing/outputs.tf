output "rule_ids" {
  description = "作成した転送ルールの ID（キー: custom_address）"
  value       = { for k, r in cloudflare_email_routing_rule.rules : k => r.id }
}
