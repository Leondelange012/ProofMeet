# ProofMeet Field Testing Guide
## Complete Step-by-Step Instructions for Non-Technical Users

---

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [Test Scenario 1: Court Representative](#test-scenario-1-court-representative)
4. [Test Scenario 2: Meeting Participant](#test-scenario-2-meeting-participant)
5. [Test Scenario 3: Meeting Host](#test-scenario-3-meeting-host)
6. [Complete End-to-End Test](#complete-end-to-end-test)
7. [What to Look For](#what-to-look-for)
8. [Troubleshooting](#troubleshooting)

---

## System Overview

**ProofMeet** is a digital court card system that verifies attendance at AA/NA meetings through:
- **Automatic attendance tracking** during Zoom meetings
- **Digital signatures** from participants and meeting hosts
- **QR code verification** for instant validation
- **Downloadable court cards** with cryptographic proof

### Three User Types:

1. **Court Representative (Court Rep)** - Creates meetings, manages participants, reviews court cards
2. **Participant** - Attends meetings, signs their own court cards, downloads proof
3. **Meeting Host** - Leads meetings, signs court cards to verify attendance

---

## Getting Started

### What You Need:
- ✅ Computer or smartphone with internet connection
- ✅ Web browser (Chrome, Safari, Firefox, Edge)
- ✅ Login credentials for your account type
- ✅ Zoom installed (for participants and hosts joining meetings)
- ✅ Webcam and microphone (for participants)

### Login URLs:
- **Production Site:** https://proof-meet-frontend.vercel.app
- **Backend API:** https://proofmeet-backend-production.up.railway.app

### Test Accounts:
You should have received login credentials for one or more of these account types:
- Court Representative account
- Participant account  
- Meeting Host account

---

## Test Scenario 1: Court Representative

### Goal: Create a test meeting and manage participants

#### Step 1: Login
1. Go to https://proof-meet-frontend.vercel.app/login
2. Enter your **Court Rep email** and **password**
3. Click **"Sign In"**
4. You should see the **Court Representative Dashboard**

#### Step 2: View Dashboard Overview
You should see:
- **Total Participants** - Number of people you're managing
- **Active Meetings** - Meetings currently in progress
- **Completed Meetings** - Meetings that have finished
- **Compliance Rate** - Percentage of participants meeting requirements

#### Step 3: Create a Test Meeting
1. Click **"Create Test Meeting"** button (top right)
2. Fill in the meeting details:
   - **Meeting Topic:** "AA Meeting - [Today's Date] - Test"
   - **Duration:** 30 minutes (or your preferred length)
   - **Start Time:** "Start in 2 minutes" (default)
   - ✅ Check **"This is a test meeting"**
3. Click **"Create Meeting"**
4. **IMPORTANT:** A popup will appear with:
   - Zoom Meeting Link
   - Meeting Password
   - **Copy both of these** - you'll need them!
5. Click **"Copy Link"** and paste it somewhere safe (Notes app, text document)

#### Step 4: Share Meeting Details
**For Testing:** Send the Zoom link and password to:
- The **participant** who will join
- The **host** who will lead the meeting

**In Real Use:** You would send this to:
- Your assigned participants (people on probation)
- The meeting host (AA/NA group leader)

#### Step 5: Monitor Active Meetings
1. After creating the meeting, click **"Manage Test Meetings"**
2. You should see your meeting listed with:
   - Meeting topic
   - Start time
   - Status (SCHEDULED → ACTIVE → COMPLETED)
   - Zoom link
3. Keep this page open to monitor progress

#### Step 6: Sync Latest Data
- Click **"Sync Latest Data"** button (green button, top right)
- This refreshes all data to show real-time updates
- Use this **whenever you want to see the latest attendance info**

#### Step 7: View Participant Progress
1. Scroll down to **"Participants"** section
2. Click on a participant's name to expand their details
3. You should see:
   - Total meetings attended
   - Total hours completed
   - Recent meetings list
   - Signature status (Participant signed? Host signed?)
   - Validation status (Valid, Pending, Invalid)

#### Step 8: Download Participant Court Card
1. In the participant's expanded view
2. Click **"Download Court Card"** button
3. A new tab opens with the official court card showing:
   - Participant information
   - Meeting attendance details
   - QR code for verification
   - Digital signature status
   - Validation stamp

---

## Test Scenario 2: Meeting Participant

### Goal: Join a meeting, get attendance verified, sign your court card

#### Step 1: Login to ProofMeet
1. Go to https://proof-meet-frontend.vercel.app/login
2. Enter your **Participant email** and **password**
3. Click **"Sign In"**
4. You should see the **Participant Dashboard**

#### Step 2: View Your Dashboard
You should see:
- **Meetings Attended** - Total count
- **Hours Completed** - Total time in meetings
- **Compliance Status** - Whether you're meeting requirements
- **Next Meeting** - Upcoming scheduled meeting (if any)

#### Step 3: Get Meeting Details
- Your **Court Rep** will send you:
  - Zoom meeting link
  - Meeting password
- Or check your email for meeting invitations

#### Step 4: Join the Zoom Meeting
1. Click the Zoom link **at the scheduled time**
2. Enter the meeting password
3. **Allow camera and microphone** when prompted
4. Wait for the host to admit you

#### Step 5: Stay Active During Meeting
**IMPORTANT:** For your attendance to count, you must:
- ✅ Keep your **camera on** throughout the meeting
- ✅ Stay **actively engaged** (not idle for long periods)
- ✅ Remain in the meeting for **at least 80% of the duration**
- ❌ Don't minimize or leave the meeting window

**What's Being Tracked:**
- Your join time
- Your leave time
- Total active time (camera on, engaged)
- Total idle time (away from computer)

#### Step 6: Complete the Meeting
1. Stay until the host ends the meeting
2. You can then close Zoom

#### Step 7: Check Attendance (After Meeting)
1. Go back to ProofMeet website
2. Navigate to **"My Progress"** page (from menu)
3. Click **"Sync Latest Data"** to see your latest attendance
4. You should see the meeting you just attended with:
   - Meeting name and date
   - Duration attended
   - Validation status

**Validation Status:**
- ✅ **VALID** - You attended enough (80%+ of meeting, 80%+ active)
- ⏳ **PENDING** - Still processing or awaiting signatures
- ❌ **NEEDS_ATTENTION** - Did not meet attendance requirements

#### Step 8: Sign Your Court Card
**When you see "Participant: Not Signed":**
1. Click the **pen icon** (✏️) in the Actions column
2. A dialog appears: **"Sign Your Court Card"**
3. Enter your **password** (the one you use to login)
4. Type **"I certify this attendance"** in the confirmation box
5. Click **"Sign Court Card"**
6. You should see: **"Successfully signed court card"**
7. The status changes to **"Participant: ✅ Signed"**

#### Step 9: Request Host Signature
**After you sign, the host also needs to sign:**
1. Click the **email icon** (✉️) in the Actions column
2. A dialog appears: **"Request Host Signature"**
3. Enter:
   - **Host's Email:** host@example.com
   - **Host's Name:** John Smith
4. Click **"Send Request"**
5. The host will receive an email with a unique link to sign

**Wait for Host Signature:**
- Check back later (or click "Sync Latest Data")
- When host signs, you'll see **"Host: ✅ Signed"**

#### Step 10: Download Your Court Card
**Once both signatures are complete:**
1. Click **"Download Court Card"** button
2. A new tab opens with your official court card
3. **Right-click → Save As** to save as PDF (if needed)
4. Or take a screenshot

**Your court card includes:**
- Your photo and case number
- Meeting details (date, time, duration)
- Attendance verification
- **QR Code** - anyone can scan this to verify it's real
- Digital signatures (yours and host's)
- Cryptographic validation

#### Step 11: Verify Your Court Card (Optional)
**To prove your court card is authentic:**
1. Open your court card PDF/screenshot
2. Use your phone to **scan the QR code**
3. It opens a verification page showing:
   - All meeting details
   - Digital signatures
   - Verification status
   - Chain of trust
4. **Share this verification link with your probation officer**

---

## Test Scenario 3: Meeting Host

### Goal: Lead a meeting, verify participant attendance, sign court cards

#### Step 1: Receive Meeting Details
You'll receive from the **Court Rep:**
- Zoom meeting link
- Meeting password
- Meeting start time
- List of expected participants (if provided)

#### Step 2: Start the Zoom Meeting
1. Click the Zoom link **5-10 minutes before start time**
2. Enter the meeting password
3. You'll be the **host** of the meeting
4. Start your video and audio

#### Step 3: Admit Participants
1. As participants join, they'll be in a **waiting room**
2. **Admit them** one by one
3. Make sure they have their **cameras on**

#### Step 4: Lead the Meeting
1. Conduct your AA/NA meeting as usual
2. **Note:** The system is automatically tracking:
   - Who joined and when
   - Who left and when
   - How long each person stayed
   - Whether participants stayed active (camera on)

#### Step 5: End the Meeting
1. When the meeting is over, click **"End Meeting"**
2. Choose **"End Meeting for All"**
3. The system now processes attendance automatically

#### Step 6: Sign Participant Court Cards
**Option A: Email Link (Recommended)**
1. You'll receive an email: **"Signature Request: Court Card Verification"**
2. Click the **"Sign Court Card"** link in the email
3. You'll see:
   - Participant name
   - Meeting details
   - Attendance information
4. Review the information
5. Click **"Confirm and Sign"**
6. You should see: **"Successfully signed"**

**Option B: Login to ProofMeet (If you have a host account)**
1. Go to https://proof-meet-frontend.vercel.app/login
2. Login with your host credentials
3. Navigate to **"Court Cards to Sign"** (if available)
4. Review and sign each court card

#### Step 7: Verify Your Signature
- Participants will see **"Host: ✅ Signed"** on their progress page
- Their court card is now complete with both signatures

---

## Complete End-to-End Test

### Full Workflow Test (All 3 Roles)

**This tests the entire system from start to finish.**

#### Phase 1: Setup (Court Rep - 5 minutes)
1. ✅ Login as Court Rep
2. ✅ Create test meeting (start in 2 minutes)
3. ✅ Copy Zoom link and password
4. ✅ Share with participant and host

#### Phase 2: Meeting (Participant & Host - 10-30 minutes)
1. ✅ Host joins Zoom first
2. ✅ Participant joins Zoom
3. ✅ Host admits participant
4. ✅ Participant keeps camera on
5. ✅ Stay in meeting for at least 80% of duration
6. ✅ Host ends meeting

#### Phase 3: Verification (All - Immediate)
1. ✅ Court Rep: Click "Sync Latest Data"
2. ✅ Participant: Go to "My Progress" → Click "Sync Latest Data"
3. ✅ Participant: Verify meeting appears in history
4. ✅ Participant: Check validation status (should be VALID if attended 80%+)

#### Phase 4: Signing (Participant & Host - 5 minutes)
1. ✅ Participant: Click pen icon → Sign court card with password
2. ✅ Participant: Click email icon → Request host signature
3. ✅ Host: Check email → Click signature link → Confirm and sign
4. ✅ Participant: Click "Sync Latest Data" → Verify both signatures present

#### Phase 5: Download & Verify (Participant - 2 minutes)
1. ✅ Participant: Click "Download Court Card"
2. ✅ Verify court card shows:
   - Meeting details
   - QR code image
   - Both digital signatures
   - VALID status
3. ✅ Scan QR code with phone
4. ✅ Verify verification page loads correctly

#### Phase 6: Court Rep Review (Court Rep - 2 minutes)
1. ✅ Court Rep: Click "Sync Latest Data"
2. ✅ Expand participant details
3. ✅ Verify meeting appears in participant's history
4. ✅ Verify both signatures present
5. ✅ Download participant's court card
6. ✅ Verify all details match

---

## What to Look For

### ✅ Success Indicators:

**For Court Reps:**
- Meetings create successfully and generate Zoom links
- "Sync Latest Data" button updates dashboard immediately
- Participants' attendance appears after meetings end
- Court cards can be downloaded with all information
- Signature status shows correctly (Participant signed? Host signed?)

**For Participants:**
- Dashboard shows meeting count and hours
- Recent meetings appear in "My Progress" after syncing
- Can sign own court card with password
- Can request host signature
- Court card downloads with QR code visible
- Validation status shows VALID when requirements met

**For Hosts:**
- Receive signature request emails
- Can sign court cards via email link
- Signature appears on participant's court card

**For Everyone:**
- No error messages
- Pages load within 2-3 seconds
- "Sync Latest Data" refreshes info immediately
- QR codes scan successfully
- Verification pages load correctly

### ❌ Issues to Report:

**Login Issues:**
- Cannot login (wrong password vs. system error)
- "Session expired" messages
- Redirected to wrong dashboard

**Meeting Issues:**
- Cannot create meeting
- Zoom link doesn't work
- Meeting doesn't appear in system after ending
- Attendance not tracked

**Signature Issues:**
- Cannot sign court card (password rejected vs. system error)
- Host signature request fails
- Email not received by host
- Signatures don't appear after signing

**Court Card Issues:**
- QR code not visible on downloaded court card
- Verification page shows errors when scanning QR code
- Court card shows "N/A" or missing information
- Download button doesn't work

**Data Sync Issues:**
- "Sync Latest Data" doesn't update information
- Must refresh browser to see updates
- Delays longer than 1-2 minutes for data to appear

---

## Troubleshooting

### Problem: Can't See Latest Attendance

**Solution:**
1. Click **"Sync Latest Data"** button (green button)
2. Wait 10 seconds
3. If still not showing, refresh browser (F5 or Ctrl+R)
4. If still not showing, wait 2-3 minutes and try again

### Problem: QR Code Not Showing

**Solution:**
1. This should be automatic now
2. If not visible, contact the Court Rep
3. Court Rep can click "Sync Latest Data" to trigger regeneration

### Problem: Can't Sign Court Card

**Participant Signature:**
1. Make sure you're using your **ProofMeet password** (not Zoom password)
2. Type the confirmation text exactly: **"I certify this attendance"**
3. If rejected, try resetting your password

**Host Signature:**
1. Check your email (including spam folder)
2. Make sure you click the signature link within 7 days
3. If link expired, ask participant to resend request

### Problem: Meeting Not Appearing After It Ended

**Solution:**
1. Wait 5 minutes after meeting ends
2. Click "Sync Latest Data"
3. If still not showing, check:
   - Did you join the correct Zoom link?
   - Did you stay for at least 10 minutes?
   - Was your camera on?

### Problem: Validation Status Shows "NEEDS_ATTENTION"

**Reasons:**
- Attended less than 80% of meeting duration
- Camera was off for too long
- Too much idle time (away from computer)

**Solution:**
- This is working correctly
- Attend the full meeting with camera on for credit

### Problem: Can't Download Court Card

**Solution:**
1. Make sure both signatures are present first
2. Click "Sync Latest Data"
3. Try different browser (Chrome vs. Firefox)
4. Check if popup blocker is preventing download
5. Try right-click → "Open in new tab"

---

## Testing Checklist

### Court Rep Testing ✅
- [ ] Can login successfully
- [ ] Dashboard shows overview statistics
- [ ] Can create test meeting
- [ ] Zoom link works
- [ ] Can manage test meetings
- [ ] "Sync Latest Data" updates dashboard
- [ ] Can view participant details
- [ ] Can expand participant meeting history
- [ ] Can download participant court cards
- [ ] Court cards show all information correctly

### Participant Testing ✅
- [ ] Can login successfully
- [ ] Dashboard shows meeting count and hours
- [ ] Can join Zoom meeting
- [ ] Meeting appears in "My Progress" after completion
- [ ] "Sync Latest Data" works
- [ ] Can sign own court card
- [ ] Can request host signature
- [ ] Can see signature status
- [ ] Can download own court card
- [ ] QR code visible on court card
- [ ] QR code scans correctly

### Host Testing ✅
- [ ] Can start Zoom meeting as host
- [ ] Can admit participants
- [ ] Can end meeting
- [ ] Receives signature request email
- [ ] Can click email link to sign
- [ ] Signature appears on court card

### System Integration ✅
- [ ] End-to-end workflow completes successfully
- [ ] All automatic processes work (attendance tracking, validation, QR codes)
- [ ] No manual intervention needed (no debug buttons required)
- [ ] Data syncs across all accounts
- [ ] Court cards are legally compliant and professional

---

## Support

### If You Encounter Issues:

**Document the Problem:**
1. Take screenshots
2. Note what you were trying to do
3. Note any error messages (exact text)
4. Note your account type (Court Rep / Participant / Host)
5. Note the time it happened

**Contact Information:**
- Email: [Your support email]
- Include: Screenshots, error messages, steps to reproduce

### Expected Response Times:
- Critical issues (can't login, can't create meetings): 1 hour
- Important issues (signatures not working, downloads failing): 4 hours
- Minor issues (UI glitches, slow loading): 24 hours

---

## System Behavior Summary

### What Happens Automatically:
✅ Attendance tracking during Zoom meetings
✅ Meeting duration calculation
✅ Active/idle time monitoring
✅ Validation status determination (VALID/NEEDS_ATTENTION)
✅ Court card generation after meeting ends
✅ QR code generation
✅ Verification URL creation

### What Requires Manual Action:
👤 Participant must sign their own court card (with password)
🤝 Host must sign court card (via email link)
🔄 Users must click "Sync Latest Data" to see immediate updates

### What Court Reps Should NOT Need:
❌ "Fix Stale Meetings" button (automatic)
❌ "Generate Court Cards" button (automatic)
❌ "Update QR Codes" button (automatic)
❌ "Add Signatures" button (manual by participant/host)

### What Court Reps SHOULD Use:
✅ "Create Test Meeting" - Create new Zoom meetings
✅ "Manage Test Meetings" - View and delete test meetings
✅ "Sync Latest Data" - Force refresh all data
✅ "Download Court Card" - Get participant's official court card

---

**End of Field Testing Guide**

*Version 1.0 - Updated: October 26, 2025*

