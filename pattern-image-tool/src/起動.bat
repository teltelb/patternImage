@echo off
REM 起動用バッチ（pattern-image-tool）

cd /d "%~dp0pattern-image-tool"
echo.
echo 🚀 Pattern Image Tool を起動します...

start http://localhost:5173
call npm run dev

pause