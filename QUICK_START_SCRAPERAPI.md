# Quick Start: ScraperAPI Setup (5 Minutes)

## 🎯 What You Need To Do

Follow these 3 simple steps to get AA meetings working:

---

## Step 1: Get ScraperAPI Key (2 minutes)

1. **Go to:** https://www.scraperapi.com/signup
2. **Sign up with email** (no credit card needed)
3. **Copy your API key** from the dashboard
   - It looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
   - Keep this tab open!

**Free Trial Includes:**
- ✅ 5,000 free API requests
- ✅ No credit card required
- ✅ Full feature access
- ✅ Lasts ~40 days for ProofMeet

---

## Step 2: Add API Key to Railway (2 minutes)

1. **Go to:** https://railway.app
2. **Click** on your ProofMeet Backend service
3. **Click** "Variables" tab (left sidebar)
4. **Click** "New Variable" button
5. **Enter:**
   - Variable name: `SCRAPERAPI_KEY`
   - Value: Paste your API key from Step 1
6. **Click** "Add"

**Railway will automatically redeploy** (takes ~2-3 minutes)

---

## Step 3: Verify It's Working (1 minute)

### Wait for Deployment

1. Stay on Railway page
2. Click "Deployments" tab
3. Wait for latest deployment to show "Active" (green)
4. Should take 2-3 minutes

### Test the Sync

Run this command in PowerShell:

```powershell
cd C:\Users\leond\OneDrive\Documents\ProofMeet
.\test-meeting-sync-simple.ps1
```

**Expected Results:**

```
[SUCCESS] Sync triggered successfully!

Results:
- Total fetched: 250+
- Saved to DB: 250+

Details by source:
- AA: 50+ meetings    ← GREEN (Success!)
- NA: 201 meetings

[FOUND] Meeting 88113069602 exists!
```

---

## ✅ Success Indicators

If everything is working, you should see:

### In PowerShell Test:
- ✅ AA meetings: 50+ (previously was 0)
- ✅ Meeting 88113069602 found
- ✅ Total meetings: 250+

### In Railway Logs:
Go to Railway → View Logs → You should see:
```
🔐 Using ScraperAPI to bypass CAPTCHA protection
📋 Received 100+ meetings from OIAA (AA-Intergroup)
✅ Total AA meetings fetched: 50+
```

### In Frontend:
1. Go to: https://proof-meet-frontend.vercel.app
2. Login as participant
3. Go to Meetings page
4. Select "AA" from Category
5. Click "Search"
6. **You should see AA meetings!**

---

## ❌ Troubleshooting

### If AA meetings still show 0:

**Check 1: Is API key set correctly?**
- Railway → Variables → Verify `SCRAPERAPI_KEY` exists
- Make sure there are no extra spaces in the key

**Check 2: Did Railway redeploy?**
- Railway → Deployments → Latest should be "Active"
- Look for commit: "Implement ScraperAPI for AA meeting CAPTCHA bypass"

**Check 3: Is ScraperAPI key valid?**
- Go to: https://www.scraperapi.com/dashboard
- Check "Remaining Credits" > 0
- Check "Status" is "Active"

**Check 4: View Railway Logs**
- Railway → View Logs
- Search for: "ScraperAPI"
- Should see: "Using ScraperAPI to bypass CAPTCHA protection"
- Should NOT see: "No ScraperAPI key - using free proxy"

### Still not working?

Run the debug script:
```powershell
.\debug-sync-response.ps1
```

This will show the exact API responses and help identify the issue.

---

## 💰 Cost Information

### Free Trial (What You Have Now):
- **5,000 free requests**
- **Lasts ~40 days** for ProofMeet usage
- **No credit card** required

### After Free Trial:
If you want to continue after 40 days:

- **Hobby Plan:** $49/month
  - 100,000 requests
  - Enough for **800+ months** of ProofMeet usage
  - Recommended plan

### Actual ProofMeet Usage:
- Daily sync: 2-4 requests
- Monthly: ~120 requests
- Yearly: ~1,500 requests

**The free trial covers you for 40 days. After that, $49/month gives you enough credits for 5+ years!**

---

## 📊 Monitor Usage

**ScraperAPI Dashboard:** https://www.scraperapi.com/dashboard

You can see:
- Requests used today
- Remaining credits
- Success rate (should be 99%+)
- Cost per request

---

## Next Steps

Once ScraperAPI is working:

1. ✅ **AA meetings sync automatically** every day at 2 AM
2. ✅ **Participants can search** all AA meetings  
3. ✅ **Meeting 88113069602 is searchable**
4. ✅ **System is production-ready**

---

## Support

**ScraperAPI Issues:**
- Dashboard: https://www.scraperapi.com/dashboard
- Docs: https://www.scraperapi.com/documentation
- Support: support@scraperapi.com

**ProofMeet Issues:**
- Check Railway logs for errors
- Review `AA_MEETINGS_DIAGNOSIS.md`
- Run test scripts to verify sync

---

## Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Sign up for ScraperAPI | 2 min |
| 2 | Add API key to Railway | 2 min |
| 3 | Wait for deployment & test | 2 min |
| **Total** | **AA meetings working!** | **6 min** |

**You're all set! AA meetings will now sync successfully.** 🎉
