# Simple AA Meeting Sync Test
$API_BASE_URL = "https://proofmeet-backend-production.up.railway.app/api"
$ADMIN_SECRET = "pMU4DZdgIRh5s9oWiHvuKtLaOeVANrB0"

Write-Host "================================"
Write-Host "AA MEETING SYNC TEST"
Write-Host "================================"
Write-Host ""

# Trigger sync
Write-Host "Triggering sync..."
try {
    $headers = @{
        "X-Admin-Secret" = $ADMIN_SECRET
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/admin/sync-meetings" -Method Post -Headers $headers -TimeoutSec 120
    
    Write-Host "SUCCESS! Sync completed" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results:" -ForegroundColor Cyan
    
    if ($response.data) {
        Write-Host "  Total fetched: $($response.data.totalFetched)"
        Write-Host "  Total saved: $($response.data.totalSaved)"
        Write-Host ""
        Write-Host "By source:" -ForegroundColor Cyan
        if ($response.data.sources.aa -ne $null) {
            $aaColor = if ($response.data.sources.aa -gt 0) { "Green" } else { "Red" }
            Write-Host "  AA: $($response.data.sources.aa) meetings" -ForegroundColor $aaColor
        }
        if ($response.data.sources.na -ne $null) {
            Write-Host "  NA: $($response.data.sources.na) meetings"
        }
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "================================"
Write-Host "Complete!"
Write-Host "================================"
