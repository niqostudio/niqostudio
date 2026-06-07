# プロジェクト参照 ID は環境（GitHub Variable SUPABASE_PROJECT_REF → TF_VAR_project_ref）で渡す。
# 半公開値（ダッシュボード URL の <ref>）だがプラットフォーム識別子のためコードには残さない。
variable "project_ref" {
  type        = string
  description = "Supabase プロジェクトの参照 ID（ダッシュボード URL の <ref>）"
}
