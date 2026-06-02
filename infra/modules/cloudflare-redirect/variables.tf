variable "zone_id" {
  type        = string
  description = "リダイレクト元ゾーンの ID"
}

variable "name" {
  type        = string
  description = "ruleset 名"
  default     = "redirect"
}

variable "description" {
  type        = string
  description = "ルールの説明"
  default     = ""
}

variable "expression" {
  type        = string
  description = "リダイレクトを発火させる条件式（Wireshark 風）。既定はゾーン全体。"
  default     = "true"
}

variable "target_base_url" {
  type        = string
  description = "転送先のベース URL（例: https://niqostudio.com）。末尾スラッシュは付けない。"

  validation {
    condition     = can(regex("^https?://[^/]+$", var.target_base_url))
    error_message = "target_base_url は scheme + ホストのみ（末尾スラッシュ・パス無し）。"
  }
}

variable "status_code" {
  type        = number
  description = "リダイレクトのステータスコード。"
  default     = 301

  validation {
    condition     = contains([301, 302, 303, 307, 308], var.status_code)
    error_message = "status_code は 301/302/303/307/308 のいずれか。"
  }
}

variable "preserve_path" {
  type        = bool
  description = "true なら元のパスを転送先に連結する。"
  default     = true
}

variable "preserve_query_string" {
  type        = bool
  description = "true ならクエリ文字列を維持する。"
  default     = true
}
