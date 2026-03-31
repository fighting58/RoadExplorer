# RoadExplorer PowerShell Launcher
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $PSScriptRoot

Write-Host "============================" -ForegroundColor Cyan
Write-Host "  RoadExplorer Launcher (.ps1)" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Start the python server in the background
Write-Host "[1/2] Starting RoadExplorer Server..." -ForegroundColor Cyan
$serverProc = Start-Process python -ArgumentList "server.py" -NoNewWindow -PassThru

# Wait for 1 second to bind
Write-Host "[2/2] Waiting for local server to bind..." -ForegroundColor Cyan
Start-Sleep -Seconds 1

# Open browser
Write-Host "Opening Browser at http://localhost:8000" -ForegroundColor Green
Start-Process "http://localhost:8000"

Write-Host ""
Write-Host "Server is running (PID: $($serverProc.Id))." -ForegroundColor Yellow
Write-Host "Close this window to stop the launcher (but server may remain)."

# Optional: keep open to show output
pause
