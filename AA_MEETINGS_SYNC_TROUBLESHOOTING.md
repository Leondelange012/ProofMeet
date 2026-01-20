# AA Meetings Sync Troubleshooting

## Issue
AA meetings (specifically meeting ID `88113069602` from aa-intergroup.org) are not appearing in ProofMeet search after deployment.

## What Should Be Happening

1. **Automatic Sync on Startup:**
   - When Railway deploys, `backend/src/index.ts` line 164 calls `initializeCronJobs(true)`
   - The `true` parameter triggers an immediate sync on startup
   - This should fetch meetings from:
     - Official AA Meeting Guide API (`https://aaMeetingGuide.org/api/v2/meetings`)
     - OIAA API (`https://aa-intergroup.org/wp-json/tsml/v1/meetings`)
     - NA BMLT servers
     - SMART Recovery
     - In The Rooms

2. **Daily Automatic Sync:**
   - Cron job runs daily at 2:00 AM UTC
   - Fetches fresh meeting data from all sources

3. **Manual Sync:**
   - Admin endpoint: `POST /api/admin/sync-meetings`
   - Requires `X-Admin-Secret` header with `ADMIN_SECRET_KEY` from Railway

## Troubleshooting Steps

### Step 1: Check Railway Application Logs

1. Go to Railway dashboard: https://railway.app
2. Select your ProofMeet backend service
3. Click "Deployments" → Latest deployment
4. Click "View Logs"
5. Look for these log messages after deployment:

```
✅ Cron jobs initialized
🔄 Running initial meeting sync on startup...
🔍 Fetching AA meetings from Official Meeting Guide API...
📋 Got X meetings from Official AA Meeting Guide API
🔍 Fetching AA meetings from OIAA (aa-intergroup.org)...
📋 Got X meetings from OIAA
✅ Total OIAA meetings fetched: X
✅ Total AA meetings fetched: X
✅ Meeting sync completed: totalFetched=X, saved=X
```

**If you DON'T see these logs:**
- The automatic sync failed to start
- Check for error messages in the logs

**If you see these logs with `totalFetched=0`:**
- The APIs are being blocked
- CORS proxy might not be working
- Check for error messages about HTTP 403, 404, or timeout errors

### Step 2: Check Environment Variables in Railway

1. Go to Railway dashboard
2. Click "Variables" tab
3. Verify these are set:
   - `ADMIN_SECRET_KEY` (required for manual sync)
   - `CORS_PROXY_URL` (optional, for bypassing API blocks)
   - `DATABASE_URL` (should be auto-set by Railway)
   - `JWT_SECRET` (required for auth)

### Step 3: Manually Trigger Sync

**Method A: Using PowerShell Script**

```powershell
# Set your admin secret from Railway
$env:ADMIN_SECRET_KEY = "your-actual-secret-from-railway"

# Run the sync script
.\test-meeting-sync.ps1
```

**Method B: Using curl (Windows PowerShell)**

```powershell
$adminSecret = "your-actual-secret-from-railway"
$apiUrl = "https://proofmeet-backend-production.up.railway.app/api/admin/sync-meetings"

# Trigger sync
$headers = @{
    "X-Admin-Secret" = $adminSecret
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Method Post -Uri $apiUrl -Headers $headers
$response | ConvertTo-Json -Depth 10

# Check stats
$statsUrl = "https://proofmeet-backend-production.up.railway.app/api/admin/meeting-stats"
$stats = Invoke-RestMethod -Method Get -Uri $statsUrl -Headers $headers
$stats | ConvertTo-Json -Depth 10
```

### Step 4: Verify Meeting Data in Database

After a successful sync, check meeting stats:

```powershell
# Using the stats endpoint
$statsUrl = "https://proofmeet-backend-production.up.railway.app/api/admin/meeting-stats"
$headers = @{ "X-Admin-Secret" = "your-secret" }
$stats = Invoke-RestMethod -Method Get -Uri $statsUrl -Headers $headers
$stats
```

Expected output:
```json
{
  "success": true,
  "stats": {
    "totalMeetings": 150,
    "byProgram": {
      "AA": 80,
      "NA": 50,
      "SMART": 10,
      "TEST": 10
    },
    "byFormat": {
      "ONLINE": 140,
      "IN_PERSON": 5,
      "HYBRID": 5
    }
  }
}
```

### Step 5: Search for Specific Meeting

After sync, test searching for meeting ID `88113069602`:

1. Go to: https://proof-meet-frontend.vercel.app/meetings
2. Enter `88113069602` in the Zoom Meeting ID field
3. Click "Search"

**If still not found:**
- Check Railway logs during sync for OIAA-specific errors
- Verify the meeting exists on aa-intergroup.org
- Check if the meeting has a valid Zoom URL

## Common Issues and Solutions

### Issue: "Invalid admin secret" (403 error)

**Solution:**
- Check `ADMIN_SECRET_KEY` in Railway environment variables
- Make sure you're using the correct value in your request
- The secret is case-sensitive

### Issue: "totalFetched: 0" in sync logs

**Solution:**
- APIs are being blocked
- Try adding a CORS proxy:
  1. Sign up for ScraperAPI: https://www.scraperapi.com (1000 free requests/month)
  2. Add to Railway environment variables:
     ```
     CORS_PROXY_URL=https://api.scraperapi.com?api_key=YOUR_KEY&url=
     ```
  3. Trigger sync again

### Issue: "Cannot find meeting 88113069602"

**Possible causes:**
1. Meeting doesn't have a Zoom URL on aa-intergroup.org
2. Meeting sync filtered it out (not online)
3. Zoom ID extraction failed

**Solution:**
- Check the meeting details on https://aa-intergroup.org/meetings/88113069602/
- Verify it has a valid `zoom.us` URL
- Check Railway logs for "Added X online meetings from OIAA"

### Issue: Automatic sync not running on startup

**Solution:**
- Redeploy on Railway:
  ```bash
  git commit --allow-empty -m "Trigger Railway redeploy"
  git push origin main
  ```
- Check Railway logs after deployment

## Testing the API Directly

### Test AA Meeting Guide API

```powershell
$url = "https://aaMeetingGuide.org/api/v2/meetings?per_page=10"
Invoke-RestMethod -Uri $url
```

### Test OIAA API (with proxy)

```powershell
$proxyUrl = "https://corsproxy.io/"
$oiaaUrl = "https://aa-intergroup.org/wp-json/tsml/v1/meetings?per_page=10&types=ONL"
$fullUrl = $proxyUrl + [System.Web.HttpUtility]::UrlEncode($oiaaUrl)
Invoke-RestMethod -Uri $fullUrl
```

## Next Steps

1. Check Railway logs first (most important)
2. If no sync logs, redeploy
3. If sync ran but totalFetched=0, add CORS proxy
4. If sync succeeded but meeting not found, check meeting details on aa-intergroup.org
5. Report findings for further investigation

## Contact

If you're still experiencing issues after these steps, please share:
- Railway application logs (especially the meeting sync section)
- Meeting stats API response
- The specific meeting URL from aa-intergroup.org
