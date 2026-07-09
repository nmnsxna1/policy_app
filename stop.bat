@echo off
title Stop Loan Approval Platform
echo Stopping Loan Approval Platform servers...
echo.

REM Kill uvicorn processes
taskkill /f /im uvicorn.exe >nul 2>&1
taskkill /f /im python.exe /fi "WINDOWTITLE eq Backend Server" >nul 2>&1

REM Kill node/npm/vite processes for frontend
taskkill /f /im node.exe /fi "WINDOWTITLE eq Frontend Server" >nul 2>&1
taskkill /f /im npm.cmd >nul 2>&1
taskkill /f /im npx.cmd >nul 2>&1

REM Also kill by port (in case window titles don't match)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /f /pid %%a >nul 2>&1

echo All servers stopped.
pause