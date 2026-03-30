# RoadSeaker EXE Builder (using PyInstaller)
Write-Host "Checking for PyInstaller..." -ForegroundColor Cyan

# 1. Install PyInstaller if not present
python -m pip install pyinstaller

Write-Host "Building standalone executable..." -ForegroundColor Cyan

# 2. Run PyInstaller
# --onefile: Bundle everything into a single .exe
# --add-data: Include static files (HTML, JS, CSS) inside the EXE
# --name: Resulting file name
pyinstaller --onefile `
    --add-data "index.html;." `
    --add-data "app.js;." `
    --add-data "index.css;." `
    --add-data "auth.js;." `
    --name "RoadSeaker" `
    --clean `
    server.py

Write-Host ""
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "You can find the standalone file in the 'dist' folder." -ForegroundColor Yellow
Write-Host "File: dist/RoadSeaker.exe" -ForegroundColor Yellow
Write-Host ""
pause
