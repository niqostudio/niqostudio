# 各 module / stack の README を terraform-docs で生成（要: terraform-docs v0.20+）。
# 使い方: pwsh scripts/gen-docs.ps1
$ErrorActionPreference = "Stop"

if (-not (Get-Command terraform-docs -ErrorAction SilentlyContinue)) {
    Write-Error "terraform-docs が見つかりません。https://terraform-docs.io でインストールしてください。"
}

$root   = Split-Path -Parent $PSScriptRoot
$config = Join-Path $root ".terraform-docs.yml"

Get-ChildItem -Path (Join-Path $root "modules"), (Join-Path $root "stacks") -Directory |
    Where-Object { Get-ChildItem $_.FullName -Filter *.tf -ErrorAction SilentlyContinue } |
    ForEach-Object {
        Write-Host "terraform-docs: $($_.FullName)"
        & terraform-docs --config $config $_.FullName
    }
