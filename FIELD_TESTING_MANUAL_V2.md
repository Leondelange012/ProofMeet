# ProofMeet Field Testing Manual
## Court Compliance System - Version 2.0

**Document Version:** 2.0  
**Last Updated:** December 14, 2025  
**Purpose:** Comprehensive testing guide for field testers

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Pre-Testing Setup](#pre-testing-setup)
4. [Court Representative Testing](#court-representative-testing)
5. [Participant Testing](#participant-testing)
6. [Integration Testing Scenarios](#integration-testing-scenarios)
7. [Court Card Verification](#court-card-verification)
8. [Troubleshooting Common Issues](#troubleshooting-common-issues)
9. [Testing Checklist](#testing-checklist)
10. [Feedback & Reporting](#feedback-reporting)

---

## 1. Introduction

### What is ProofMeet?

ProofMeet is a court-mandated meeting compliance tracking system that automatically verifies participant attendance at recovery meetings (AA, NA, etc.) using Zoom webhooks. The system generates tamper-proof Court Cards that serve as legal proof of attendance.

### Who Should Use This Manual?

- Field testers evaluating the system
- Court representatives conducting pilot testing
- Participants testing the user experience
- Quality assurance teams

### Testing Goals

- ✅ Verify accurate attendance tracking
- ✅ Ensure court cards are generated correctly
- ✅ Test security and integrity features
- ✅ Validate user experience for both roles
- ✅ Identify any bugs or issues

---

## 2. System Overview

### Architecture

```
Participant → Zoom Meeting → Zoom Webhooks → ProofMeet Backend → Court Card
                                                     ↓
Court Representative ← Dashboard ← Real-time Updates
```

### Key Components

1. **Frontend:** Web application (React/Vite)
2. **Backend:** API server (Node.js/Express)
3. **Database:** PostgreSQL with Prisma ORM
4. **Integration:** Zoom Server-to-Server OAuth + Webhooks
5. **Security:** JWT authentication, HTTPS, digital signatures

### Tracking Methods

| Metric | How It's Tracked | Source |
|--------|------------------|--------|
| **Join/Leave Time** | Zoom webhook events | Zoom API |
| **Total Duration** | Calculated from join/leave timestamps | Zoom API |
| **Punctuality** | Compare actual vs scheduled times | Zoom + Database |
| **Leave/Rejoin Events** | Multiple join/leave cycles tracked | Zoom Webhooks |
| **Video Status** | Camera on/off events (Enterprise only) | Zoom Webhooks* |
| **Browser Activity** | Optional supplementary tracking | Frontend Monitor |

*Video status tracking requires Zoom Business/Enterprise account (code ready, awaiting upgrade)

---

## 3. Pre-Testing Setup

### Access Credentials

You will receive:
- [ ] Court Representative login credentials (email + password)
- [ ] Participant login credentials (email + password)
- [ ] Frontend URL: `https://proof-meet-frontend.vercel.app`
- [ ] Test Zoom meeting links
- [ ] This testing manual

### Required Tools

- [ ] Computer with internet connection
- [ ] Modern web browser (Chrome, Firefox, Edge, Safari)
- [ ] Zoom desktop or mobile app
- [ ] Email access (for password reset testing)
- [ ] Note-taking tool for feedback

### Before You Start

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Open incognito/private window** (optional but recommended)
3. **Have Zoom installed and updated** to latest version
4. **Prepare test scenarios** from this manual
5. **Have feedback form ready** (Section 10)

---

## 4. Court Representative Testing

### 4.1 Registration & Login

#### Test Case 1.1: Court Rep Registration
**Objective:** Verify registration process

**Steps:**
1. Navigate to frontend URL
2. Click "Register" button
3. Select "Court Representative"
4. Fill in required fields:
   - First Name: `Test`
   - Last Name: `CourtRep`
   - Email: Use provided test email
   - Badge Number: `TEST-001`
   - Court Name: `Test County Court`
   - Password: Create strong password
5. Click "Register"

**Expected Results:**
- ✅ Registration successful
- ✅ Email verification prompt appears (currently bypassed in testing)
- ✅ Redirect to login page
- ✅ Can log in with credentials

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 1.2: Court Rep Login
**Objective:** Verify login functionality

**Steps:**
1. Go to login page
2. Enter email and password
3. Click "Sign In"

**Expected Results:**
- ✅ Login successful
- ✅ Redirect to Court Rep Dashboard
- ✅ Dashboard loads without errors
- ✅ See "Court Representative Dashboard" header

**Pass/Fail:** ________  
**Notes:** _________________________________

---

### 4.2 Dashboard Overview

#### Test Case 2.1: Dashboard Data Display
**Objective:** Verify dashboard shows correct information

**Steps:**
1. After login, review dashboard
2. Check for these sections:
   - Overview statistics
   - Participants list
   - Recent meetings
   - Quick actions

**Expected Results:**
- ✅ Statistics card shows totals (participants, meetings, compliance rate)
- ✅ Participant list displays all registered participants
- ✅ Recent meetings section shows meeting history
- ✅ All data loads without errors

**What to Verify:**
- [ ] Participant count is accurate
- [ ] Meetings count is accurate
- [ ] Compliance percentage displays (if applicable)
- [ ] No loading errors or blank sections

**Pass/Fail:** ________  
**Notes:** _________________________________

---

### 4.3 Participant Management

#### Test Case 3.1: View Participant Details
**Objective:** Access individual participant information

**Steps:**
1. From dashboard, locate "Participants" section
2. Click on any participant name
3. Review participant profile

**Expected Results:**
- ✅ Participant details page loads
- ✅ Shows: Name, email, case number, assigned programs
- ✅ Shows attendance history
- ✅ Shows compliance status
- ✅ Shows generated court cards

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 3.2: Register New Participant
**Objective:** Court Rep can add new participants

**Steps:**
1. Click "Add Participant" or similar button
2. Fill in participant details:
   - First Name: `Test`
   - Last Name: `Participant`
   - Email: Use provided test email
   - Case Number: `CASE-001`
   - Required Programs: Select `AA` and `NA`
   - Meetings Per Week: `3`
   - Minimum Attendance: `80%`
3. Click "Register Participant"

**Expected Results:**
- ✅ Participant created successfully
- ✅ Confirmation message appears
- ✅ Participant appears in participants list
- ✅ Participant receives registration email (if email service active)

**Pass/Fail:** ________  
**Notes:** _________________________________

---

### 4.4 Meeting Scheduling

#### Test Case 4.1: Create Zoom Meeting
**Objective:** Court Rep can schedule meetings for tracking

**Steps:**
1. Navigate to "Meetings" or "Schedule Meeting"
2. Click "Create Meeting"
3. Fill in meeting details:
   - Meeting Name: `Test AA Meeting`
   - Program Type: `AA`
   - Date: Today's date
   - Start Time: 15 minutes from now
   - Duration: `5 minutes` (for quick testing)
   - Zoom Meeting ID: Copy from your Zoom meeting
4. Click "Create Meeting"

**Expected Results:**
- ✅ Meeting created successfully
- ✅ Meeting appears in meetings list
- ✅ Meeting details are correct
- ✅ Can view meeting details

**Pass/Fail:** ________  
**Notes:** _________________________________

---

### 4.5 Real-Time Monitoring

#### Test Case 5.1: Live Meeting Monitoring
**Objective:** Monitor active meetings in real-time

**Preparation:**
1. Create a meeting (Test Case 4.1)
2. Have a participant join the Zoom meeting
3. Keep Court Rep dashboard open

**Steps:**
1. Start the scheduled Zoom meeting
2. Have participant join the meeting
3. Observe Court Rep dashboard

**Expected Results:**
- ✅ Dashboard shows "Active Meeting" indicator
- ✅ Participant status updates to "In Progress"
- ✅ Real-time updates appear (via WebSocket if available)
- ✅ Join time is recorded

**Pass/Fail:** ________  
**Notes:** _________________________________

---

### 4.6 Court Card Review

#### Test Case 6.1: View Generated Court Card
**Objective:** Access and review court cards

**Preparation:**
- Complete a test meeting (join and leave)
- Wait 2-3 minutes for auto-generation

**Steps:**
1. Navigate to participant's profile
2. Scroll to "Court Cards" section
3. Click on the generated court card

**Expected Results:**
- ✅ Court card displays with card number (format: CC-YYYY-XXXXX-XXX)
- ✅ Shows: Meeting details, attendance metrics, validation status
- ✅ Displays QR code for verification
- ✅ Shows compliance status (PASSED/FAILED)
- ✅ Confidence level displayed (HIGH/MEDIUM/LOW)

**What to Verify:**
- [ ] Card number is unique
- [ ] Meeting name is correct
- [ ] Date and time are accurate
- [ ] Total duration matches actual attendance
- [ ] Attendance percentage is calculated correctly
- [ ] Validation status matches actual compliance
- [ ] QR code is present and scannable

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 6.2: Download Court Card PDF
**Objective:** Export court card as PDF

**Steps:**
1. Open a court card (Test Case 6.1)
2. Click "Download PDF" button
3. Save the PDF file

**Expected Results:**
- ✅ PDF downloads successfully
- ✅ PDF opens without errors
- ✅ Contains all court card information
- ✅ QR code is visible and scannable in PDF
- ✅ Professional formatting

**Pass/Fail:** ________  
**Notes:** _________________________________

---

## 5. Participant Testing

### 5.1 Registration & Login

#### Test Case 7.1: Participant Registration
**Objective:** Participant self-registration (if enabled)

**Note:** In most cases, Court Reps register participants. Test only if self-registration is enabled.

**Steps:**
1. Navigate to frontend URL
2. Click "Register"
3. Select "Participant"
4. Fill in details (use test credentials provided)
5. Enter Court Rep code (if required)
6. Click "Register"

**Expected Results:**
- ✅ Registration successful
- ✅ Redirect to login
- ✅ Can log in immediately

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 7.2: Participant Login
**Objective:** Verify participant login

**Steps:**
1. Go to login page
2. Enter participant email and password
3. Click "Sign In"

**Expected Results:**
- ✅ Login successful
- ✅ Redirect to Participant Dashboard
- ✅ Dashboard loads without errors
- ✅ See welcome message with participant name

**Pass/Fail:** ________  
**Notes:** _________________________________

---

### 5.2 Dashboard Navigation

#### Test Case 8.1: Dashboard Overview
**Objective:** Verify participant dashboard displays correctly

**Steps:**
1. After login, review dashboard
2. Check all sections present:
   - Welcome message
   - Browse Meetings button (should be first/prominent)
   - Progress this week
   - Required programs
   - Recent attendance history

**Expected Results:**
- ✅ "Browse Meetings" is the first action on the page
- ✅ Progress card shows: X of Y meetings attended
- ✅ Shows compliance status (ON_TRACK, BEHIND, etc.)
- ✅ Progress bar displays correctly
- ✅ Required programs are listed
- ✅ Recent meetings section shows attendance history

**Pass/Fail:** ________  
**Notes:** _________________________________

---

### 5.3 Browsing & Joining Meetings

#### Test Case 9.1: Browse Available Meetings
**Objective:** Find available meetings

**Steps:**
1. Click "Browse Meetings" button
2. Review meeting list
3. Use filters (if available):
   - Filter by program (AA, NA, etc.)
   - Filter by date
   - Search by location

**Expected Results:**
- ✅ Meeting list loads
- ✅ Shows meeting details: Name, program, time, duration, location
- ✅ Filters work correctly
- ✅ Can see meeting details by clicking

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 9.2: Join Meeting for Tracking
**Objective:** Start attendance tracking

**Steps:**
1. Find the test meeting you created
2. Click "Join & Track Attendance"
3. Review confirmation screen
4. Click "Start Tracking"
5. **Join the actual Zoom meeting** (use Zoom link)

**Expected Results:**
- ✅ Tracking starts successfully
- ✅ Redirect to "Active Meeting" page
- ✅ Page shows: Meeting name, scheduled duration, tracking status
- ✅ Message confirms "Tracking is automatic via Zoom"
- ✅ No camera/webcam prompt (we removed this feature)

**Pass/Fail:** ________  
**Notes:** _________________________________

---

### 5.4 During Meeting Testing

#### Test Case 10.1: Simple Attendance (Full Meeting)
**Objective:** Test basic attendance tracking

**Scenario:** Attend entire meeting without leaving

**Steps:**
1. Join meeting tracking (Test Case 9.2)
2. Join Zoom meeting
3. Stay in meeting for entire duration
4. Leave meeting when time is up
5. Return to ProofMeet dashboard

**Expected Results:**
- ✅ Attendance record created
- ✅ Join time captured
- ✅ Leave time captured
- ✅ Total duration = meeting scheduled duration
- ✅ Attendance percentage = 100%
- ✅ Status = PASSED/Compliant

**Record These Metrics:**
- Join Time: ________
- Leave Time: ________
- Duration: ________ minutes
- Attendance %: ________
- Status: ________

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 10.2: Late Join Test
**Objective:** Test punctuality tracking

**Scenario:** Join meeting 2-3 minutes late

**Steps:**
1. Start meeting tracking
2. Wait 2-3 minutes AFTER scheduled start time
3. Join Zoom meeting
4. Stay for remainder of meeting
5. Leave at scheduled end time

**Expected Results:**
- ✅ Late join is recorded
- ✅ Attendance duration = actual time in meeting
- ✅ Attendance percentage < 100%
- ✅ Court card metadata shows: "Minutes Late: X"
- ✅ May affect compliance status depending on requirements

**Record These Metrics:**
- Scheduled Start: ________
- Actual Join: ________
- Minutes Late: ________
- Duration: ________ minutes
- Attendance %: ________
- Status: ________

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 10.3: Early Leave Test
**Objective:** Test early departure tracking

**Scenario:** Leave meeting 2-3 minutes before scheduled end

**Steps:**
1. Join meeting on time
2. Stay in meeting
3. Leave 2-3 minutes BEFORE scheduled end time
4. Return to ProofMeet dashboard

**Expected Results:**
- ✅ Early leave is recorded
- ✅ Attendance duration = actual time in meeting
- ✅ Attendance percentage < 100%
- ✅ Court card metadata shows: "Minutes Early: X" or "Left Early: Yes"
- ✅ May affect compliance status

**Record These Metrics:**
- Scheduled End: ________
- Actual Leave: ________
- Minutes Early: ________
- Duration: ________ minutes
- Attendance %: ________
- Status: ________

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 10.4: Leave & Rejoin Test
**Objective:** Test mid-meeting departure tracking

**Scenario:** Leave meeting temporarily and rejoin

**Steps:**
1. Join meeting on time
2. Stay for 2 minutes
3. Leave meeting (close Zoom)
4. Wait 3 minutes
5. Rejoin meeting
6. Stay until end

**Expected Results:**
- ✅ Initial join time recorded
- ✅ First leave time recorded
- ✅ Rejoin time recorded
- ✅ Final leave time recorded
- ✅ Total duration = time in meeting (excluding absence)
- ✅ Court card shows: Leave/Rejoin period with timestamps
- ✅ Attendance percentage reflects time away

**Record These Metrics:**
- First Join: ________
- First Leave: ________
- Rejoin: ________
- Final Leave: ________
- Time Away: ________ minutes
- Total Duration: ________ minutes
- Attendance %: ________
- Status: ________

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 10.5: Multiple Leave/Rejoin Test
**Objective:** Test complex attendance patterns

**Scenario:** Leave and rejoin multiple times

**Steps:**
1. Join meeting
2. Leave after 1 minute
3. Rejoin after 1 minute
4. Leave again after 1 minute
5. Rejoin after 1 minute
6. Stay until end

**Expected Results:**
- ✅ All join/leave events captured
- ✅ Timeline shows: Join → Leave → Rejoin → Leave → Rejoin → Final Leave
- ✅ Total duration = sum of all time in meeting
- ✅ Court card shows: Multiple leave/rejoin periods
- ✅ Attendance percentage calculated correctly

**Record These Metrics:**
- Number of Join/Leave Cycles: ________
- Total Time Away: ________ minutes
- Total Time Present: ________ minutes
- Attendance %: ________
- Status: ________

**Pass/Fail:** ________  
**Notes:** _________________________________

---

### 5.5 Post-Meeting Verification

#### Test Case 11.1: View Personal Court Card
**Objective:** Participant can view their own court card

**Preparation:**
- Complete a test meeting
- Wait 2-3 minutes for auto-generation

**Steps:**
1. Return to participant dashboard
2. Scroll to "Recent Meetings & Court Cards"
3. Find the completed meeting
4. Click the "View" (eye icon) button

**Expected Results:**
- ✅ Court card modal opens
- ✅ Shows: Meeting information, attendance metrics, validation status
- ✅ Shows detailed time breakdown
- ✅ Shows leave/rejoin periods (if applicable)
- ✅ Shows confidence level
- ✅ **Does NOT show** "Verification Method" (we removed this)

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 11.2: Download Personal Court Card
**Objective:** Participant can download PDF

**Steps:**
1. Open court card (Test Case 11.1)
2. Click "Download PDF" button
3. Save and open PDF

**Expected Results:**
- ✅ PDF downloads successfully
- ✅ PDF contains all meeting details
- ✅ PDF includes QR code
- ✅ Professional formatting
- ✅ Can be printed clearly

**Pass/Fail:** ________  
**Notes:** _________________________________

---

## 6. Integration Testing Scenarios

### 6.1 End-to-End Workflow

#### Test Case 12.1: Complete Workflow Test
**Objective:** Test entire system flow from start to finish

**Roles:** 1 Court Rep, 1 Participant

**Steps:**

**Court Rep Actions:**
1. Login to Court Rep dashboard
2. Create new participant (if not exists)
3. Create test meeting:
   - Name: "E2E Test Meeting"
   - Program: AA
   - Date: Today
   - Start Time: 10 minutes from now
   - Duration: 5 minutes
   - Add Zoom meeting ID
4. Monitor dashboard for participant join

**Participant Actions:**
5. Login to participant dashboard
6. Browse meetings
7. Find "E2E Test Meeting"
8. Click "Join & Track Attendance"
9. Join actual Zoom meeting
10. Stay for full duration
11. Leave meeting at scheduled end
12. Return to dashboard
13. Wait 2-3 minutes
14. View generated court card

**Court Rep Actions:**
15. Refresh dashboard
16. View participant's court card
17. Verify metrics are accurate
18. Download court card PDF

**Expected Results:**
- ✅ All steps complete without errors
- ✅ Attendance tracked accurately
- ✅ Court card generated automatically
- ✅ Metrics match actual attendance:
  - Join time correct
  - Leave time correct
  - Duration = 5 minutes
  - Attendance = 100%
  - Status = PASSED
- ✅ Both Court Rep and Participant can access court card
- ✅ PDF downloads successfully for both

**Pass/Fail:** ________  
**Notes:** _________________________________

---

### 6.2 Stress Testing

#### Test Case 13.1: Multiple Participants, Single Meeting
**Objective:** Test system with multiple participants

**Roles:** 1 Court Rep, 3-5 Participants

**Steps:**
1. Court Rep creates one meeting
2. All participants join tracking
3. All join Zoom meeting at different times (stagger by 1 minute)
4. All stay for full duration
5. All leave at end

**Expected Results:**
- ✅ All participants tracked individually
- ✅ Separate court cards generated for each
- ✅ Join times are unique for each participant
- ✅ No data mixing between participants
- ✅ All metrics accurate for each

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 13.2: Single Participant, Multiple Meetings
**Objective:** Test system with multiple meetings per participant

**Roles:** 1 Court Rep, 1 Participant

**Steps:**
1. Court Rep creates 3 meetings (same day, different times)
2. Participant joins and completes all 3 meetings
3. Verify court cards for all 3

**Expected Results:**
- ✅ All 3 meetings tracked separately
- ✅ 3 unique court cards generated
- ✅ No data mixing between meetings
- ✅ Progress card updates correctly (e.g., "3 of 3 meetings attended")

**Pass/Fail:** ________  
**Notes:** _________________________________

---

## 7. Court Card Verification

### 7.1 Public Verification

#### Test Case 14.1: QR Code Scanning
**Objective:** Verify court card via QR code

**Steps:**
1. Generate a court card (any test meeting)
2. Download PDF or take screenshot of QR code
3. Use phone camera or QR scanner to scan code
4. Follow link that opens

**Expected Results:**
- ✅ QR code scans successfully
- ✅ Opens public verification page
- ✅ Shows court card details:
  - Card number
  - Meeting name
  - Date and time
  - Participant name
  - Attendance metrics
  - Validation status
  - Digital signature
- ✅ Shows "Verified ✓" indicator
- ✅ Shows integrity check passed

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 14.2: Manual Card Number Lookup
**Objective:** Verify court card by entering card number

**Steps:**
1. Note the court card number (e.g., CC-2025-00555-422)
2. Go to public verification page: `https://proof-meet-frontend.vercel.app/verify`
3. Enter card number
4. Click "Verify"

**Expected Results:**
- ✅ Card found successfully
- ✅ Same details as QR scan (Test Case 14.1)
- ✅ No errors
- ✅ Shows audit trail with:
  - Generation date
  - Meeting details
  - Attendance summary
  - Validation explanation

**Pass/Fail:** ________  
**Notes:** _________________________________

---

#### Test Case 14.3: Invalid Card Detection
**Objective:** System rejects invalid/fake cards

**Steps:**
1. Go to public verification page
2. Enter fake card number: `CC-2025-99999-999`
3. Click "Verify"

**Expected Results:**
- ✅ Error message: "Court card not found"
- ✅ Does not display any participant information
- ✅ Clear indication card is invalid

**Pass/Fail:** ________  
**Notes:** _________________________________

---

## 8. Troubleshooting Common Issues

### Issue 1: Tracking Not Starting

**Symptoms:**
- Participant clicks "Join & Track Attendance" but nothing happens
- No redirect to active meeting page

**Troubleshooting Steps:**
1. Check browser console for errors (F12 → Console tab)
2. Verify participant is logged in (check for token in localStorage)
3. Ensure meeting exists and hasn't ended
4. Check API endpoint is reachable
5. Try logging out and back in

**Expected Fix:** Contact support with console error details

---

### Issue 2: Court Card Not Generating

**Symptoms:**
- Meeting completed but no court card appears
- Court card section shows "Generating..." indefinitely

**Troubleshooting Steps:**
1. Wait 5 minutes (auto-generation runs every 2 minutes)
2. Refresh dashboard
3. Check meeting status is "COMPLETED"
4. Verify Zoom webhooks were received (Court Rep can check logs)
5. Try manually triggering finalization (if admin access)

**Expected Fix:** Court card should appear within 5 minutes of meeting end

---

### Issue 3: Inaccurate Duration

**Symptoms:**
- Court card shows 1 minute when participant stayed longer
- Duration doesn't match actual time in meeting

**Troubleshooting Steps:**
1. Verify participant joined the ZOOM meeting (not just tracking page)
2. Check if Zoom webhooks are configured correctly
3. Verify meeting ID in ProofMeet matches actual Zoom meeting ID
4. Check if participant's email matches their Zoom email

**Critical:** Participant's email in ProofMeet MUST match their Zoom email

---

### Issue 4: CORS Errors

**Symptoms:**
- Browser console shows: "blocked by CORS policy"
- API calls fail with network errors

**Troubleshooting Steps:**
1. Check browser console for exact error
2. Verify using correct frontend URL (not localhost unless testing locally)
3. Clear browser cache and cookies
4. Try incognito/private window

**Expected Fix:** Should work on production URLs without CORS errors

---

### Issue 5: Login Fails

**Symptoms:**
- "Invalid credentials" error when credentials are correct
- Endless loading on login

**Troubleshooting Steps:**
1. Verify email and password are correct
2. Check for typos (email is case-insensitive)
3. Try password reset if available
4. Verify account is active (Court Rep must activate participant)
5. Check browser console for errors

**Expected Fix:** Login should succeed with valid credentials

---

## 9. Testing Checklist

### Court Representative Tests
- [ ] Registration (Test Case 1.1)
- [ ] Login (Test Case 1.2)
- [ ] Dashboard display (Test Case 2.1)
- [ ] View participant details (Test Case 3.1)
- [ ] Register new participant (Test Case 3.2)
- [ ] Create meeting (Test Case 4.1)
- [ ] Monitor live meeting (Test Case 5.1)
- [ ] View court card (Test Case 6.1)
- [ ] Download PDF (Test Case 6.2)

### Participant Tests
- [ ] Registration (Test Case 7.1, if enabled)
- [ ] Login (Test Case 7.2)
- [ ] Dashboard overview (Test Case 8.1)
- [ ] Browse meetings (Test Case 9.1)
- [ ] Join meeting tracking (Test Case 9.2)
- [ ] Full attendance (Test Case 10.1)
- [ ] Late join (Test Case 10.2)
- [ ] Early leave (Test Case 10.3)
- [ ] Leave & rejoin (Test Case 10.4)
- [ ] Multiple leave/rejoin (Test Case 10.5)
- [ ] View personal court card (Test Case 11.1)
- [ ] Download personal PDF (Test Case 11.2)

### Integration Tests
- [ ] End-to-end workflow (Test Case 12.1)
- [ ] Multiple participants (Test Case 13.1)
- [ ] Multiple meetings (Test Case 13.2)

### Verification Tests
- [ ] QR code scanning (Test Case 14.1)
- [ ] Manual lookup (Test Case 14.2)
- [ ] Invalid card detection (Test Case 14.3)

---

## 10. Feedback & Reporting

### What to Report

Please provide feedback on:

**Functionality:**
- [ ] Did all features work as expected?
- [ ] Were there any errors or bugs?
- [ ] Did court cards generate accurately?
- [ ] Were metrics calculated correctly?

**User Experience:**
- [ ] Was the interface intuitive?
- [ ] Were instructions clear?
- [ ] Was navigation logical?
- [ ] Were there any confusing elements?

**Performance:**
- [ ] Did pages load quickly?
- [ ] Were there any delays or lag?
- [ ] Did real-time updates work smoothly?

**Accuracy:**
- [ ] Did tracking match actual attendance?
- [ ] Were timestamps accurate?
- [ ] Were calculations correct?

### Bug Report Template

If you find a bug, please report using this format:

```
Bug Title: [Short description]

Steps to Reproduce:
1. 
2. 
3. 

Expected Result:
[What should happen]

Actual Result:
[What actually happened]

Browser: [Chrome/Firefox/Safari/Edge]
Device: [Desktop/Mobile/Tablet]
Operating System: [Windows/Mac/iOS/Android]
Screenshots: [Attach if possible]

Additional Notes:
[Any other relevant information]
```

### Feedback Submission

Submit feedback to:
- **Email:** [Your support email]
- **Form:** [Link to feedback form]
- **Direct contact:** [Your contact method]

---

## Appendix: Quick Reference

### Key URLs
- **Frontend:** `https://proof-meet-frontend.vercel.app`
- **Public Verification:** `https://proof-meet-frontend.vercel.app/verify`
- **Support:** [Your support email]

### Test Data Examples
- **Court Rep Email:** `courtrep@test.proofmeet.com`
- **Participant Email:** `participant@test.proofmeet.com`
- **Test Badge Number:** `TEST-001`
- **Test Case Number:** `CASE-001`
- **Test Meeting Duration:** `5 minutes` (for quick testing)

### Meeting Attendance Thresholds
- **Compliant:** ≥ 80% attendance (configurable)
- **At Risk:** 60-79% attendance
- **Failed:** < 60% attendance
- **Punctuality Grace:** Usually 5 minutes late allowed

### Support Contacts
- **Technical Support:** [Email/Phone]
- **Training Questions:** [Email/Phone]
- **General Inquiries:** [Email/Phone]

---

**Document End**

*Thank you for testing ProofMeet! Your feedback is invaluable in making this system better for courts, court representatives, and participants.*

