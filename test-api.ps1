# ProofMeet API Testing Script
# This script tests the ProofMeet API endpoints

$baseUrl = "http://localhost:5000"
$apiUrl = "$baseUrl/api"

Write-Host "🚀 ProofMeet API Testing Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Function to make API calls and handle responses
function Test-ApiEndpoint {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = @{},
        [hashtable]$Headers = @{},
        [string]$TestName
    )
    
    Write-Host "`n📋 Testing: $TestName" -ForegroundColor Yellow
    
    try {
        $requestParams = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
        }
        
        if ($Body.Count -gt 0) {
            $requestParams.Body = ($Body | ConvertTo-Json)
            $requestParams.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @requestParams
        Write-Host "✅ SUCCESS: $TestName" -ForegroundColor Green
        Write-Host "   Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        return $response
    }
    catch {
        Write-Host "❌ FAILED: $TestName" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode
            Write-Host "   Status Code: $statusCode" -ForegroundColor Red
        }
        return $null
    }
}

# Test 1: Health Check
$healthResponse = Test-ApiEndpoint -Url "$baseUrl/health" -TestName "Health Check"

if (-not $healthResponse) {
    Write-Host "`n❌ Backend is not running. Please start the backend service first." -ForegroundColor Red
    Write-Host "   Run: docker-compose up backend -d" -ForegroundColor Yellow
    exit 1
}

# Test 2: User Registration
$userData = @{
    email = "participant1@example.com"
    courtId = "CA-12345"
    state = "CA"
    courtCaseNumber = "CASE-2024-001"
}

$registerResponse = Test-ApiEndpoint -Url "$apiUrl/auth/register" -Method "POST" -Body $userData -TestName "User Registration"

# Test 3: User Verification (simulate court verification)
if ($registerResponse) {
    $verifyData = @{
        email = "participant1@example.com"
        verified = $true
    }
    
    $verifyResponse = Test-ApiEndpoint -Url "$apiUrl/auth/verify" -Method "POST" -Body $verifyData -TestName "User Verification"
}

# Test 4: User Login
$loginData = @{
    email = "participant1@example.com"
}

$loginResponse = Test-ApiEndpoint -Url "$apiUrl/auth/login" -Method "POST" -Body $loginData -TestName "User Login"

$authToken = $null
if ($loginResponse -and $loginResponse.data -and $loginResponse.data.token) {
    $authToken = $loginResponse.data.token
    Write-Host "🔑 Auth token received: $($authToken.Substring(0, 20))..." -ForegroundColor Green
}

# Test 5: Register a Host User
$hostData = @{
    email = "host1@example.com"
    courtId = "CA-HOST-001"
    state = "CA"
    courtCaseNumber = "HOST-2024-001"
}

$hostRegisterResponse = Test-ApiEndpoint -Url "$apiUrl/auth/register" -Method "POST" -Body $hostData -TestName "Host Registration"

# Verify host
if ($hostRegisterResponse) {
    $hostVerifyData = @{
        email = "host1@example.com"
        verified = $true
    }
    
    Test-ApiEndpoint -Url "$apiUrl/auth/verify" -Method "POST" -Body $hostVerifyData -TestName "Host Verification"
}

# Login host
$hostLoginData = @{
    email = "host1@example.com"
}

$hostLoginResponse = Test-ApiEndpoint -Url "$apiUrl/auth/login" -Method "POST" -Body $hostLoginData -TestName "Host Login"

$hostToken = $null
if ($hostLoginResponse -and $hostLoginResponse.data -and $hostLoginResponse.data.token) {
    $hostToken = $hostLoginResponse.data.token
}

# Test 6: Create Meeting (requires host token)
if ($hostToken) {
    $meetingData = @{
        meetingType = "AA"
        meetingFormat = "online"
        scheduledStart = (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ")
        scheduledEnd = (Get-Date).AddHours(3).ToString("yyyy-MM-ddTHH:mm:ssZ")
        zoomMeetingId = "123456789"
    }
    
    $headers = @{
        Authorization = "Bearer $hostToken"
    }
    
    $meetingResponse = Test-ApiEndpoint -Url "$apiUrl/meetings/create" -Method "POST" -Body $meetingData -Headers $headers -TestName "Meeting Creation"
    
    # Test 7: Generate QR Code for In-Person Meeting
    $inPersonMeetingData = @{
        meetingType = "NA"
        meetingFormat = "in-person"
        scheduledStart = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
        scheduledEnd = (Get-Date).AddDays(1).AddHours(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
        location = "Community Center, Room 101"
    }
    
    $inPersonMeetingResponse = Test-ApiEndpoint -Url "$apiUrl/meetings/create" -Method "POST" -Body $inPersonMeetingData -Headers $headers -TestName "In-Person Meeting Creation"
    
    if ($inPersonMeetingResponse -and $inPersonMeetingResponse.data) {
        $qrData = @{
            meetingId = $inPersonMeetingResponse.data.id
        }
        
        Test-ApiEndpoint -Url "$apiUrl/qr/generate" -Method "POST" -Body $qrData -TestName "QR Code Generation"
    }
}

# Test 8: Attendance Flow (if we have both tokens and a meeting)
if ($authToken -and $meetingResponse -and $meetingResponse.data) {
    $joinData = @{
        meetingId = $meetingResponse.data.id
        userId = $loginResponse.data.user.id
    }
    
    $headers = @{
        Authorization = "Bearer $authToken"
    }
    
    $joinResponse = Test-ApiEndpoint -Url "$apiUrl/attendance/join" -Method "POST" -Body $joinData -Headers $headers -TestName "Join Meeting"
    
    if ($joinResponse -and $joinResponse.data) {
        # Wait a moment, then leave
        Start-Sleep -Seconds 2
        
        $leaveData = @{
            attendanceId = $joinResponse.data.id
        }
        
        Test-ApiEndpoint -Url "$apiUrl/attendance/leave" -Method "POST" -Body $leaveData -Headers $headers -TestName "Leave Meeting"
    }
}

# Summary
Write-Host "`n🏁 Testing Complete!" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

if ($healthResponse) {
    Write-Host "✅ Backend is running and responding" -ForegroundColor Green
} else {
    Write-Host "❌ Backend is not accessible" -ForegroundColor Red
}

if ($authToken) {
    Write-Host "✅ Authentication system is working" -ForegroundColor Green
} else {
    Write-Host "❌ Authentication system has issues" -ForegroundColor Red
}

if ($meetingResponse) {
    Write-Host "✅ Meeting system is working" -ForegroundColor Green
} else {
    Write-Host "❌ Meeting system has issues" -ForegroundColor Red
}

Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. If backend tests failed, start the backend: 'cd backend && npm run dev'" -ForegroundColor Gray
Write-Host "2. If tests passed, start the frontend: 'cd frontend && npm run dev'" -ForegroundColor Gray
Write-Host "3. Open http://localhost:3000 in your browser" -ForegroundColor Gray
Write-Host "4. Test the UI with the registered users:" -ForegroundColor Gray
Write-Host "   - participant1@example.com (participant)" -ForegroundColor Gray
Write-Host "   - host1@example.com (host)" -ForegroundColor Gray

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
