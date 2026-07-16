@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies...
  call pnpm install --frozen-lockfile
  if errorlevel 1 goto :error
)

echo Building shared...
call pnpm --filter @helper/shared build
if errorlevel 1 goto :error

echo Building client...
call pnpm --filter @helper/client build
if errorlevel 1 goto :error

echo Starting HelperDesktop in PRODUCTION mode...
echo Server: VPS (178.172.137.167:3001)
echo.

cd apps\client
npx electron .
if errorlevel 1 goto :error

goto :eof

:error
echo Setup failed. See errors above.
exit /b 1
