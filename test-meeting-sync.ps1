# Test Meeting Sync Script (PowerShell)
# This script triggers a manual meeting sync and displays the results

$API_URL = "https://proofmeet-backend-production.up.railway.app"
$ADMIN_SECRET = $env:ADMIN_SECRET_KEY
if (-not $ADMIN_SECRET) {
    $ADMIN_SECRET = Read-Host "Enter your ADMIN_SECRET_KEY"
}

Write-Host "🔄 Triggering meeting sync..." -ForegroundColor Cyan
Write-Host "API: $API_URL/api/admin/sync-meetings" -ForegroundColor Gray
Write-Host ""

try {
    # Trigger sync
    $headers = @{
        "X-Admin-Secret" = $ADMIN_SECRET
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod `
        -Method Post `
        -Uri "$API_URL/api/admin/sync-meetings" `
        -Headers $headers
    
    Write-Host "📊 Sync Results:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    Write-Host ""
    Write-Host "✅ Check Railway logs for detailed sync progress" -ForegroundColor Green
    Write-Host ""
    
    # Get meeting stats
    Write-Host "📈 Meeting Statistics:" -ForegroundColor Cyan
    $stats = Invoke-RestMethod `
        -Method Get `
        -Uri "$API_URL/api/admin/meeting-stats" `
        -Headers $headers
    
    $stats | ConvertTo-Json -Depth 10 | Write-Host
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
