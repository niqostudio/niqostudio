#!/usr/bin/env bash
# .github/workflows から参照している Secrets / Variables 名を抽出して一覧表示する。
# 使い方: bash scripts/list-secrets.sh
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
wf="$root/.github/workflows"

echo "== secrets =="
grep -rhoE 'secrets\.[A-Z0-9_]+' "$wf" | sed 's/secrets\.//' | sort -u

echo "== vars =="
grep -rhoE 'vars\.[A-Z0-9_]+' "$wf" | sed 's/vars\.//' | sort -u
