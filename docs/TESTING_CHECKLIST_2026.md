# ProofMeet Field Testing Checklist
**Updated**: February 9, 2026  
**For**: Field testers, QA, beta users

---

## 🎯 Overview

This checklist covers BOTH types of meetings participants can attend:
1. **External AA/NA Meetings** - Real recovery meetings from aa-intergroup.org (NEW!)
2. **Test Meetings** - Court Rep created test meetings for verification

---

## ✅ Pre-Testing Setup

### System Access
- [ ] Backend deployed to Railway (check: https://your-backend.railway.app/health)
- [ ] Frontend deployed to Vercel (check: https://your-frontend.vercel.app)
- [ ] Database accessible via Railway
- [ ] Test accounts created:
  - [ ] Court Representative account
  - [ ] Participant account(s)
  - [ ] Host email configured

### Meeting Sync Verification
- [ ] Check health endpoint: `GET /api/admin/sync-health`
  - Expected: `"status": "HEALTHY"`
  - Expected: `"totalMeetings": 1800+`
  - Expected: `"AA": 1700+`
- [ ] Verify last sync: Should be < 24 hours ago
- [ ] Backend logs show: "Initial sync complete: 1894 meetings saved"

---

## 🔍 TEST 1: External AA/NA Meeting Search & Join (NEW FEATURE)

**Purpose**: Verify participants can find and join real AA/NA meetings  
**Duration**: 30-45 minutes  
**Requirements**: Participant account

### Step 1: Search for Meetings
- [ ] Login as participant
- [ ] Navigate to "Find Meetings" or "Available Meetings" page
- [ ] **Verify**: See 100+ meetings in the list
- [ ] **Verify**: Meetings grouped by program (AA, NA, SMART)
- [ ] **Verify**: Each meeting shows:
  - [ ] Meeting name
  - [ ] Program type
  - [ ] Day of week
  - [ ] Time
  - [ ] Zoom ID
  - [ ] "Join" button visible

### Step 2: Filter Meetings
- [ ] Filter by Program: Select "AA"
  - [ ] **Verify**: Only AA meetings shown
  - [ ] **Verify**: 100+ results
- [ ] Filter by Day: Select "Monday"
  - [ ] **Verify**: Only Monday meetings shown
- [ ] Search by Zoom ID: Enter "908141096" (or any known meeting)
  - [ ] **Verify**: Specific meeting appears (if exists)
  - [ ] **Verify**: "Join" button visible

### Step 3: Join External Meeting
- [ ] Click "Join" on any meeting
- [ ] **Verify**: Join confirmation message appears
- [ ] **Verify**: Meeting URL displayed
- [ ] **Verify**: Tracking status shows "In Progress"
- [ ] Click meeting URL to launch Zoom
- [ ] Join the actual Zoom meeting
- [ ] Stay for at least 50 minutes (80% of typical 60min meeting)

### Step 4: Complete Attendance
- [ ] Leave the Zoom meeting
- [ ] Click "Leave Meeting" in ProofMeet
- [ ] **Verify**: Duration calculated correctly
- [ ] **Verify**: Attendance percentage shown
- [ ] Wait 2-3 minutes for processing
- [ ] Click "Sync Latest Data"
- [ ] **Verify**: Meeting appears in "My Attendance" history
- [ ] **Verify**: Status shows "COMPLETED"

### Step 5: Court Card Generation
- [ ] **Verify**: Court card automatically generated
- [ ] **Verify**: Card number appears
- [ ] **Verify**: Validation status visible
- [ ] Sign court card with password
- [ ] Download court card PDF
- [ ] **Verify**: All fields populated correctly

**Expected Results:**
- ✅ 1,800+ meetings available to search
- ✅ Meeting search works by program, day, Zoom ID
- ✅ Join button appears on all meetings
- ✅ Attendance tracked automatically
- ✅ Court card generated after completion

**Report Issues If:**
- ❌ No meetings showing (< 10 meetings)
- ❌ "Join" button not appearing
- ❌ Search filters not working
- ❌ Attendance not tracked after joining
- ❌ Court card not generated

---

## 🧪 TEST 2: Court Rep Created Test Meetings

**Purpose**: Verify court-created meetings work correctly  
**Duration**: 20-30 minutes  
**Requirements**: Court Rep account, Participant account, Host email

### Step 1: Court Rep Creates Meeting
- [ ] Login as Court Rep
- [ ] Click "Create Test Meeting"
- [ ] Fill in:
  - [ ] Topic: "Test Meeting - [Your Name]"
  - [ ] Duration: 60 minutes
  - [ ] Start time: Within next 10 minutes
  - [ ] Check "This is a test meeting"
- [ ] Click "Create"
- [ ] **Verify**: Meeting created successfully
- [ ] **Verify**: Zoom link displayed
- [ ] Copy Zoom link and password

### Step 2: Participant Joins
- [ ] Login as Participant
- [ ] Click Zoom link from Court Rep
- [ ] Join Zoom meeting
- [ ] **Verify**: Participant admitted by host
- [ ] **Verify**: Camera on
- [ ] Stay for full duration (50+ minutes)

### Step 3: Host Manages Meeting
- [ ] Start Zoom as meeting host
- [ ] Admit participant from waiting room
- [ ] **Verify**: Participant's camera is on
- [ ] Conduct meeting normally
- [ ] End meeting for all participants

### Step 4: Attendance Processing
- [ ] Wait 2-3 minutes after meeting ends
- [ ] **Participant**: Click "Sync Latest Data"
- [ ] **Verify**: Meeting appears in history
- [ ] **Verify**: Status shows "COMPLETED"
- [ ] **Verify**: Duration calculated (should be 50+ minutes)
- [ ] **Verify**: Attendance percentage (should be 80%+)

### Step 5: Digital Signatures
- [ ] **Participant**: Click "Sign" (✏️) button
- [ ] Enter password and confirmation text
- [ ] Click "Sign Court Card"
- [ ] **Verify**: Participant signature timestamp appears
- [ ] Click "Request Host Signature" (✉️) button
- [ ] **Verify**: Confirmation message shown

### Step 6: Host Signature
- [ ] **Host**: Check email inbox
- [ ] Find "Signature Request: Court Card Verification"
- [ ] Click "Sign Court Card" link
- [ ] **Verify**: Attendance details shown correctly
- [ ] Click "Confirm and Sign"
- [ ] **Verify**: Success message appears

### Step 7: Court Card Download
- [ ] **Participant**: Refresh page or sync data
- [ ] **Verify**: Both signatures appear (participant + host)
- [ ] Click "Download Court Card"
- [ ] **Verify**: PDF downloads
- [ ] Open PDF and verify:
  - [ ] Participant name and case number
  - [ ] Meeting details (name, date, duration)
  - [ ] Attendance percentage
  - [ ] Validation status (COMPLIANT/NON-COMPLIANT)
  - [ ] Both signatures with timestamps
  - [ ] QR code visible

### Step 8: QR Code Verification
- [ ] Scan QR code with phone camera
- [ ] **Verify**: Opens verification page
- [ ] **Verify**: All attendance details shown
- [ ] **Verify**: Signature status visible
- [ ] **Verify**: No login required to view

**Expected Results:**
- ✅ Court Rep can create meetings in < 30 seconds
- ✅ Participant tracked automatically during meeting
- ✅ Attendance calculated correctly (duration, percentage)
- ✅ Court card generated automatically
- ✅ Digital signatures work (participant + host)
- ✅ PDF download includes all information
- ✅ QR code verification works publicly

**Report Issues If:**
- ❌ Meeting creation fails
- ❌ Participant not tracked during meeting
- ❌ Duration/percentage incorrect
- ❌ Court card not generated
- ❌ Signatures not saving
- ❌ PDF missing information
- ❌ QR code doesn't scan

---

## 📊 TEST 3: Meeting Sync Health Check

**Purpose**: Verify automatic sync is working  
**Duration**: 5 minutes  
**Requirements**: Admin access

### Health Check
- [ ] Call: `GET /api/admin/sync-health`
  - Header: `x-admin-secret: YOUR_SECRET`
- [ ] **Verify**: HTTP 200 (not 503)
- [ ] **Verify**: `"status": "HEALTHY"`
- [ ] **Verify**: `"totalMeetings"` > 1000
- [ ] **Verify**: `"AA"` count > 1000
- [ ] **Verify**: `"hoursSinceLastSync"` < 24
- [ ] **Verify**: `"issues"` array is empty

### Sync Statistics
- [ ] Call: `GET /api/admin/sync-statistics`
- [ ] **Verify**: Detailed counts by program
- [ ] **Verify**: `meetingsWithProof` = `totalMeetings`
- [ ] **Verify**: `recentlyUpdated` > 1000 (within 24h)

### Check Specific Meeting
- [ ] Call: `GET /api/admin/check-meeting/908141096`
- [ ] **Verify**: `"exists": true` (if meeting in source)
- [ ] **Verify**: Meeting details returned

**Expected Results:**
- ✅ Health status is HEALTHY
- ✅ Last sync < 24 hours ago
- ✅ 1,800+ total meetings
- ✅ No critical issues

**Report Issues If:**
- ❌ Status is WARNING or CRITICAL
- ❌ Last sync > 24 hours ago
- ❌ Total meetings < 100
- ❌ AA meetings = 0

---

## 🔄 TEST 4: Automatic Sync Verification

**Purpose**: Confirm sync runs automatically  
**Duration**: Wait for next 2 AM UTC  
**Requirements**: Railway log access

### Check Railway Logs (At 2:05 AM UTC)
- [ ] Open Railway → Backend service → Logs
- [ ] Search for: "Automated DAILY meeting sync triggered"
- [ ] **Verify**: Sync ran at 2:00 AM UTC
- [ ] **Verify**: "Using direct access (no proxy needed)"
- [ ] **Verify**: "Got 8423 meetings from OIAA JSON feed"
- [ ] **Verify**: "Automated sync complete: 1800+ meetings saved"
- [ ] **Verify**: "Duration: 60-120s"
- [ ] **Verify**: "Sync Health: HEALTHY"
- [ ] **Verify**: No ERROR or CRITICAL messages

### Check After Server Restart
- [ ] Restart Railway backend service
- [ ] Wait 30 seconds
- [ ] Check logs for: "Running initial meeting sync on startup"
- [ ] **Verify**: Sync completes successfully
- [ ] **Verify**: Meetings immediately available

**Expected Results:**
- ✅ Sync runs daily at 2 AM UTC automatically
- ✅ Sync runs 30 seconds after server restart
- ✅ 1,800+ meetings synced each time
- ✅ No manual intervention needed

**Report Issues If:**
- ❌ Sync doesn't run at scheduled time
- ❌ Sync fails with errors
- ❌ Returns 0 or very few meetings
- ❌ Doesn't run on server startup

---

## 🚨 Critical Success Indicators

### ✅ System is Working If:

**Meeting Availability:**
- Participant can find 100+ AA/NA meetings
- Search filters work correctly
- Join button appears on all meetings
- Meetings sync daily automatically

**Attendance Tracking:**
- Join/leave times recorded accurately
- Duration calculated correctly (±2 minutes acceptable)
- Attendance percentage within 5% accuracy
- Status updates within 3 minutes of meeting end

**Court Cards:**
- Generated automatically after meeting
- Include all required information
- QR codes scan successfully
- PDFs download without errors

**Digital Signatures:**
- Participant can sign with password
- Host receives email signature link
- Host can sign via email link
- Signatures appear on court card

### ❌ System Has Issues If:

**Meeting Problems:**
- No meetings available (< 10)
- Join button missing
- Search returns no results
- Sync health shows CRITICAL

**Tracking Problems:**
- Duration off by > 5 minutes
- Attendance percentage obviously wrong (> 10% error)
- Meeting doesn't appear after completion
- Status stuck in PENDING > 10 minutes

**Court Card Problems:**
- Not generated after meeting
- Missing information (name, duration, etc.)
- QR code doesn't scan
- PDF fails to download

**Signature Problems:**
- Participant can't sign
- Host doesn't receive email
- Signature link doesn't work
- Signatures don't appear on card

---

## 📝 Bug Reporting Template

When reporting issues, include:

```
**Issue Title**: [Brief description]

**User Type**: Participant / Court Rep / Host

**What I was trying to do**:
[Step by step what you were doing]

**What happened**:
[What actually happened]

**Expected behavior**:
[What should have happened]

**Screenshots**: 
[Attach if applicable]

**Time**: [Date and time it occurred]

**Additional info**:
- Browser: [Chrome/Firefox/Safari/Edge]
- Device: [Desktop/Mobile/Tablet]
- Meeting ID: [If applicable]
- Error messages: [If any shown]
```

---

## 📞 Support

**For Testing Issues:**
- Check: `MEETING_SYNC_GUARANTEE.md` for sync issues
- Check: `SYSTEM_MEMORY_BANK.md` for architecture
- Run diagnostic: `.\diagnose-meeting.ps1 <ZOOM_ID>`

**Health Check:**
```bash
curl -H "x-admin-secret: YOUR_SECRET" \
  https://your-backend.railway.app/api/admin/sync-health
```

**Trigger Sync:**
```bash
curl -X POST -H "x-admin-secret: YOUR_SECRET" \
  https://your-backend.railway.app/api/admin/sync-meetings
```

---

**Status**: ✅ Ready for comprehensive field testing with external meeting search feature
