output "ruleset_id" {
  description = "作成した動的リダイレクト ruleset の ID"
  value       = cloudflare_ruleset.redirect.id
}
