@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies...
  call pnpm install --frozen-lockfile
  if errorlevel 1 goto :error
)

echo Building server...
call pnpm --filter @helper/shared build
if errorlevel 1 goto :error
call pnpm --filter @helper/server build
if errorlevel 1 goto :error
call pnpm --filter @helper/bot build
if errorlevel 1 goto :error

if not exist "apps\server\.env" (
  echo Creating apps\server\.env from template...
  copy /Y "apps\server\.env.example" "apps\server\.env"
  echo.
  echo WARNING: apps\server\.env was created from template. Edit it before running in production.
  echo Required secrets: JWT_SECRET, BOT_SHARED_SECRET, BOT_USERNAME.
  echo.
)

if not exist "apps\server\helperdesktop.db" (
  echo Running database migrations...
  call pnpm --filter @helper/server db:migrate
  if errorlevel 1 goto :error
)

echo Starting HelperDesktop...
echo.
echo Server will listen on port 3001 (or PORT from .env).
echo Bot is managed by the server (BotManager).
echo Press Ctrl+C to stop.
echo.

cd apps\server
set NODE_ENV=production
set HELPER_SERVER_AUTOSTART=1
set HELPER_BOT_AUTOSTART=1
node dist\index.js

goto :eof

:error
echo.
echo Build or setup failed. See errors above.
exit /b 1
