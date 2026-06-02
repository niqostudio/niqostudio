# 定数（source_domain / 転送先 / placeholder_ip）は root の config.<env>.json に集約。
# ここには環境ごとの上書きだけを置く。

# 読み込む config ファイル（root の config.<env>.json）を選ぶ。branch=main→production / develop→staging。
variable "env" {
  type        = string
  description = "デプロイ環境（読み込む config.<env>.json を選ぶ）"
  default     = "production"
}

variable "zone_id" {
  type        = string
  description = "ゾーン ID（空なら config.<env>.json の source_domain から導出）"
  default     = ""
}
