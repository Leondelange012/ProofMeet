# ProofMeet V2.0 - Automated Setup Script (PowerShell)
# This script sets up the backend environment from scratch

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ProofMeet V2.0 - Backend Setup                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Dependencies
Write-Host "Step 1/5: Installing dependencies..." -ForegroundColor Blue
npm install
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Generate Prisma Client
Write-Host "Step 2/5: Generating Prisma Client (V2.0 schema)..." -ForegroundColor Blue
npx prisma generate
Write-Host "✓ Prisma Client generated" -ForegroundColor Green
Write-Host ""

# Step 3: Check for .env file
if (-Not (Test-Path .env)) {
  Write-Host "Warning: No .env file found" -ForegroundColor Yellow
  Write-Host "Creating .env from example..."
  
  if (Test-Path .env.example) {
    Copy-Item .env.example .env
    Write-Host "✓ .env created from example" -ForegroundColor Green
    Write-Host "⚠  Please edit .env with your DATABASE_URL" -ForegroundColor Yellow
  } else {
    Write-Host "⚠  No .env.example found. Please create .env manually" -ForegroundColor Yellow
  }
  Write-Host ""
}

# Step 4: Run Migrations
Write-Host "Step 3/5: Running database migrations..." -ForegroundColor Blue
Write-Host "This will create the V2.0 schema in your database"
npx prisma migrate dev --name init_v2
Write-Host "✓ Database migrations complete" -ForegroundColor Green
Write-Host ""

# Step 5: Seed Database
Write-Host "Step 4/5: Seeding database with test data..." -ForegroundColor Blue
npm run seed
Write-Host "✓ Database seeded" -ForegroundColor Green
Write-Host ""

# Step 6: Verify Setup
Write-Host "Step 5/5: Verifying setup..." -ForegroundColor Blue
try {
  $tsOutput = npx tsc --noEmit 2>&1
  if ($tsOutput -match "error") {
    Write-Host "⚠  TypeScript errors detected (this may be expected)" -ForegroundColor Yellow
  } else {
    Write-Host "✓ No TypeScript errors" -ForegroundColor Green
  }
} catch {
  Write-Host "⚠  Could not verify TypeScript" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Setup Complete!                                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Accounts Created:" -ForegroundColor White
Write-Host "  Court Rep:" -ForegroundColor White
Write-Host "    Email: test.officer@probation.ca.gov" -ForegroundColor Gray
Write-Host "    Password: Test123!" -ForegroundColor Gray
Write-Host ""
Write-Host "  Participant:" -ForegroundColor White
Write-Host "    Email: test.participant@example.com" -ForegroundColor Gray
Write-Host "    Password: Test123!" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "  1. Start server:  npm run dev" -ForegroundColor Gray
Write-Host "  2. Test auth:     .\test-auth-v2.sh (requires WSL/Git Bash)" -ForegroundColor Gray
Write-Host "  3. View database: npm run db:studio" -ForegroundColor Gray
Write-Host ""
Write-Host "API will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""

