@echo off
setlocal
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
for /f %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "RED=%ESC%[91m"
set "RST=%ESC%[0m"

echo(
echo  +------------------------------------------+
echo  ^|       EnglishCard  Clear Data            ^|
echo  +------------------------------------------+
echo  ^|                                          ^|
echo  ^|  This will clear:                        ^|
echo  ^|  - server/data/wordbank.json (reset)     ^|
echo  ^|  - server/data/config.json  (delete PIN) ^|
echo  ^|  - server/uploads/*         (delete imgs)^|
echo  ^|                                          ^|
echo  +------------------------------------------+
echo(
set /p "confirm=  Type YES to confirm: "
if /I NOT "%confirm%"=="YES" (
    echo(
    echo  %RED%Cancelled.%RST%
    echo(
    goto end
)

echo(
echo  Clearing server data...

echo [] > "%ROOT%\data\wordbank.json"
echo  [OK] wordbank.json reset to empty

if exist "%ROOT%\data\config.json" (
    del "%ROOT%\data\config.json"
    echo  [OK] config.json deleted (PIN reset to default 0000)
) else (
    echo  [--] config.json not found (already clean)
)

if exist "%ROOT%\uploads\" (
    del /q "%ROOT%\uploads\*" 2>nul
    echo  [OK] uploads/ cleared
) else (
    echo  [--] uploads/ not found (already clean)
)

echo(
echo  +------------------------------------------+
echo  ^|  Server data cleared.                    ^|
echo  ^|                                          ^|
echo  ^|  To also clear browser data:             ^|
echo  ^|  Open the app, press F12 (DevTools)      ^|
echo  ^|  Console tab, paste:                     ^|
echo  ^|                                          ^|
echo  ^|  localStorage.removeItem(                ^|
echo  ^|    'englishcard_wordbank')               ^|
echo  ^|  localStorage.removeItem(                ^|
echo  ^|    'englishcard_progress')               ^|
echo  ^|  localStorage.removeItem(                ^|
echo  ^|    'englishcard_pin')                    ^|
echo  ^|  localStorage.removeItem(                ^|
echo  ^|    'englishcard_claude_key')             ^|
echo  ^|                                          ^|
echo  +------------------------------------------+
echo(

:end
pause
