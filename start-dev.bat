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
  if exist "apps\server\.env.example" (
    copy /Y "apps\server\.env.example" "apps\server\.env"
  ) else (
    echo # HelperDesktop Server Config> "apps\server\.env"
    echo PORT=3001>> "apps\server\.env"
    echo JWT_SECRET=change-me>> "apps\server\.env"
    echo JWT_ACCESS_EXPIRY=15m>> "apps\server\.env"
    echo JWT_REFRESH_EXPIRY=7d>> "apps\server\.env"
  )
  echo WARNING: edit apps\server\.env and set JWT_SECRET before running.
  echo.
)

if not exist "apps\server\helperdesktop.db" (
  echo Running database migrations...
  call pnpm --filter @helper/server db:migrate
  if errorlevel 1 goto :error
)

echo Starting HelperDesktop in DEV mode...
echo.
echo Client: Vite on http://localhost:5173
echo Server: VPS (178.172.137.167:3001)
echo Bot:    on VPS
echo.

start "HelperDesktop Dev" cmd /k "cd /d %~dp0 && pnpm dev"
echo All services started. Close the "HelperDesktop Dev" window to stop.
echo.
pause
goto :eof

:error
echo Setup failed. See errors above.
exit /b 1
