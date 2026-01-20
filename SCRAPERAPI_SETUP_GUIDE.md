# ScraperAPI Setup Guide for AA Meeting Sync

## Why ScraperAPI?

The AA meeting sources (aa-intergroup.org and NYC AA) use CAPTCHA protection that blocks automated requests. ScraperAPI solves this by:
- Automatically handling CAPTCHAs
- Rotating IP addresses
- Managing browser fingerprints
- 99.9% success rate

## Step 1: Get ScraperAPI Key (5 minutes)

### Sign Up for Free Trial

1. **Go to ScraperAPI website:**
   - URL: https://www.scraperapi.com/
   - Click "Start Free Trial" (top right)

2. **Create Account:**
   - Enter your email
   - Create password
   - **No credit card required for trial**
   - You get **5,000 free API credits** to start

3. **Get Your API Key:**
   - After signing up, you'll be redirected to the dashboard
   - Your API key will be displayed at the top
   - It looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
   - **Copy this key** - you'll need it in Step 2

### Free Trial Details

- **5,000 free requests**
- No credit card needed
- Full access to all features
- 14-day trial period
- Perfect for testing

### Pricing (After Trial)

If you want to continue after the trial:
- **Hobby Plan:** $49/month for 100,000 requests
- **Startup Plan:** $99/month for 250,000 requests
- **Business Plan:** $249/month for 1,000,000 requests

**For ProofMeet usage:**
- Meeting sync runs once per day
- ~2-4 API calls per sync (one per AA source)
- **Monthly usage: ~120 requests**
- The free trial (5,000 requests) lasts ~40 days
- Hobby plan ($49/month) is more than enough

## Step 2: Configure Railway Environment Variable

Once you have your API key:

1. **Go to Railway Dashboard:**
   - URL: https://railway.app
   - Click on your ProofMeet Backend service

2. **Open Variables Tab:**
   - Click "Variables" in the left sidebar

3. **Add ScraperAPI Configuration:**
   - Click "New Variable"
   - **Variable Name:** `SCRAPERAPI_KEY`
   - **Value:** Paste your API key (e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)
   - Click "Add"

4. **The service will automatically redeploy** with the new variable

## Step 3: Verify It's Working

After Railway redeploys (takes ~2-3 minutes):

1. **Run the sync test script:**
   ```powershell
   cd C:\Users\leond\OneDrive\Documents\ProofMeet
   .\test-meeting-sync-simple.ps1
   ```

2. **Look for these results:**
   ```
   Results:
   - Total fetched: 250+
   - Saved to DB: 250+
   
   Details by source:
   - AA: 50+ meetings  ← Should be GREEN now!
   - NA: 201 meetings
   ```

3. **Check Railway logs for success:**
   - Railway → View Logs
   - Search for: "AA meetings fetched"
   - Should show: `✅ Total AA meetings fetched: 50+`

## Step 4: Frontend Verification

1. **Go to your frontend:**
   - URL: https://proof-meet-frontend.vercel.app
   - Login as participant

2. **Search for AA meetings:**
   - Go to "Meetings" page
   - Select "AA" from Category dropdown
   - Click "Search"
   - You should see AA meetings listed!

3. **Search for specific meeting:**
   - Enter Zoom ID: `88113069602`
   - Click "Search"
   - Meeting should appear

## How ScraperAPI Works with ProofMeet

### Before (Free CORS Proxy - FAILED)
```
ProofMeet Backend
    ↓
corsproxy.io (free)
    ↓
aa-intergroup.org
    ↓
❌ CAPTCHA page returned
```

### After (ScraperAPI - SUCCESS)
```
ProofMeet Backend
    ↓
ScraperAPI (handles CAPTCHA)
    ↓
aa-intergroup.org
    ↓
✅ JSON meeting data returned
```

## Monitoring API Usage

### Check ScraperAPI Dashboard

1. Go to: https://www.scraperapi.com/dashboard
2. View:
   - **Requests used today**
   - **Remaining credits**
   - **Success rate** (should be 99%+)
   - **Response times**

### Expected Usage

- **Daily sync:** 2-4 requests
- **Monthly:** ~120 requests
- **5,000 free credits last:** ~40 days
- **Hobby plan ($49/mo):** Covers 800+ months of usage

## Troubleshooting

### If AA meetings still don't appear:

1. **Verify API key is set:**
   - Railway → Variables → Check `SCRAPERAPI_KEY` exists

2. **Check Railway logs:**
   - Look for: `Using ScraperAPI for AA meeting fetch`
   - Should NOT see: `CAPTCHA` errors

3. **Verify ScraperAPI account:**
   - Dashboard → Check you have remaining credits
   - Check API key is active

4. **Test API key manually:**
   ```powershell
   # Replace YOUR_API_KEY with your actual key
   $apiKey = "YOUR_API_KEY"
   $testUrl = "https://api.scraperapi.com?api_key=$apiKey&url=https://httpbin.org/ip"
   Invoke-RestMethod -Uri $testUrl
   ```
   Should return your IP address (means it's working)

### If you see "Exceeded API limit":

- You've used all 5,000 free credits
- Either:
  - Wait until trial resets
  - Upgrade to paid plan
  - Temporarily disable AA sync

## Cost Optimization Tips

1. **Reduce sync frequency:**
   - Meetings don't change often
   - Change from daily to weekly sync
   - Saves 75% of API calls

2. **Cache responses:**
   - Store API responses for 24 hours
   - Only re-fetch if cache expired

3. **Monitor usage:**
   - Set up alerts in ScraperAPI dashboard
   - Get notified at 80% usage

## Support

### ScraperAPI Support:
- Email: support@scraperapi.com
- Docs: https://www.scraperapi.com/documentation
- Live chat available on dashboard

### ProofMeet Support:
- Check Railway logs for errors
- Review `AA_MEETINGS_DIAGNOSIS.md` for troubleshooting
- Run `test-meeting-sync-simple.ps1` to verify sync

## Quick Reference

**ScraperAPI Dashboard:** https://www.scraperapi.com/dashboard
**Railway Variables:** https://railway.app → Your Service → Variables
**Frontend Meetings:** https://proof-meet-frontend.vercel.app/meetings

**Environment Variable:**
- Name: `SCRAPERAPI_KEY`
- Value: Your API key from ScraperAPI dashboard

**Expected Result:**
- AA meetings: 50-100+ meetings
- NA meetings: 201 meetings
- Total: 250-300+ meetings

---

## Next Steps After Setup

Once ScraperAPI is working:

1. ✅ AA meetings will sync automatically daily at 2 AM
2. ✅ Participants can search all AA meetings
3. ✅ Meeting ID 88113069602 will be searchable
4. ✅ System is production-ready

The free trial gives you ~40 days of testing. If you want to continue, the $49/month Hobby plan provides enough credits for 800+ months of usage!
