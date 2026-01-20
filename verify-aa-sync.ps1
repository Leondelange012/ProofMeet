# PowerShell script to verify AA meetings sync
# Run this after Railway deployment completes

$API_BASE = "https://proofmeet-backend-production.up.railway.app/api"
$FRONTEND = "https://proof-meet-frontend.vercel.app"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "AA MEETING SYNC VERIFICATION" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if backend is responding
Write-Host "Step 1: Checking backend health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/participant/meetings/available?limit=1" -Method Get
    Write-Host "   ✓ Backend is responding" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Backend not responding: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Check AA meeting count
Write-Host ""
Write-Host "Step 2: Checking AA meeting count..." -ForegroundColor Yellow
try {
    $aaMeetings = Invoke-RestMethod -Uri "$API_BASE/participant/meetings/available?program=AA&limit=100" -Method Get
    $count = if ($aaMeetings.data) { $aaMeetings.data.Count } else { 0 }
    
    if ($count -gt 0) {
        Write-Host "   ✓ Found $count AA meetings!" -ForegroundColor Green
        
        # Show first few meeting names
        Write-Host "   📋 Sample meetings:" -ForegroundColor Cyan
        $aaMeetings.data | Select-Object -First 5 | ForEach-Object {
            Write-Host "      - $($_.name) (Zoom ID: $($_.zoomId))" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ✗ No AA meetings found yet" -ForegroundColor Red
        Write-Host "   ℹ️  Sync may still be running or failed. Check Railway logs." -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ Error fetching AA meetings: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Search for specific meeting
Write-Host ""
Write-Host "Step 3: Searching for meeting 88113069602..." -ForegroundColor Yellow
try {
    $specificMeeting = Invoke-RestMethod -Uri "$API_BASE/participant/meetings/available?zoomId=88113069602" -Method Get
    
    if ($specificMeeting.data -and $specificMeeting.data.Count -gt 0) {
        Write-Host "   ✓ Meeting 88113069602 FOUND!" -ForegroundColor Green
        $meeting = $specificMeeting.data[0]
        Write-Host "   📋 Details:" -ForegroundColor Cyan
        Write-Host "      Name: $($meeting.name)" -ForegroundColor Gray
        Write-Host "      Program: $($meeting.program)" -ForegroundColor Gray
        Write-Host "      Time: $($meeting.day) at $($meeting.time)" -ForegroundColor Gray
        Write-Host "      Zoom URL: $($meeting.zoomUrl)" -ForegroundColor Gray
    } else {
        Write-Host "   ✗ Meeting 88113069602 NOT FOUND" -ForegroundColor Red
        Write-Host "   ℹ️  This meeting should be in OIAA feed. Sync may have failed." -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ Error searching for meeting: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Check all meeting categories
Write-Host ""
Write-Host "Step 4: Checking all meeting categories..." -ForegroundColor Yellow
try {
    $allMeetings = Invoke-RestMethod -Uri "$API_BASE/participant/meetings/available?limit=1000" -Method Get
    
    $byProgram = @{}
    foreach ($meeting in $allMeetings.data) {
        $prog = $meeting.program
        if (-not $byProgram.ContainsKey($prog)) {
            $byProgram[$prog] = 0
        }
        $byProgram[$prog]++
    }
    
    Write-Host "   📊 Meetings by program:" -ForegroundColor Cyan
    foreach ($prog in $byProgram.Keys | Sort-Object) {
        $symbol = if ($prog -eq "AA") { "🎯" } else { "📋" }
        Write-Host "      $symbol $prog : $($byProgram[$prog]) meetings" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Error fetching all meetings: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

if ($count -gt 0) {
    Write-Host "✅ SUCCESS! AA meetings are syncing." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Open ProofMeet: $FRONTEND/meetings" -ForegroundColor Cyan
    Write-Host "2. Filter by Program: AA" -ForegroundColor Cyan
    Write-Host "3. Search for meeting ID: 88113069602" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "❌ AA meetings not syncing yet." -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check Railway logs for sync errors" -ForegroundColor Cyan
    Write-Host "2. Manually trigger sync:" -ForegroundColor Cyan
    Write-Host "   Set admin secret: `$env:ADMIN_SECRET_KEY = 'your-secret'" -ForegroundColor Gray
    Write-Host "   Run: .\test-meeting-sync.ps1" -ForegroundColor Gray
    Write-Host "3. Check if CORS proxy is rate limited" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "For detailed logs, download from Railway dashboard." -ForegroundColor Gray
Write-Host ""
