@echo off
rem ASCII only on purpose: batch files containing Korean break depending on the console code page.
rem All logic and Korean messages live in scripts\launch.ps1 (UTF-8 with BOM, which PowerShell reads correctly).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\launch.ps1"
exit /b %errorlevel%
