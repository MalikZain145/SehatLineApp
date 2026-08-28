# ============================================================
#  START SEHATLINE  — puts the backend online via a free Cloudflare tunnel.
#  Run this whenever you want the app to work. Keep the window OPEN while using
#  the app; closing it takes the backend offline.
#  (Double-click start-sehatline.bat, or right-click this file > Run with PowerShell.)
# ============================================================
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "SehatLine launcher starting..." -ForegroundColor Cyan

# 1) Make sure cloudflared (the tunnel tool) is present.
$cf = Join-Path $root "cloudflared.exe"
if (-not (Test-Path $cf)) {
  Write-Host "Downloading cloudflared (one-time)..." -ForegroundColor Yellow
  Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cf
}

# 2) Start the backend if it isn't already listening on port 5000.
$listening = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  Write-Host "Starting backend..." -ForegroundColor Yellow
  Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory (Join-Path $root "backend") -WindowStyle Minimized
  Start-Sleep -Seconds 10
} else {
  Write-Host "Backend already running on port 5000." -ForegroundColor Green
}

# 3) Open the tunnel and capture its public URL.
$log = Join-Path $root "tunnel.tunnel.log"
$errLog = "$log.err"
if (Test-Path $log) { Remove-Item $log -Force }
if (Test-Path $errLog) { Remove-Item $errLog -Force }
$tunnel = Start-Process -FilePath $cf -ArgumentList 'tunnel','--url','http://localhost:5000' `
  -RedirectStandardOutput $log -RedirectStandardError $errLog -PassThru -WindowStyle Minimized

Write-Host "Opening secure tunnel..." -ForegroundColor Yellow
$url = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  $content = (Get-Content $log, $errLog -ErrorAction SilentlyContinue | Out-String)
  if ($content -match "https://[a-z0-9-]+\.trycloudflare\.com") { $url = $Matches[0]; break }
}
if (-not $url) {
  Write-Host "Could not open the tunnel. Check $errLog" -ForegroundColor Red
  Read-Host "Press Enter to exit"; exit 1
}
Write-Host "Tunnel URL: $url" -ForegroundColor Green

# 4) Publish the URL to GitHub so every installed app finds this backend.
#    Write UTF-8 WITHOUT a BOM — a leading BOM breaks JSON.parse in the app.
$json = (@{ apiBaseUrl = $url; note = "AUTO-MANAGED by start-sehatline.ps1." } | ConvertTo-Json)
[System.IO.File]::WriteAllText((Join-Path $root "backend-url.json"), $json, (New-Object System.Text.UTF8Encoding($false)))
git add backend-url.json 2>$null
git commit -m "Update backend tunnel URL" 2>$null | Out-Null
git push 2>$null | Out-Null
Write-Host "Published URL to GitHub. (Apps may take a few minutes to pick up a NEW url.)" -ForegroundColor Green

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  SehatLine is LIVE." -ForegroundColor Cyan
Write-Host "  Backend URL: $url" -ForegroundColor White
Write-Host "  KEEP THIS WINDOW OPEN while using the app." -ForegroundColor Yellow
Write-Host "  Close it (or Ctrl+C) to take the app offline." -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

# 5) Stay alive with the tunnel.
Wait-Process -Id $tunnel.Id
Write-Host "Tunnel closed. App is now offline." -ForegroundColor Red
