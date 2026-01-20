# PowerShell script to monitor AA meeting sync in real-time
# Automatically checks every 30 seconds until AA meetings appear

$API_BASE = "https://proofmeet-backend-production.up.railway.app/api"
$MAX_ATTEMPTS = 20  # 10 minutes (20 * 30 seconds)
$SLEEP_SECONDS = 30

Write-Host "================================" -ForegroundColor Cyan
Write-Host "AA MEETING SYNC MONITOR" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Checking every $SLEEP_SECONDS seconds for up to 10 minutes..." -ForegroundColor Yellow
Write-Host ""

$attempt = 0
$found = $false

while ($attempt -lt $MAX_ATTEMPTS -and -not $found) {
    $attempt++
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    Write-Host "[$timestamp] Attempt $attempt/$MAX_ATTEMPTS..." -ForegroundColor Gray
    
    try {
        # Check backend health
        $response = Invoke-RestMethod -Uri "$API_BASE/participant/meetings/available?limit=1" -Method Get -ErrorAction Stop
        Write-Host "   ✓ Backend is responding" -ForegroundColor Green
        
        # Check AA meeting count
        $aaMeetings = Invoke-RestMethod -Uri ($API_BASE + "/participant/meetings/available?program=AA&limit=100") -Method Get -ErrorAction Stop
        $aaCount = if ($aaMeetings.data) { $aaMeetings.data.Count } else { 0 }
        
        # Check NA meeting count for comparison
        $naMeetings = Invoke-RestMethod -Uri ($API_BASE + "/participant/meetings/available?program=NA&limit=100") -Method Get -ErrorAction Stop
        $naCount = if ($naMeetings.data) { $naMeetings.data.Count } else { 0 }
        
        # Check TEST meeting count
        $testMeetings = Invoke-RestMethod -Uri ($API_BASE + "/participant/meetings/available?program=TEST&limit=100") -Method Get -ErrorAction Stop
        $testCount = if ($testMeetings.data) { $testMeetings.data.Count } else { 0 }
        
        Write-Host "   📊 Meeting counts:" -ForegroundColor Cyan
        Write-Host "      AA   : $aaCount meetings" -ForegroundColor $(if ($aaCount -gt 0) { "Green" } else { "Yellow" })
        Write-Host "      NA   : $naCount meetings" -ForegroundColor Gray
        Write-Host "      TEST : $testCount meetings" -ForegroundColor Gray
        
        if ($aaCount -gt 0) {
            Write-Host ""
            Write-Host "🎉 SUCCESS! AA meetings found!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Sample AA meetings:" -ForegroundColor Cyan
            $aaMeetings.data | Select-Object -First 5 | ForEach-Object {
                Write-Host "   - $($_.name)" -ForegroundColor Gray
                Write-Host "     Zoom ID: $($_.zoomId)" -ForegroundColor DarkGray
            }
            
            # Test specific meeting search
            Write-Host ""
            Write-Host "Testing search for meeting 88113069602..." -ForegroundColor Yellow
            try {
                $specificMeeting = Invoke-RestMethod -Uri ($API_BASE + "/participant/meetings/available?zoomId=88113069602") -Method Get -ErrorAction Stop
                if ($specificMeeting.data -and $specificMeeting.data.Count -gt 0) {
                    Write-Host "   ✓ Meeting 88113069602 FOUND!" -ForegroundColor Green
                } else {
                    Write-Host "   ✗ Meeting 88113069602 NOT FOUND (but other AA meetings exist)" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "   ✗ Search failed: $($_.Exception.Message)" -ForegroundColor Red
            }
            
            $found = $true
        } else {
            Write-Host "   ⚠️  No AA meetings yet. Waiting..." -ForegroundColor Yellow
            
            if ($attempt -lt $MAX_ATTEMPTS) {
                Write-Host ""
                Write-Host "   Next check in $SLEEP_SECONDS seconds..." -ForegroundColor DarkGray
                Start-Sleep -Seconds $SLEEP_SECONDS
            }
        }
        
    } catch {
        Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($attempt -lt $MAX_ATTEMPTS) {
            Write-Host "   Retrying in $SLEEP_SECONDS seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds $SLEEP_SECONDS
        }
    }
    
    Write-Host ""
}

if (-not $found) {
    Write-Host "================================" -ForegroundColor Red
    Write-Host "⚠️  TIMEOUT: AA meetings not found after 10 minutes" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "1. Railway deployment still building (check Railway dashboard)" -ForegroundColor Cyan
    Write-Host "2. Initial sync hasn't run yet (runs 30s after deployment)" -ForegroundColor Cyan
    Write-Host "3. CORS proxy is blocking requests" -ForegroundColor Cyan
    Write-Host "4. AA TSML feeds are down or changed format" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Download Railway logs and check for sync errors" -ForegroundColor Cyan
    Write-Host "2. Look for '🔍 Fetching AA meetings from TSML feeds...' in logs" -ForegroundColor Cyan
    Write-Host "3. Check if sync is actually running: '✅ Initial sync complete: X meetings saved'" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "Monitor stopped at $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
