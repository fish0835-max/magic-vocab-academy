@echo off
cd /D "%~dp0"
for /f %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "RED=%ESC%[91m"
set "RST=%ESC%[0m"

:: Requires Administrator to modify firewall rules
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[!] Administrator privileges required.%RST%
    echo     Right-click start.bat -^> Run as administrator
    pause
    exit /b 1
)

echo Opening firewall ports 8000 and 5173...
powershell -Command "New-NetFirewallRule -DisplayName 'EnglishCard Server' -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "New-NetFirewallRule -DisplayName 'EnglishCard Vite'   -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -ErrorAction SilentlyContinue" >nul 2>&1
echo Ports 8000 and 5173 opened.

echo.
echo Installing/checking dependencies...
pip install -r requirements.txt
echo.
echo Starting EnglishCard server on http://0.0.0.0:8000
echo Press Ctrl+C to stop (firewall rules will be removed automatically).
echo.

powershell -NoProfile -Command "try { & uvicorn main:app --reload --host 0.0.0.0 --port 8000 } finally { Remove-NetFirewallRule -DisplayName 'EnglishCard Server' -ErrorAction SilentlyContinue; Remove-NetFirewallRule -DisplayName 'EnglishCard Vite' -ErrorAction SilentlyContinue; Write-Host 'Firewall rules removed.' }"

echo.
echo Server stopped.
