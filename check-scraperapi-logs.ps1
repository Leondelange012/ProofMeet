# PowerShell script to check if ScraperAPI is working in Railway logs
# This helps diagnose why AA meetings might still be at 0

Write-Host "================================" -ForegroundColor Cyan
Write-Host "SCRAPERAPI DIAGNOSTIC CHECK" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To check if ScraperAPI is working, we need to view Railway logs." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please follow these steps:" -ForegroundColor White
Write-Host ""
Write-Host "1. Go to: https://railway.app" -ForegroundColor Gray
Write-Host "2. Click on your ProofMeet Backend service" -ForegroundColor Gray
Write-Host "3. Click 'View Logs' (top right)" -ForegroundColor Gray
Write-Host "4. Look for these messages:" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ GOOD SIGNS (ScraperAPI working):" -ForegroundColor Green
Write-Host "   - '🔐 Using ScraperAPI to bypass CAPTCHA protection'" -ForegroundColor White
Write-Host "   - '📋 Got [number] meetings from OIAA'" -ForegroundColor White
Write-Host "   - '✅ Added [number] unique Zoom meetings from OIAA'" -ForegroundColor White
Write-Host "   - '✅ Total AA meetings fetched: [number > 0]'" -ForegroundColor White
Write-Host ""

Write-Host "❌ BAD SIGNS (ScraperAPI not working):" -ForegroundColor Red
Write-Host "   - '⚠️ No ScraperAPI key - using free proxy'" -ForegroundColor White
Write-Host "   - '⚠️ Could not find meetings array in response'" -ForegroundColor White
Write-Host "   - '✅ Total AA meetings fetched: 0'" -ForegroundColor White
Write-Host "   - 'CAPTCHA' or 'challenge' in the logs'" -ForegroundColor White
Write-Host ""

Write-Host "5. Search the logs for 'ScraperAPI' or 'OIAA'" -ForegroundColor Gray
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "ALTERNATIVE: Download full logs" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you want detailed analysis:" -ForegroundColor White
Write-Host "1. In Railway logs view, click 'Download' (top right)" -ForegroundColor Gray
Write-Host "2. Save the .json file" -ForegroundColor Gray
Write-Host "3. Share the file for detailed analysis" -ForegroundColor Gray
Write-Host ""

# Try to trigger a new sync to generate fresh logs
Write-Host "================================" -ForegroundColor Cyan
Write-Host "TRIGGERING NEW SYNC FOR TESTING" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$API_BASE_URL = "https://proofmeet-backend-production.up.railway.app/api"
$ADMIN_SECRET = "pMU4DZdgIRh5s9oWiHvuKtLaOeVANrB0"

Write-Host "Triggering meeting sync..." -ForegroundColor Yellow
try {
    $headers = @{
        "X-Admin-Secret" = $ADMIN_SECRET
        "Content-Type" = "application/json"
    }
    
    $syncUrl = "$API_BASE_URL/admin/sync-meetings"
    $response = Invoke-RestMethod -Uri $syncUrl -Method Post -Headers $headers -TimeoutSec 120
    
    if ($response.success -and $response.data.sources.aa -gt 0) {
        Write-Host "✅ SUCCESS! AA meetings found: $($response.data.sources.aa)" -ForegroundColor Green
        Write-Host ""
        Write-Host "AA meetings are now syncing successfully!" -ForegroundColor Green
    } elseif ($response.success -and $response.data.sources.aa -eq 0) {
        Write-Host "⚠️  Sync completed but AA meetings still at 0" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "This means:" -ForegroundColor Yellow
        Write-Host "  1. ScraperAPI key might not be loaded yet (check Railway Variables)" -ForegroundColor White
        Write-Host "  2. Railway might not have finished deploying" -ForegroundColor White
        Write-Host "  3. There might be an issue with the ScraperAPI integration" -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  - Check Railway logs for 'ScraperAPI' messages" -ForegroundColor White
        Write-Host "  - Verify SCRAPERAPI_KEY variable is set in Railway" -ForegroundColor White
        Write-Host "  - Wait 5 more minutes and try again (deployment might be slow)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Full results:" -ForegroundColor Cyan
    Write-Host "  - Total fetched: $($response.data.totalFetched)" -ForegroundColor Gray
    Write-Host "  - AA: $($response.data.sources.aa)" -ForegroundColor $(if ($response.data.sources.aa -gt 0) { "Green" } else { "Red" })
    Write-Host "  - NA: $($response.data.sources.na)" -ForegroundColor Gray
    Write-Host "  - Total in DB: $($response.data.totalSaved)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
