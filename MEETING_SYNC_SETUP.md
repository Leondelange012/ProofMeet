# 🔄 Meeting Sync Setup & Testing Guide

## 📋 **Summary of What Was Done**

### ✅ **Meeting Sync Infrastructure (Already Exists)**

Your ProofMeet system has a complete meeting sync infrastructure that was already built:

1. **Meeting Sync Service** (`backend/src/services/meetingSyncService.ts`)
   - Fetches real meetings from AA WordPress TSML feeds (NYC, LA, Chicago, etc.)
   - Fetches NA meetings from BMLT servers
   - Saves to `ExternalMeeting` database table
   - Cleans up old meetings (30+ days)

2. **Automated Daily Sync** (`backend/src/services/cronService.ts`)
   - Runs every day at 2:00 AM automatically
   - Also runs 30 seconds after server startup
   - No manual intervention needed

3. **Admin Endpoint** (`backend/src/routes/admin.ts`)
   - `POST /api/admin/sync-meetings` - Manually trigger sync
   - `GET /api/admin/meeting-stats` - Get meeting statistics
   - `GET /api/admin/test-meeting-apis` - Test API connectivity

### 🔧 **Fixes Applied Today**

1. **Fixed Undefined Constant** - Added `AA_MEETING_GUIDE_API` constant
2. **Enhanced Logging** - Added detailed logging to track sync progress
3. **Better Error Handling** - Each source (AA, NA, SMART) has independent error handling
4. **Admin Response Enhancement** - Includes error details in API response

---

## 🚀 **Next Steps to Enable Real Meetings**

### **Step 1: Set Admin Secret in Railway**

The admin endpoint requires an `ADMIN_SECRET_KEY` environment variable:

1. Go to Railway dashboard: https://railway.app
2. Select your ProofMeet backend project
3. Go to **Variables** tab
4. Add new variable:
   ```
   ADMIN_SECRET_KEY=your-secure-random-secret-here
   ```
   *(Generate a secure random string, e.g., `openssl rand -base64 32`)*

5. Click **Save** - Railway will redeploy automatically

### **Step 2: Trigger Initial Sync**

Once Railway has redeployed with the admin secret, run this PowerShell command:

```powershell
# Set your admin secret
$env:ADMIN_SECRET_KEY = "your-actual-secret-from-railway"

# Run the test script
.\test-meeting-sync.ps1
```

Or use curl:

```bash
curl -X POST \
  -H "X-Admin-Secret: your-actual-secret" \
  https://proofmeet-backend-production.up.railway.app/api/admin/sync-meetings
```

### **Step 3: Check Results**

The sync will return something like:

```json
{
  "success": true,
  "message": "Meeting sync completed successfully",
  "data": {
    "totalFetched": 150,
    "totalSaved": 142,
    "totalCleaned": 5,
    "sources": {
      "aa": 80,
      "na": 40,
      "smart": 0,
      "inTheRooms": 0
    },
    "errors": []
  }
}
```

**Expected Results:**
- **AA meetings**: 50-200 (from TSML WordPress feeds)
- **NA meetings**: 20-100 (from BMLT servers)
- **SMART/ITR**: 0 (not implemented yet)

### **Step 4: Verify in Participant Meetings Page**

1. Go to https://proof-meet-frontend.vercel.app/participant/meetings
2. You should see real AA and NA meetings
3. Test the search filters:
   - Search by Zoom ID
   - Filter by Program (AA, NA)
   - Filter by date
   - Adjust time range slider

---

## 🔍 **Monitoring & Troubleshooting**

### **Check Railway Logs**

After triggering the sync, check Railway logs for detailed output:

```
🔄 ========================================
🔄 Starting daily meeting sync...
🔄 ========================================
📡 Fetching from external sources...
🔍 Fetching AA meetings from TSML WordPress feeds...
   📡 Querying nyintergroup...
   📋 Got 150 meetings from nyintergroup
   ✅ Added 125 unique meetings so far
📊 Fetch results by source:
   AA: 125 meetings
   NA: 42 meetings
   SMART: 0 meetings
   In The Rooms: 0 meetings
📊 Total meetings fetched: 167
💾 Saving meetings to database...
   ✅ Saved 167 meetings
🧹 Cleaning up old meetings...
   ✅ Cleaned up 3 old meetings
🔄 ========================================
✅ Meeting sync complete: 167 saved, 3 cleaned
🔄 ========================================
```

### **If No Meetings Are Fetched**

**Possible Issues:**
1. **CORS Blocking** - External APIs may block requests from Railway servers
2. **Rate Limiting** - APIs may limit request frequency
3. **API Changes** - External APIs may have changed their endpoints/format
4. **Network Timeouts** - Some APIs may be slow to respond

**Solutions:**

