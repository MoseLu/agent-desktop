@echo off
echo Starting Vite development server...
start "Vite Server" cmd /c "pnpm run dev:vite"

echo Waiting for Vite server to start...
timeout /t 5 /nobreak >nul

echo Starting Electron app...
start "Electron App" cmd /c "npx wait-on http://localhost:5173 && electron ."

echo Development environment started!
pause