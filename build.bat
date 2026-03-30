@echo off
title RoadSeaker EXE Builder
cd /d %~dp0

echo [1/3] Installing/Checking PyInstaller...
python -m pip install pyinstaller

echo [2/3] Bundling RoadSeaker.exe...
pyinstaller --onefile ^
    --add-data "index.html;." ^
    --add-data "app.js;." ^
    --add-data "index.css;." ^
    --add-data "auth.js;." ^
    --name "RoadSeaker" ^
    --clean ^
    server.py

echo [3/3] Done! Check the 'dist' folder.
echo.
echo Final EXE location: dist\RoadSeaker.exe
pause