#### Option A: Use CORS Proxy (Quick Fix)

If direct API access is blocked, add a CORS proxy:

```typescript
// In meetingSyncService.ts
const CORS_PROXY = 'https://corsproxy.io/?';
const response = await axios.get(`${CORS_PROXY}${feedUrl}`, {...});
```

**Paid CORS Proxies (More Reliable):**
- **cors-anywhere.herokuapp.com** (free, rate limited)
- **allorigins.win** (free, unreliable)
- **ScraperAPI** ($29/month, 100k requests) - https://www.scraperapi.com
- **Bright Data** ($500/month, unlimited) - https://brightdata.com
- **Oxylabs** (enterprise pricing) - https://oxylabs.io

#### Option B: Web Scraping (if APIs fail)

There's already a scraping script: `backend/scripts/sync-aa-intergroup.ts`

Run manually:
```bash
cd backend
npm run ts-node scripts/sync-aa-intergroup.ts
```

This uses Cheerio to parse HTML from aa-intergroup.org

---

## 📊 **How Participants Will Use This**

### **User Flow:**

1. Participant logs in
2. Goes to **Meetings** page
3. Sees search filters:
   - **Zoom Meeting ID**: Search specific meeting
   - **Category**: AA, NA, SMART, etc.
   - **Date**: Filter by day
   - **Time Range**: Slider (e.g., 14:00 - 18:00)
   - **Timezone**: Auto-detects, can override

4. Participant finds a meeting and clicks **"Join Now"**
5. System:
   - Records attendance
   - Tracks activity (mouse, keyboard, camera, microphone)
   - Generates court card at end
   - Calculates compliance score

### **Example Use Cases:**

**Case 1: Court-ordered participant needs AA meeting tonight**
```
- Select timezone: America/New_York
- Select category: AA
- Set time range: 19:00 - 21:00
- Result: 5-10 AA meetings in that time slot
- Click "Join Now" → Attendance tracked automatically
```

**Case 2: Participant has specific Zoom ID from court order**
```
- Enter Zoom ID: 123 456 7890
- Result: Shows that specific meeting
- Click "Join Now" → Verified attendance for court
```

---

## 🔐 **Security Notes**

### **Admin Endpoint Protection**

- All admin endpoints require `X-Admin-Secret` header
- Never expose this secret in frontend code
- Only use it server-side or in secure admin tools
- Rotate the secret periodically

### **Meeting Data Privacy**

- External meeting data is public information
- Zoom URLs are publicly listed by AA/NA organizations
- No personal participant data is shared with external sources
- Attendance records are stored securely with encryption

---

## 📈 **Future Enhancements**

### **Additional Meeting Sources:**

1. **SMART Recovery** - Implement meetings.smartrecovery.org scraper
2. **In The Rooms** - Reverse-engineer mobile app API or scrape schedule page
3. **CMA, OA, GA** - Add Crystal Meth Anonymous, Overeaters Anonymous, Gamblers Anonymous
4. **Local Courts** - Allow courts to provide their own approved meeting lists

### **Advanced Features:**

- **Meeting Recommendations**: Suggest meetings based on past attendance
- **Favorites**: Let participants save favorite meetings
- **Reminders**: Email/SMS reminders for upcoming meetings
- **Recurring Attendance**: Track which meetings participant attends regularly
- **Group Tracking**: Track if participant attends with sponsor/support group

---

## ✅ **Testing Checklist**

Before going live with real meetings:

- [ ] Set `ADMIN_SECRET_KEY` in Railway
- [ ] Trigger manual sync via admin endpoint
- [ ] Verify meetings appear in database (`SELECT COUNT(*) FROM external_meetings;`)
- [ ] Check participant meetings page shows results
- [ ] Test search by Zoom ID
- [ ] Test filter by category (AA, NA)
- [ ] Test date filtering
- [ ] Test time range slider
- [ ] Test timezone conversion
- [ ] Test joining a meeting
- [ ] Verify attendance tracking works
- [ ] Verify court card generation

---

## 📞 **Support**

If you encounter issues:

1. **Check Railway Logs** - Look for sync errors
2. **Check Database** - Verify meetings are being saved
3. **Test API Connectivity** - Use `/api/admin/test-meeting-apis`
4. **Review Error Messages** - Check `errors` array in sync response
5. **Try CORS Proxy** - If direct API access fails

---

## 🎯 **Success Criteria**

Your meeting sync is working when:

✅ Sync returns `totalFetched > 0`  
✅ Database has rows in `external_meetings` table  
✅ Participant meetings page shows results  
✅ Search/filter functions work  
✅ Meetings can be joined via "Join Now" button  
✅ Attendance is tracked for joined meetings  

Once these criteria are met, **participants can attend real AA/NA meetings and receive verified court cards!** 🎉

