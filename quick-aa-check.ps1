$API = "https://proofmeet-backend-production.up.railway.app/api"

Write-Host "Checking AA meetings..." -ForegroundColor Cyan
Write-Host ""

$url = $API + "/participant/meetings/available?limit=500"
$result = Invoke-RestMethod -Uri $url

$aaMeetings = $result.data | Where-Object { $_.program -eq "AA" }
$naMeetings = $result.data | Where-Object { $_.program -eq "NA" }
$testMeetings = $result.data | Where-Object { $_.program -eq "TEST" }

Write-Host "Meeting counts:" -ForegroundColor Yellow
Write-Host "  AA   : $($aaMeetings.Count)" -ForegroundColor $(if ($aaMeetings.Count -gt 0) { "Green" } else { "Red" })
Write-Host "  NA   : $($naMeetings.Count)" -ForegroundColor Gray
Write-Host "  TEST : $($testMeetings.Count)" -ForegroundColor Gray
Write-Host ""

if ($aaMeetings.Count -gt 0) {
    Write-Host "SUCCESS! AA meetings found:" -ForegroundColor Green
    $aaMeetings | Select-Object -First 5 | ForEach-Object {
        Write-Host "  - $($_.name) (Zoom: $($_.zoomId))" -ForegroundColor Gray
    }
} else {
    Write-Host "NO AA MEETINGS - Check Railway logs for sync errors" -ForegroundColor Red
}
