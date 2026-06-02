output "redirect_ruleset_id" {
  description = "動的リダイレクト ruleset の ID"
  value       = module.redirect.ruleset_id
}

output "dns_record_ids" {
  description = "プレースホルダ DNS レコードの ID"
  value       = module.dns.record_ids
}
