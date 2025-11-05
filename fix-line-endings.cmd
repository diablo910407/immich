@echo off
setlocal EnableExtensions
title Fix script line endings CRLF to LF

echo.
echo This will batch-fix script line endings (CRLF to LF).
echo Target: *.sh, *.bash and scripts in bin directories.
echo Press any key to start...
pause >nul

pushd "%~dp0" >nul 2>&1

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if exist "%PS%" (
  "%PS%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-line-endings.ps1"
) else (
  echo PowerShell not found. Aborting.
)

popd >nul 2>&1

echo.
echo Done. Press any key to close...
pause >nul
endlocal
