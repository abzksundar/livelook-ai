@echo off
setlocal
cd /d "%~dp0..\frontend"

if not exist node_modules\.bin\vite.cmd (
  echo Installing frontend dependencies...
  call npm install
  if errorlevel 1 exit /b %errorlevel%
)

echo.
echo Starting Vite frontend...
npm run dev
