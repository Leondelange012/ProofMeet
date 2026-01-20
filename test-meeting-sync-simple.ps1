# PowerShell script to manually trigger meeting sync and check results
# Updated for Railway backend

$API_BASE_URL = "https://proofmeet-backend-production.up.railway.app/api"
$ADMIN_SECRET = "pMU4DZdgIRh5s9oWiHvuKtLaOeVANrB0"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "MANUAL MEETING SYNC TRIGGER" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if admin secret is set
if ($ADMIN_SECRET -eq "REPLACE_WITH_YOUR_ADMIN_SECRET_KEY") {
    Write-Host "ERROR: You need to update ADMIN_SECRET in this script!" -ForegroundColor Red
    exit 1
}

# Step 2: Trigger manual sync
Write-Host "Step 1: Triggering manual meeting sync..." -ForegroundColor Yellow
try {
    $headers = @{
        "X-Admin-Secret" = $ADMIN_SECRET
        "Content-Type" = "application/json"
    }
    
    $syncUrl = "$API_BASE_URL/admin/sync-meetings"
    Write-Host "   Calling: $syncUrl" -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $syncUrl -Method Post -Headers $headers -TimeoutSec 120
    
    if ($response.success) {
        Write-Host "   [SUCCESS] Sync triggered successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Results:" -ForegroundColor Cyan
        Write-Host "   - Total fetched: $($response.totalFetched)" -ForegroundColor White
        Write-Host "   - Saved to DB: $($response.saved)" -ForegroundColor White
        Write-Host "   - Already exist: $($response.duplicates)" -ForegroundColor White
        
        # Check for AA meetings specifically
        if ($response.details) {
            Write-Host ""
            Write-Host "   Details by source:" -ForegroundColor Cyan
            if ($response.details.aa) {
                Write-Host "   - AA: $($response.details.aa) meetings" -ForegroundColor $(if ($response.details.aa -gt 0) { "Green" } else { "Red" })
            }
            if ($response.details.na) {
                Write-Host "   - NA: $($response.details.na) meetings" -ForegroundColor Gray
            }
            if ($response.details.smart) {
                Write-Host "   - SMART: $($response.details.smart) meetings" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "   [ERROR] Sync failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host ""
        Write-Host "   403 Forbidden - Your ADMIN_SECRET_KEY is incorrect!" -ForegroundColor Yellow
        Write-Host "   Please double-check the value in Railway Variables tab." -ForegroundColor Yellow
    }
    exit 1
}

# Step 3: Check meeting stats
Write-Host ""
Write-Host "Step 2: Checking meeting statistics..." -ForegroundColor Yellow
try {
    $statsUrl = "$API_BASE_URL/admin/meeting-stats"
    $stats = Invoke-RestMethod -Uri $statsUrl -Method Get -Headers $headers
    
    Write-Host "   [SUCCESS] Stats retrieved" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Total meetings in database: $($stats.total)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   By program:" -ForegroundColor Cyan
    foreach ($prog in $stats.byProgram.PSObject.Properties) {
        $count = $prog.Value
        $color = if ($prog.Name -eq "AA" -and $count -gt 0) { "Green" } elseif ($prog.Name -eq "AA") { "Red" } else { "Gray" }
        Write-Host "   - $($prog.Name): $count meetings" -ForegroundColor $color
    }
} catch {
    Write-Host "   [ERROR] getting stats: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Test specific meeting search
Write-Host ""
Write-Host "Step 3: Searching for meeting 88113069602..." -ForegroundColor Yellow
try {
    $searchUrl = "$API_BASE_URL/participant/meetings/available?zoomId=88113069602"
    $searchResult = Invoke-RestMethod -Uri $searchUrl -Method Get
    
    if ($searchResult.data -and $searchResult.data.Count -gt 0) {
        Write-Host "   [FOUND] Meeting 88113069602 exists!" -ForegroundColor Green
        Write-Host "   Name: $($searchResult.data[0].name)" -ForegroundColor White
        Write-Host "   Program: $($searchResult.data[0].program)" -ForegroundColor White
    } else {
        Write-Host "   [NOT FOUND] Meeting 88113069602 not in database" -ForegroundColor Red
    }
} catch {
    Write-Host "   [ERROR] searching: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
