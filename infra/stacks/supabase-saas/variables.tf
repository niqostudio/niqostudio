# プロジェクト参照 ID は環境（GitHub Variable SAAS_SUPABASE_PROJECT_REF → TF_VAR_project_ref）で渡す。
# 半公開値（ダッシュボード URL の <ref>）だがプラットフォーム識別子のためコードには残さない。
variable "project_ref" {
  type        = string
  description = "Supabase プロジェクト niqostudio-saas の参照 ID（ダッシュボード URL の <ref>）"
}

variable "env" {
  type        = string
  description = "対象環境（config.<env>.json の選択）"
  default     = "production"
}
