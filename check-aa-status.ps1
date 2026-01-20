# Simple script to check AA meeting status RIGHT NOW
$API_BASE = "https://proofmeet-backend-production.up.railway.app/api"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "CHECKING AA MEETING STATUS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

try {
    # Check backend health
    Write-Host "1. Checking backend health..." -ForegroundColor Yellow
    $healthUrl = $API_BASE + "/participant/meetings/available?limit=1"
    $response = Invoke-RestMethod -Uri $healthUrl -Method Get
    Write-Host "   ✓ Backend is responding" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Backend not responding: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Checking meeting counts by program..." -ForegroundColor Yellow

# Get all meetings and count by program
try {
    $allUrl = $API_BASE + "/participant/meetings/available?limit=500"
    $allMeetings = Invoke-RestMethod -Uri $allUrl -Method Get
    
    $programCounts = @{}
    foreach ($meeting in $allMeetings.data) {
        $prog = $meeting.program
        if ($programCounts.ContainsKey($prog)) {
            $programCounts[$prog]++
        } else {
            $programCounts[$prog] = 1
        }
    }
    
    Write-Host "   Meetings by program:" -ForegroundColor Cyan
    foreach ($prog in $programCounts.Keys | Sort-Object) {
        $count = $programCounts[$prog]
        $color = if ($prog -eq "AA" -and $count -gt 0) { "Green" } elseif ($prog -eq "AA") { "Red" } else { "Gray" }
        $symbol = if ($prog -eq "AA") { ">>>" } else { "  -" }
        Write-Host "      $symbol $prog : $count meetings" -ForegroundColor $color
    }
    
    # Check specifically for AA meetings
    $aaCount = if ($programCounts.ContainsKey("AA")) { $programCounts["AA"] } else { 0 }
    
    Write-Host ""
    if ($aaCount -gt 0) {
        Write-Host "✅ SUCCESS! Found $aaCount AA meetings!" -ForegroundColor Green
        
        # Show sample AA meetings
        Write-Host ""
        Write-Host "Sample AA meetings:" -ForegroundColor Cyan
        $allMeetings.data | Where-Object { $_.program -eq "AA" } | Select-Object -First 5 | ForEach-Object {
            Write-Host "   - $($_.name)" -ForegroundColor Gray
            Write-Host "     Zoom ID: $($_.zoomId), Day: $($_.day), Time: $($_.time)" -ForegroundColor DarkGray
        }
        
        # Test specific meeting search
        Write-Host ""
        Write-Host "3. Searching for meeting 88113069602..." -ForegroundColor Yellow
        $searchUrl = $API_BASE + "/participant/meetings/available?zoomId=88113069602"
        $specificMeeting = Invoke-RestMethod -Uri $searchUrl -Method Get
        
        if ($specificMeeting.data -and $specificMeeting.data.Count -gt 0) {
            Write-Host "   ✓ Meeting 88113069602 FOUND!" -ForegroundColor Green
            $meeting = $specificMeeting.data[0]
            Write-Host "      Name: $($meeting.name)" -ForegroundColor Gray
            Write-Host "      Program: $($meeting.program)" -ForegroundColor Gray
        } else {
            Write-Host "   ✗ Meeting 88113069602 NOT FOUND" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ NO AA MEETINGS FOUND" -ForegroundColor Red
        Write-Host ""
        Write-Host "This means:" -ForegroundColor Yellow
        Write-Host "1. Railway deployment may still be building" -ForegroundColor Cyan
        Write-Host "2. Initial sync hasn't run yet (runs 30s after deployment)" -ForegroundColor Cyan
        Write-Host "3. Sync failed - check Railway logs for errors" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "- Check Railway dashboard: https://railway.app" -ForegroundColor Cyan
        Write-Host "- Download logs and look for:" -ForegroundColor Cyan
        Write-Host "  '🔍 Fetching AA meetings from TSML feeds...'" -ForegroundColor Gray
        Write-Host "  '✅ Total AA meetings fetched: X'" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Check complete at $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
Write-Host ""
