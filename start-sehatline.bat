@echo off
REM Double-click this to put SehatLine's backend online.
REM Keep the window open while using the app.
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0start-sehatline.ps1"
echo.
pause
