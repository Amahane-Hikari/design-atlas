@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  start "" "%~dp0dist\offline.html"
  exit /b
)
start "" "http://127.0.0.1:4317"
node scripts\serve.mjs
pause
