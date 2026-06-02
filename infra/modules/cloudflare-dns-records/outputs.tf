output "record_ids" {
  description = "作成した DNS レコードの ID（キー: type:name:content ハッシュ）"
  value       = { for k, r in cloudflare_dns_record.this : k => r.id }
}
