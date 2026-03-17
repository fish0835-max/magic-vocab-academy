@echo off

:: Requires Administrator to modify firewall rules
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Administrator privileges required.
    echo     Right-click start.bat -^> Run as administrator
    pause
    exit /b 1
)

echo Opening firewall ports 8000 and 5173...
powershell -Command "New-NetFirewallRule -DisplayName 'EnglishCard Server' -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "New-NetFirewallRule -DisplayName 'EnglishCard Vite'   -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -ErrorAction SilentlyContinue" >nul 2>&1
echo Done.

echo.
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting EnglishCard server on http://0.0.0.0:8000
echo Press Ctrl+C to stop (firewall rules will be removed automatically).
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000

:cleanup
echo.
echo Removing firewall rules...
powershell -Command "Remove-NetFirewallRule -DisplayName 'EnglishCard Server' -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "Remove-NetFirewallRule -DisplayName 'EnglishCard Vite'   -ErrorAction SilentlyContinue" >nul 2>&1
echo Done.
