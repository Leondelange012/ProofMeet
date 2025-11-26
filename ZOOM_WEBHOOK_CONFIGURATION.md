# Zoom Webhook Configuration - Step-by-Step Guide

## 🎯 Objective
Add video on/off event subscriptions to your Zoom app so ProofMeet can track when participants turn their camera on/off during meetings.

---

## 📋 Prerequisites

Before you begin, you need:
- ✅ Zoom account with app management access
- ✅ ProofMeet Zoom app already created (you have this - it's sending join/leave events)
- ✅ ProofMeet backend deployed and accessible
- ✅ Webhook URL: `https://proofmeet-backend-production.up.railway.app/api/webhooks/zoom`

---

## 🔧 Step-by-Step Configuration

### Step 1: Access Zoom Marketplace

1. Go to **Zoom Marketplace**: https://marketplace.zoom.us/
2. Click **"Develop"** in the top right corner
3. Select **"Build App"** from the dropdown

**Screenshot reference:** You should see a list of your apps.

---

### Step 2: Find Your ProofMeet App

1. Look for your ProofMeet app in the list of apps
   - It might be named: "ProofMeet", "ProofMeet Tracker", or similar
   - It's the app you created when you first set up Zoom webhooks

2. Click on the app name to open it

**If you can't find it:**
- Check if you're logged into the correct Zoom account
- Ask your Zoom admin if they created the app
- The app should already exist because you're receiving join/leave events

---

### Step 3: Navigate to Features Tab

1. In the left sidebar, click **"Features"**
2. Scroll down to find **"Event Subscriptions"** section

**Current Status:**
- You should see existing subscriptions for:
  - `meeting.started`
  - `meeting.ended`
  - `meeting.participant_joined`
  - `meeting.participant_left`

---

### Step 4: Add New Event Subscriptions

**In the Event Subscriptions section:**

1. Click **"+ Add Event Subscription"** (or "Edit" if subscriptions already exist)

2. Find and check these two new events:
   ```
   ☐ Meeting Participant Video On
   ☐ Meeting Participant Video Off
   ```

3. **Event Details:**
   - **Event:** `meeting.participant_video_on`
     - **Description:** Triggered when a participant turns their video on
     - **Category:** Meeting Events → Participant Events
   
   - **Event:** `meeting.participant_video_off`
     - **Description:** Triggered when a participant turns their video off
     - **Category:** Meeting Events → Participant Events

4. Your final event list should include:
   - ✅ `meeting.started`
   - ✅ `meeting.ended`
   - ✅ `meeting.participant_joined`
   - ✅ `meeting.participant_left`
   - ✅ `meeting.participant_video_on` ⬅️ NEW
   - ✅ `meeting.participant_video_off` ⬅️ NEW

---

### Step 5: Verify Webhook Endpoint

1. Still in the Features tab, find **"Event notification endpoint URL"**

2. Verify it's set to:
   ```
   https://proofmeet-backend-production.up.railway.app/api/webhooks/zoom
   ```

3. **If it's different or empty:**
   - Enter the URL above
   - Click **"Validate"**
   - Zoom will send a challenge request
   - ProofMeet backend will respond automatically
   - You should see ✅ "Validation successful"

**Note:** If validation fails, check Railway logs to ensure backend is running.

---

### Step 6: Save Changes

1. Scroll to the bottom of the page
2. Click **"Save"** or **"Continue"**
3. Wait for confirmation message: "Event subscriptions updated successfully"

---

### Step 7: Verify Configuration

**Check that all events are enabled:**

1. Go back to Features → Event Subscriptions
2. Verify you see 6 events enabled:
   - meeting.started
   - meeting.ended
   - meeting.participant_joined
   - meeting.participant_left
   - meeting.participant_video_on ⬅️ NEW
   - meeting.participant_video_off ⬅️ NEW

3. Verify webhook URL is correct
4. Verify status shows **"Enabled"** (not "Disabled" or "Draft")

---

## ✅ Test the Configuration

### Quick Test:

1. **Create a test meeting** in ProofMeet
2. **Join the meeting** via Zoom
3. **Turn camera ON** (click video button in Zoom)
4. **Turn camera OFF** (click video button again)
5. **Leave the meeting**

### Check Railway Logs:

Open Railway logs and look for these messages:
```
📹 Participant video ON: [Your Name]
📹 Participant video OFF: [Your Name]
```

**If you see these logs → Configuration successful! ✅**

**If you DON'T see these logs:**
- Wait 30 seconds and check again (webhook delay)
- Verify event subscriptions are saved in Zoom
- Check that webhook endpoint is validated
- Restart your Zoom meeting

---

## 🔍 Troubleshooting

### Issue 1: "Validation failed" when adding webhook URL

**Possible causes:**
1. Railway backend is not running
2. Webhook URL is incorrect
3. Backend route is not responding

**Solution:**
```bash
# Check Railway logs for:
📞 Zoom webhook verification request received

# If you see this, backend is working
# If not, check Railway deployment status
```

**Test webhook endpoint manually:**
```bash
# Use this URL in browser:
https://proofmeet-backend-production.up.railway.app/api/webhooks/zoom?challenge=test123

# Expected response:
{"challenge":"test123"}

# If you get this, webhook endpoint is working!
```

---

### Issue 2: Events not showing in dropdown

**Possible causes:**
1. App type doesn't support these events
2. Zoom account type doesn't have access
3. Need to enable meeting features

**Solution:**
1. Check app type: Must be "Meeting" app (not "Chat" or "Phone")
2. Check Zoom plan: Must be Pro, Business, or Enterprise
3. Go to app "Scopes" tab and ensure you have:
   - `meeting:read:admin`
   - `meeting:read:participant:admin`

---

### Issue 3: Events subscribed but webhooks not arriving

**Possible causes:**
1. Events are in "Draft" mode
2. App not activated/published
3. Webhook delivery is failing

**Solution:**
1. Check app status: Must be "Activated" (not "Draft" or "Development")
2. Check Features tab: Event Subscriptions must be "Enabled"
3. Check Railway logs for incoming webhook attempts
4. Check Zoom app dashboard for webhook delivery failures

**Zoom Webhook Delivery Status:**
- Go to your app dashboard
- Click "View" next to Event Subscriptions
- Check "Webhook delivery status"
- Look for failed deliveries and error messages

---

### Issue 4: "Insufficient privileges" error

**Solution:**
You need to add OAuth scopes to your app:

1. Go to **"Scopes"** tab in your Zoom app
2. Click **"+ Add Scopes"**
3. Add these scopes:
   - `meeting:read:admin` - View meeting information
   - `meeting:read:participant:admin` - View participant information
   - `meeting:write:admin` - Manage meetings (for creating test meetings)

4. Click **"Save"**
5. **Important:** If app is already installed, you'll need to reinstall it:
   - Go to "Activation" tab
   - Click "Deactivate"
   - Click "Activate" again
   - This will request new permissions

---

## 📞 Need More Help?

### Check These Resources:

1. **Zoom Webhook Documentation:**
   - https://developers.zoom.us/docs/api/rest/webhook-reference/

2. **Zoom Event Subscriptions Guide:**
   - https://developers.zoom.us/docs/api/rest/webhook-reference/#event-subscriptions

3. **ProofMeet Backend Health:**
   - https://proofmeet-backend-production.up.railway.app/health
   - Should return: `{"status":"ok","environment":"production"}`

4. **Railway Logs:**
   - https://railway.app/ → Your ProofMeet project → View logs
   - Look for webhook-related messages

---

## 📊 What Happens After Configuration

Once configured, here's what happens automatically:

### During Meeting:
1. Participant joins → `meeting.participant_joined` ✅
2. Camera turns ON → `meeting.participant_video_on` ✅ NEW
3. Camera turns OFF → `meeting.participant_video_off` ✅ NEW
4. Participant leaves → `meeting.participant_left` ✅

### Backend Processing:
1. Receives webhook events from Zoom
2. Records VIDEO_ON/OFF in activity timeline
3. Calculates camera on duration
4. Generates court card with video metrics

### Court Card Output:
```
VIDEO VERIFICATION (Zoom Webhooks) ✅
───────────────────────────────────────────────────
Camera Status: ON 45/60 minutes (75%) ✅
Camera Off Periods: 
  • 1:00 PM - 1:02 PM (2 min)
  • 1:15 PM - 1:22 PM (7 min)
```

---

## 🎉 Success Criteria

You'll know configuration is successful when:

✅ Zoom app shows 6 event subscriptions (including video on/off)
✅ Webhook endpoint validation passes
✅ Railway logs show "Participant video ON/OFF" messages during test
✅ Court card includes video metrics after meeting
✅ No "camera conflict" - Zoom video works normally

---

## 🚀 Next Steps After Configuration

1. ✅ Configure webhooks (you're doing this now)
2. ⏳ Test with real meeting
3. ⏳ Verify court card shows video metrics
4. ⏳ Update frontend UI to display video timeline
5. ⏳ Document results

---

## 📝 Configuration Checklist

Use this checklist to ensure everything is set up:

### Zoom App Configuration:
- [ ] Logged into Zoom Marketplace
- [ ] Found ProofMeet app
- [ ] Opened Features tab
- [ ] Located Event Subscriptions section
- [ ] Added `meeting.participant_video_on` event
- [ ] Added `meeting.participant_video_off` event
- [ ] Verified webhook URL is correct
- [ ] Webhook URL validation passed
- [ ] Saved changes
- [ ] Verified 6 events total are enabled

### Testing:
- [ ] Created test meeting
- [ ] Joined via Zoom
- [ ] Turned camera ON
- [ ] Turned camera OFF
- [ ] Checked Railway logs for video events
- [ ] Left meeting
- [ ] Checked court card for video metrics

### Verification:
- [ ] Railway logs show video events
- [ ] Court card includes camera on percentage
- [ ] Zoom video works normally (no black screen)
- [ ] Video metrics stored in database

---

**Need help with any of these steps? I can walk you through them!** 🚀

