# ==============================================================================
# Learnforge Project Initialization Script (PowerShell)
# ==============================================================================

Write-Host ">>> Initializing Learnforge monorepo structure..." -ForegroundColor Cyan

# 1. Ensure Directory Structure
$dirs = @(
    "frontend/src",
    "frontend/public",
    "backend-node/src",
    "backend-ai"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created: $dir" -ForegroundColor Green
    }
}

# 2. Setup backend-ai Python Virtual Environment
Write-Host "`n>>> Setting up Python virtual environment for backend-ai..." -ForegroundColor Cyan
Set-Location -Path "backend-ai"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
Write-Host "To install Python dependencies, run:" -ForegroundColor Yellow
Write-Host "  cd backend-ai"
Write-Host "  .venv\Scripts\Activate.ps1"
Write-Host "  pip install -r requirements.txt"

# 3. Setup backend-node
Set-Location -Path "..\backend-node"
Write-Host "`n>>> Node.js backend ready. To install dependencies, run:" -ForegroundColor Cyan
Write-Host "  cd backend-node"
Write-Host "  npm install"

# 4. Setup frontend
Set-Location -Path "..\frontend"
Write-Host "`n>>> React frontend ready. To install dependencies, run:" -ForegroundColor Cyan
Write-Host "  cd frontend"
Write-Host "  npm install"

Set-Location -Path ".."
Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "Learnforge structure configured successfully!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
