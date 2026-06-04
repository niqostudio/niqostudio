# .github/workflows から参照している Secrets / Variables 名を抽出して一覧表示する。
# docs/variables.md の secret 表が実態とズレていないかの確認に使う。
# 使い方: pwsh scripts/list-secrets.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$wf = Join-Path $root ".github\workflows"

$content = Get-ChildItem $wf -Filter *.yml -Recurse | Get-Content -Raw

"== secrets =="
[regex]::Matches($content, 'secrets\.([A-Z0-9_]+)') |
    ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique

"== vars =="
[regex]::Matches($content, 'vars\.([A-Z0-9_]+)') |
    ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
