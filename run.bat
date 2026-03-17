@echo off
setlocal
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
for /f "tokens=*" %%h in ('hostname') do set "HN=%%h"
for /f %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "RED=%ESC%[91m"
set "RST=%ESC%[0m"

:menu
cls
echo(
echo  +------------------------------------------+
echo  ^|        EnglishCard  Launcher             ^|
echo  +------------------------------------------+
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  ^| %RED%[!] Not running as Administrator%RST%         ^|
    echo  ^|     Right-click run.bat%                  ^|
    echo  ^|     Select: Run as administrator         ^|
    echo  +------------------------------------------+
)
echo  ^|                                          ^|
echo  ^|  1.  Start Server   (backend)            ^|
echo  ^|  2.  Start Client   (frontend)           ^|
echo  ^|  3.  Start All      (recommended)        ^|
echo  ^|  4.  Help                                ^|
echo  ^|  5.  Clear Data / Credentials            ^|
echo  ^|  6.  Restore Firewall (remove rules)     ^|
echo  ^|                                          ^|
echo  ^|  0.  Exit                                ^|
echo  ^|                                          ^|
echo  +------------------------------------------+
echo(
set /p "choice=         Select [0-6] : "

if "%choice%"=="1" goto start_server
if "%choice%"=="2" goto start_client
if "%choice%"=="3" goto start_all
if "%choice%"=="4" goto show_help
if "%choice%"=="5" goto clear_data
if "%choice%"=="6" goto restore_firewall
if "%choice%"=="0" goto end
goto menu

:start_server
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo(
    echo  %RED%[!] Administrator privileges required.%RST%
    echo      Right-click run.bat - Run as administrator
    echo(
    pause
    goto menu
)
call "%ROOT%\server\start.bat"
goto menu

:start_client
start "EnglishCard Client" /D "%ROOT%" cmd /k "npm run dev"
echo(
echo  Client started in new window.
timeout /t 2 /nobreak >nul
goto menu

:start_all
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo(
    echo  %RED%[!] Administrator privileges required.%RST%
    echo      Right-click run.bat - Run as administrator
    echo(
    pause
    goto menu
)
start "EnglishCard Client" /D "%ROOT%" cmd /k "npm run dev"
echo(
echo  Client started in new window. Starting server...
timeout /t 1 /nobreak >nul
call "%ROOT%\server\start.bat"
goto menu

:clear_data
call "%ROOT%\server\clear.bat"
goto menu

:restore_firewall
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo(
    echo  %RED%[!] Administrator privileges required.%RST%
    echo      Right-click run.bat - Run as administrator
    echo(
    pause
    goto menu
)
echo(
echo  Removing EnglishCard firewall rules...
powershell -Command "Remove-NetFirewallRule -DisplayName 'EnglishCard Server' -ErrorAction SilentlyContinue"
powershell -Command "Remove-NetFirewallRule -DisplayName 'EnglishCard Vite'   -ErrorAction SilentlyContinue"
echo  Done. Ports 8000 and 5173 are now closed.
echo(
pause
goto menu

:show_help
cls
echo(
echo  +------------------------------------------+
echo  ^|           EnglishCard  Help              ^|
echo  +------------------------------------------+
echo  ^|                                          ^|
echo  ^|  [Permissions]                           ^|
echo  ^|  Options 1 and 3 require Administrator. ^|
echo  ^|  Right-click run.bat                     ^|
echo  ^|  Select: Run as administrator            ^|
echo  ^|                                          ^|
echo  ^|  [Firewall]  (auto open/close)           ^|
echo  ^|  port 8000 - backend API                 ^|
echo  ^|  port 5173 - frontend Vite               ^|
echo  ^|                                          ^|
echo  ^|  [Steps]                                 ^|
echo  ^|  1. Right-click run.bat as admin         ^|
echo  ^|  2. Select 3 (Start All)                 ^|
echo  ^|  3. Wait for both windows to show Ready  ^|
echo  ^|                                          ^|
echo  ^|  [Connect from phone]                    ^|
echo  ^|  http://%HN%:5173
echo  ^|                                          ^|
echo  +------------------------------------------+
echo(
pause
goto menu

:end
echo(
echo  Goodbye.
echo(
pause
