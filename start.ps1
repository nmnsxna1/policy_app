<# 
.SYNOPSIS
    Starts the Loan Approval Platform (Backend + Frontend)
.DESCRIPTION
    Launches both the FastAPI backend and Vite React frontend in separate windows.
#>

$backendPath  = "C:\Users\2128861\Desktop\Workspace2\backend"
$frontendPath = "C:\Users\2128861\Desktop\Workspace2\frontend"
$pythonExe    = "C:\Users\2128861\AppData\Local\Programs\Python\Python312\python.exe"

Write-Host "🚀 Starting Loan Approval Platform..." -ForegroundColor Cyan
Write-Host "Backend:  $backendPath" -ForegroundColor Gray
Write-Host "Frontend: $frontendPath" -ForegroundColor Gray
Write-Host ""

# Check if paths exist
if (-not (Test-Path $backendPath))  { Write-Error "Backend path not found: $backendPath"; exit 1 }
if (-not (Test-Path $frontendPath)) { Write-Error "Frontend path not found: $frontendPath"; exit 1 }
if (-not (Test-Path $pythonExe))    { Write-Error "Python not found at: $pythonExe"; exit 1 }

# Start Backend
Write-Host "Starting Backend (FastAPI)..." -ForegroundColor Yellow
$backendProc = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory $backendPath `
    -WindowStyle Normal `
    -PassThru

# Wait for backend to be ready
Write-Host "Waiting for backend to start..." -ForegroundColor Gray
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 1
}

if (-not $ready) {
    Write-Warning "Backend may not be ready yet, continuing anyway..."
}

# Start Frontend
Write-Host "Starting Frontend (Vite + React)..." -ForegroundColor Yellow
$frontendProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory $frontendPath `
    -WindowStyle Normal `
    -PassThru

Write-Host ""
Write-Host "✅ Both servers launched!" -ForegroundColor Green
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close this window (servers will keep running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")