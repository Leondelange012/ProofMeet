# Railway Environment Variables Setup Script
# Run this script in PowerShell to set up production environment variables

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🚂 Railway Environment Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "This script will guide you through setting up Railway environment variables.`n" -ForegroundColor White

# Step 1: Login
Write-Host "Step 1: Login to Railway" -ForegroundColor Yellow
Write-Host "This will open your browser for authentication.`n" -ForegroundColor Gray
Read-Host "Press Enter to continue"

cd backend
railway login

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Railway login failed. Please try again.`n" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Login successful!`n" -ForegroundColor Green

# Step 2: Link to project
Write-Host "Step 2: Link to your Railway project" -ForegroundColor Yellow
Write-Host "Select 'proofmeet-backend-production' when prompted.`n" -ForegroundColor Gray
Read-Host "Press Enter to continue"

railway link

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Failed to link project. Please try again.`n" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Project linked!`n" -ForegroundColor Green

# Step 3: Set environment variables
Write-Host "Step 3: Setting environment variables" -ForegroundColor Yellow
Write-Host "Each variable will be set individually. You'll see confirmations.`n" -ForegroundColor Gray
Read-Host "Press Enter to start"

# JWT Secret (CRITICAL - Generated secure value)
Write-Host "`n[1/9] Setting JWT_SECRET..." -ForegroundColor Cyan
railway variables --set JWT_SECRET="926741c47085fb528b9e215ff50a7932f2ecd905c7dc2b1afb4059e782acd24537a0cf9e52dcb9f1118bacaca6c7acac251a9213a3091027c3c0640f90e1f367"
if ($LASTEXITCODE -eq 0) { Write-Host "✅ JWT_SECRET set" -ForegroundColor Green } else { Write-Host "❌ Failed" -ForegroundColor Red }

# JWT Expiration
Write-Host "`n[2/9] Setting JWT_EXPIRES_IN..." -ForegroundColor Cyan
railway variables --set JWT_EXPIRES_IN="24h"
if ($LASTEXITCODE -eq 0) { Write-Host "✅ JWT_EXPIRES_IN set" -ForegroundColor Green } else { Write-Host "❌ Failed" -ForegroundColor Red }

# Node Environment
Write-Host "`n[3/9] Setting NODE_ENV..." -ForegroundColor Cyan
railway variables --set NODE_ENV="production"
if ($LASTEXITCODE -eq 0) { Write-Host "✅ NODE_ENV set" -ForegroundColor Green } else { Write-Host "❌ Failed" -ForegroundColor Red }

# CORS Origin
Write-Host "`n[4/9] Setting CORS_ORIGIN..." -ForegroundColor Cyan
railway variables --set CORS_ORIGIN="https://proof-meet-frontend.vercel.app"
if ($LASTEXITCODE -eq 0) { Write-Host "✅ CORS_ORIGIN set" -ForegroundColor Green } else { Write-Host "❌ Failed" -ForegroundColor Red }

# Email Verification Bypass
Write-Host "`n[5/9] Setting BYPASS_EMAIL_VERIFICATION..." -ForegroundColor Cyan
railway variables --set BYPASS_EMAIL_VERIFICATION="false"
if ($LASTEXITCODE -eq 0) { Write-Host "✅ BYPASS_EMAIL_VERIFICATION set" -ForegroundColor Green } else { Write-Host "❌ Failed" -ForegroundColor Red }

# Logging Level
Write-Host "`n[6/9] Setting LOG_LEVEL..." -ForegroundColor Cyan
railway variables --set LOG_LEVEL="info"
if ($LASTEXITCODE -eq 0) { Write-Host "✅ LOG_LEVEL set" -ForegroundColor Green } else { Write-Host "❌ Failed" -ForegroundColor Red }

# Bcrypt Rounds
Write-Host "`n[7/9] Setting BCRYPT_ROUNDS..." -ForegroundColor Cyan
railway variables --set BCRYPT_ROUNDS="12"
if ($LASTEXITCODE -eq 0) { Write-Host "✅ BCRYPT_ROUNDS set" -ForegroundColor Green } else { Write-Host "❌ Failed" -ForegroundColor Red }

# Rate Limiting - Window
Write-Host "`n[8/9] Setting RATE_LIMIT_WINDOW_MS..." -ForegroundColor Cyan
railway variables --set RATE_LIMIT_WINDOW_MS="900000"
if ($LASTEXITCODE -eq 0) { Write-Host "✅ RATE_LIMIT_WINDOW_MS set" -ForegroundColor Green } else { Write-Host "❌ Failed" -ForegroundColor Red }

# Rate Limiting - Max Requests
Write-Host "`n[9/9] Setting RATE_LIMIT_MAX_REQUESTS..." -ForegroundColor Cyan
railway variables --set RATE_LIMIT_MAX_REQUESTS="100"
if ($LASTEXITCODE -eq 0) { Write-Host "✅ RATE_LIMIT_MAX_REQUESTS set" -ForegroundColor Green } else { Write-Host "❌ Failed" -ForegroundColor Red }

# Verify all variables are set
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Verifying environment variables..." -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

railway variables

# Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Verify all variables are listed above" -ForegroundColor White
Write-Host "  2. Railway will automatically redeploy" -ForegroundColor White
Write-Host "  3. Monitor deployment: railway logs --follow" -ForegroundColor White
Write-Host "  4. Test health endpoint after deployment" -ForegroundColor White

Write-Host "`nTest with:" -ForegroundColor Cyan
Write-Host "  curl https://proofmeet-backend-production.up.railway.app/health`n" -ForegroundColor Gray

Write-Host "========================================`n" -ForegroundColor Green

