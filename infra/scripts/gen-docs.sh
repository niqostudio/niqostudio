#!/usr/bin/env bash
# 各 module / stack の README を terraform-docs で生成（要: terraform-docs v0.20+）。
# 使い方: bash scripts/gen-docs.sh
set -euo pipefail

if ! command -v terraform-docs >/dev/null 2>&1; then
  echo "terraform-docs が見つかりません。https://terraform-docs.io でインストールしてください。" >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
config="$root/.terraform-docs.yml"

for dir in "$root"/modules/*/ "$root"/stacks/*/; do
  [ -d "$dir" ] || continue
  if ls "$dir"*.tf >/dev/null 2>&1; then
    echo "terraform-docs: $dir"
    terraform-docs --config "$config" "$dir"
  fi
done
