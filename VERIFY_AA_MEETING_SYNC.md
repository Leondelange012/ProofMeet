# Verify AA Meeting Sync

## Problem Summary
Searching for AA meeting ID **88113069602** from `aa-intergroup.org` returned no results in ProofMeet.

## Fixes Applied

### 1. Backend API Missing `zoomId` Field (Commit `07c1861`)
**Issue**: The `/api/participant/meetings/available` endpoint wasn't returning the `zoomId` field, so frontend search couldn't match meetings by Zoom ID.

**Fix**: Added `zoomId: meeting.zoomId` to the response payload in `backend/src/routes/participant.ts`.

### 2. Missing AA Intergroup Source (Commit `a405246`)
**Issue**: The meeting sync service was only querying these AA intergroups:
- NY Intergroup (`nyintergroup.org`)
- LA Intergroup (`lacoaa.org`)
- Chicago AA (`chicagoaa.org`)
- San Francisco AA (`aasf.org`)
- Washington DC AA (`aa-dc.org`)

But the user's meeting (ID 88113069602) is from `aa-intergroup.org`, which wasn't in our sync list.

**Fix**: Added `https://aa-intergroup.org/wp-json/tsml/v1/meetings` to the `TSML_FEEDS` array.

---

## How to Verify the Fixes

### Step 1: Set Up Admin Secret in Railway

1. Go to your Railway project: https://railway.app/project/97a9164d-9cf6-474e-acb5-e1aaccd0f5c0
2. Click on your **backend service**
3. Go to **Variables** tab
4. Verify that `ADMIN_SECRET_KEY` is set
5. If not set, add a new variable:
   - **Key**: `ADMIN_SECRET_KEY`
   - **Value**: A secure random string (e.g., `your-secure-admin-secret-2026`)
6. Redeploy if you added the variable

### Step 2: Manually Trigger Meeting Sync

Open PowerShell and run:

```powershell
# Set your admin secret (from Railway)
$env:ADMIN_SECRET_KEY = "your-secure-admin-secret-2026"

# Trigger sync
$API_BASE_URL = "https://proofmeet-backend-production.up.railway.app/api"
$syncResponse = Invoke-RestMethod -Uri "$API_BASE_URL/admin/sync-meetings" `
    -Method POST `
    -Headers @{ 'x-admin-secret' = $env:ADMIN_SECRET_KEY } `
    -TimeoutSec 120

# Display results
Write-Host "`nSYNC RESULTS:" -ForegroundColor Green
$syncResponse | ConvertTo-Json -Depth 5
```

### Step 3: Check Meeting Statistics

```powershell
$statsResponse = Invoke-RestMethod -Uri "$API_BASE_URL/admin/meeting-stats" `
    -Method GET `
    -Headers @{ 'x-admin-secret' = $env:ADMIN_SECRET_KEY }

Write-Host "`nMEETING STATS:" -ForegroundColor Cyan
$statsResponse | ConvertTo-Json -Depth 3
```

### Step 4: Search for the Meeting in ProofMeet

1. Go to ProofMeet: https://proofmeet.vercel.app/participant/meetings
2. In the **Zoom Meeting ID** search field, enter: `88113069602`
3. Click **Search**
4. The meeting should now appear!

---

## Expected Results

### Successful Sync Response:
```json
{
  "success": true,
  "message": "Meeting sync completed successfully",
  "data": {
    "totalFetched": 150,  // Total meetings fetched from all sources
    "created": 145,        // New meetings added to database
    "updated": 5,          // Existing meetings updated
    "sources": {
      "AA": 120,
      "NA": 30,
      "SMART": 0,
      "InTheRooms": 0
    }
  }
}
```

### Meeting Stats Response:
```json
{
  "success": true,
  "data": {
    "totalMeetings": 145,
    "byProgram": {
      "AA": 120,
      "NA": 25
    },
    "byFormat": {
      "ONLINE": 145,
      "IN_PERSON": 0,
      "HYBRID": 0
    },
    "withZoomUrls": 145,
    "lastSync": "2026-01-19T20:15:00.000Z"
  }
}
```

---

## Troubleshooting

### If `totalFetched: 0` for AA Meetings

This means the AA intergroup APIs are blocking requests. Check Railway logs for errors like:
- `403 Forbidden`
- `CORS error`
- `Timeout`

**Solution**: The CORS proxy is already configured in the code (`https://corsproxy.io/?`). If the free proxy is rate-limited, you can upgrade to a paid proxy:

1. Sign up for ScraperAPI: https://www.scraperapi.com/
2. Get your API key
3. Add to Railway environment variables:
   ```
   CORS_PROXY_URL=https://api.scraperapi.com?api_key=YOUR_KEY&url=
   ```
4. Redeploy backend

### If Meeting Still Not Found

1. **Check if the API endpoint exists**:
   ```powershell
   Invoke-RestMethod -Uri "https://aa-intergroup.org/wp-json/tsml/v1/meetings" -Method GET
   ```
   
   If this returns an error, `aa-intergroup.org` might not use the standard TSML WordPress plugin.

2. **Check the actual meeting page**:
   - Visit: https://aa-intergroup.org/meetings/
   - Find the meeting with ID 88113069602
   - Check if it's listed as an **online Zoom meeting**
   - Our sync only fetches meetings with `conference_url` containing "zoom.us"

3. **Verify the Zoom ID format**:
   - Some meetings use different ID formats
   - Check if the meeting page shows the full Zoom URL (e.g., `https://zoom.us/j/88113069602`)
   - Our sync extracts the numeric ID from the URL

---

## Alternative: Check if aa-intergroup.org Uses Different API

If the TSML API doesn't work, `aa-intergroup.org` might use a different meeting directory system. In that case:

1. Check Railway logs after sync to see the specific error
2. We may need to add a custom scraper for `aa-intergroup.org`
3. Share the error logs and we can implement a custom solution

---

## Contact

If you encounter issues, share:
1. Railway deployment logs (after sync runs)
2. The sync response from the admin endpoint
3. Any error messages

This will help diagnose if:
- The API endpoint is correct
- The CORS proxy is working
- The meeting is being fetched but not saved
- The meeting is saved but not appearing in search
