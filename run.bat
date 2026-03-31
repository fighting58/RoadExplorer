@echo off
title RoadExplorer Launcher
cd /d %~dp0

echo ==========================================
echo   RoadExplorer - Location Visualizer
echo ==========================================
echo.
echo [1/2]Starting Local Proxy Server (python server.py)...
start "" /b python server.py

echo [2/2]Waiting for server to initialize...
timeout /t 2 >nul

echo.
echo Server is running in the background. 
echo To stop the server, close the Python process or this terminal.
echo.
pause
