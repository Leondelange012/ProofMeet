# How to Verify AA Meeting Sync is Working

## Problem
AA meetings are not appearing in ProofMeet, even though the code has been deployed.

## Root Cause Analysis
The Railway logs you provided show **routine operations only**, but no meeting sync activity. This means either:
1. The initial sync hasn't run yet (server was already running when logs captured)
2. The sync failed silently
3. The latest code hasn't been deployed to Railway

## ✅ Solution Steps

### Step 1: Check Railway Deployment Status

1. Go to **Railway dashboard**: https://railway.app
2. Click on your **ProofMeet Backend** service
3. Click on **"Deployments"** tab
4. Look for the most recent deployment

**What to check:**
- Is the latest deployment **"Active"** (green)?
- What commit is it running? Should be `11ac38d` or newer
- Click on the deployment and check "Build Logs" for errors

### Step 2: Get FULL Startup Logs

We need to see the logs from when the server **starts up**, not just runtime logs.

**Option A: Download from Railway Dashboard**
1. Click on your backend service in Railway
2. Click "Deployments" → Latest deployment
3. Click "View Logs"
4. **Scroll to the very top** (or filter by time to deployment start)
5. Look for these messages within the first 2 minutes:
   ```
   🚀 Server running on port 8080
   🚀 Running initial meeting sync on startup...
   🔍 Fetching AA meetings from TSML feeds...
   ✅ Total AA meetings fetched: X
   ✅ Initial sync complete: X meetings saved
   ```

**Option B: Use Railway CLI**
```powershell
# Install Railway CLI if you haven't
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# View logs from the last 30 minutes
railway logs --environment production
```

### Step 3: Manual Sync (RECOMMENDED)

This will force a sync right now and show you the results immediately.

1. **Get your ADMIN_SECRET_KEY from Railway:**
   - Railway dashboard → Backend service → "Variables" tab
   - Copy the value of `ADMIN_SECRET_KEY`

2. **Update the test script:**
   - Open `test-meeting-sync.ps1`
   - Line 5: Replace `REPLACE_WITH_YOUR_ADMIN_SECRET_KEY` with your actual secret

3. **Run the script:**
   ```powershell
   cd C:\Users\leond\OneDrive\Documents\ProofMeet
   .\test-meeting-sync.ps1
   ```

**Expected output:**
```
Step 1: Triggering manual meeting sync...
   ✓ Sync triggered successfully!
   
   Results:
   - Total fetched: 250
   - Saved to DB: 200
   - Already exist: 50
   
   Details by source:
   - AA: 150 meetings  ✓ GREEN (success)
   - NA: 50 meetings
   
Step 2: Checking meeting statistics...
   ✓ Stats retrieved
   
   Total meetings in database: 203
   
   By program:
   - AA: 150 meetings  ✓ GREEN
   - NA: 50 meetings
   - TEST: 3 meetings

Step 3: Searching for meeting 88113069602...
   ✓ FOUND! Meeting 88113069602 exists
   Name: OIAA Meeting
   Program: AA
```

### Step 4: Check Frontend

After sync completes:
1. Go to: https://proof-meet-frontend.vercel.app
2. Login as participant
3. Go to "Meetings" page
4. Select **"AA"** from the Category dropdown
5. You should see AA meetings listed

### Step 5: Search for Specific Meeting

1. In the frontend Meetings page:
2. Enter Zoom Meeting ID: `88113069602`
3. Click "Search"
4. You should see the OIAA meeting appear

## 🚨 Troubleshooting

### If manual sync shows "403 Forbidden"
- Your `ADMIN_SECRET_KEY` in the script is wrong
- Double-check the value in Railway Variables tab

### If manual sync shows "0 AA meetings fetched"
- The CORS proxy might be blocking
- Check Railway logs for error messages like:
  - `❌ OIAA API error:`
  - `⚠️ OIAA: Unexpected response`
- We may need to use a paid proxy service

### If sync succeeds but meetings don't appear in frontend
- Clear browser cache
- Check if frontend is using the correct API URL
- Verify the `/api/participant/meetings/available?program=AA` endpoint returns data

## 📊 What Success Looks Like

**Railway Logs (startup):**
```
🚀 Server running on port 8080
🔍 Fetching AA meetings from TSML feeds...
   📡 Fetching from OIAA (Online Intergroup): https://aa-intergroup.org/...
   📋 Got 100 meetings from OIAA
   ✅ Added 85 unique Zoom meetings from OIAA
   📡 Fetching from NYC AA Intergroup: https://meetings.nyintergroup.org/...
   📋 Got 200 meetings from NYC AA Intergroup
   ✅ Added 150 unique Zoom meetings from NYC AA Intergroup
✅ Total AA meetings fetched: 235 (from TSML feeds)
✅ Initial sync complete: 485 meetings saved
```

**Frontend:**
- AA category shows 200+ meetings
- Search by Zoom ID `88113069602` returns results
- Meetings display with correct names, times, and Zoom links

## Next Steps

Please run **Step 3 (Manual Sync)** and share:
1. The output from `test-meeting-sync.ps1`
2. If it fails, the error message
3. If it succeeds, whether AA meetings now appear in the frontend

This will tell us exactly what's happening!
