# Debug script to see actual API responses

$API_BASE_URL = "https://proofmeet-backend-production.up.railway.app/api"
$ADMIN_SECRET = "pMU4DZdgIRh5s9oWiHvuKtLaOeVANrB0"

Write-Host "Debugging API Responses..." -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "X-Admin-Secret" = $ADMIN_SECRET
    "Content-Type" = "application/json"
}

# Test 1: Trigger sync and show RAW response
Write-Host "1. Triggering sync..." -ForegroundColor Yellow
try {
    $syncUrl = "$API_BASE_URL/admin/sync-meetings"
    $response = Invoke-RestMethod -Uri $syncUrl -Method Post -Headers $headers -TimeoutSec 120
    
    Write-Host "Raw response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
    Write-Host ""
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Get stats and show RAW response
Write-Host "2. Getting stats..." -ForegroundColor Yellow
try {
    $statsUrl = "$API_BASE_URL/admin/meeting-stats"
    $stats = Invoke-RestMethod -Uri $statsUrl -Method Get -Headers $headers
    
    Write-Host "Raw stats:" -ForegroundColor Green
    $stats | ConvertTo-Json -Depth 5
    Write-Host ""
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 3: Test public endpoint (no auth)
Write-Host "3. Testing public meetings endpoint (no auth needed)..." -ForegroundColor Yellow
try {
    $publicUrl = "$API_BASE_URL/participant/meetings/available?limit=5"
    $meetings = Invoke-RestMethod -Uri $publicUrl -Method Get
    
    Write-Host "Public endpoint response:" -ForegroundColor Green
    $meetings | ConvertTo-Json -Depth 3
    Write-Host ""
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}
