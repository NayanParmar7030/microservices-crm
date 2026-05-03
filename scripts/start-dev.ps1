param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Ensure-EnvFile {
  $envPath = Join-Path $root ".env"
  if (-not (Test-Path $envPath)) {
    throw ".env file not found at repo root. Copy .env.example to .env first."
  }
}

function Wait-ForPort {
  param(
    [string]$Host,
    [int]$Port,
    [int]$TimeoutSec = 60
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $iar = $client.BeginConnect($Host, $Port, $null, $null)
      $connected = $iar.AsyncWaitHandle.WaitOne(1000, $false)
      if ($connected -and $client.Connected) {
        $client.EndConnect($iar)
        $client.Close()
        return
      }
      $client.Close()
    } catch {
    }
    Start-Sleep -Milliseconds 500
  }
  throw "Timeout waiting for $Host`:$Port"
}

function Start-ServiceWindow {
  param(
    [string]$Title,
    [string]$Command
  )
  $psCommand = "Set-Location '$root'; `$Host.UI.RawUI.WindowTitle = '$Title'; $Command"
  Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $psCommand | Out-Null
}

Require-Command "npm"
Require-Command "docker"
Ensure-EnvFile

if (-not $SkipDocker) {
  Write-Host "Starting postgres + redis with Docker Compose..."
  docker compose up -d postgres redis | Out-Host

  Write-Host "Waiting for Postgres (5432)..."
  Wait-ForPort -Host "127.0.0.1" -Port 5432 -TimeoutSec 90
  Write-Host "Waiting for Redis (6379)..."
  Wait-ForPort -Host "127.0.0.1" -Port 6379 -TimeoutSec 90
}

Write-Host "Starting service windows..."
Start-ServiceWindow -Title "auth-service" -Command "npm run dev:auth"
Start-ServiceWindow -Title "user-service" -Command "npm run dev:user"
Start-ServiceWindow -Title "crm-service" -Command "npm run dev:crm"
Start-ServiceWindow -Title "notification-service" -Command "npm run dev:notifications"
Start-ServiceWindow -Title "api-gateway" -Command "npm run dev:gateway"
Start-ServiceWindow -Title "frontend" -Command "npm run dev:frontend"

Write-Host ""
Write-Host "All development processes were launched."
Write-Host "Frontend: http://localhost:5173"
Write-Host "Gateway:  http://localhost:3000"
