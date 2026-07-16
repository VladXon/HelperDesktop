@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies...
  call pnpm install
  if errorlevel 1 goto :error
)

if not exist "apps\server\.env" (
  echo Creating apps\server\.env from template...
  copy /Y "apps\server\.env.example" "apps\server\.env"
  echo WARNING: edit apps\server\.env and set JWT_SECRET / BOT_SHARED_SECRET before testing.
  echo.
)

if not exist "apps\server\helperdesktop.db" (
  echo Running database migrations...
  call pnpm --filter @helper/server db:migrate
  if errorlevel 1 goto :error
)

echo Starting HelperDesktop in DEV mode...
echo.
echo Server: tsx watch on apps\server\src\index.ts (auto-reload on changes)
echo Bot:    managed by server (BotManager spawns tsx in apps\bot)
echo Client: Vite dev server on http://localhost:5173
echo.
echo Press Ctrl+C to stop.
echo.

start "HelperDesktop Server" cmd /k "cd /d %~dp0 && pnpm --filter @helper/server dev"
timeout /t 2 /nobreak >nul
start "HelperDesktop Client" cmd /k "cd /d %~dp0 && pnpm --filter @helper/client dev"

echo.
echo Server and client launched in separate windows.
echo This terminal stays open for logs - press any key to close it.
pause

goto :eof

:error
echo.
echo Setup failed. See errors above.
exit /b 1
