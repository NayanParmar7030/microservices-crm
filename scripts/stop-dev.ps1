$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Stopping docker postgres + redis..."
docker compose stop postgres redis | Out-Host

Write-Host ""
Write-Host "App terminal windows were started in separate PowerShell sessions."
Write-Host "Close those windows to fully stop auth/user/crm/notification/gateway/frontend processes."
