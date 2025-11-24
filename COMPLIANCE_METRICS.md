# Court Compliance Metrics - Proof & Verification

## Overview

ProofMeet provides **multiple layers of verification** to prove court compliance:

### Layer 1: Zoom Webhooks (PRIMARY - Required)
### Layer 2: Punctuality Tracking (PRIMARY - Required)
### Layer 3: Leave/Rejoin Tracking (PRIMARY - Required)
### Layer 4: Webcam Snapshots (SUPPLEMENTARY - Optional)
### Layer 5: Browser Activity (SUPPLEMENTARY - Optional)

---

## Layer 1: Zoom Webhooks (PRIMARY)

**What we track:**
- Exact join time (timestamp from Zoom)
- Exact leave time (timestamp from Zoom)
- Total duration in meeting (reported by Zoom in seconds)
- Participant email/name verification

**How we prove it:**
```json
{
  "type": "ZOOM_JOINED",
  "timestamp": "2025-11-24T13:00:15.000Z",
  "source": "ZOOM_WEBHOOK",
  "data": {
    "participantEmail": "user@example.com",
    "zoomUserId": "xyz123",
    "scheduledStart": "2025-11-24T13:00:00.000Z",
    "actualJoin": "2025-11-24T13:00:15.000Z",
    "minutesLate": 0
  }
}
```

```json
{
  "type": "ZOOM_LEFT",
  "timestamp": "2025-11-24T13:45:30.000Z",
  "source": "ZOOM_WEBHOOK",
  "data": {
    "participantEmail": "user@example.com",
    "zoomDurationSeconds": 2715,
    "zoomDurationMinutes": 45,
    "scheduledEnd": "2025-11-24T14:00:00.000Z",
    "actualLeave": "2025-11-24T13:45:30.000Z",
    "minutesEarly": 15
  }
}
```

**Court-Admissible Because:**
- Zoom is a third-party verification system
- Participant cannot manipulate Zoom's timestamps
- Zoom webhooks are cryptographically signed
- All events stored in immutable blockchain ledger
- Court card includes SHA-256 hash of all events

---

## Layer 2: Punctuality Tracking

**What we track:**
- Did they join late? (>5 minutes after scheduled start)
- Did they leave early? (>5 minutes before scheduled end)
- How many minutes late/early?

**How it's calculated:**
```typescript
// Late Join Detection
const scheduledStart = meeting.meetingDate;
const actualJoin = webhook.participant.join_time;
const minutesLate = Math.max(0, (actualJoin - scheduledStart) / 60000);
const joinedLate = minutesLate > 5;

// Early Leave Detection
const scheduledEnd = scheduledStart + (meeting.durationMinutes * 60000);
const actualLeave = webhook.participant.leave_time;
const minutesEarly = Math.max(0, (scheduledEnd - actualLeave) / 60000);
const leftEarly = minutesEarly > 5;
```

**Displayed in Court Card:**
```
Punctuality Report:
- Scheduled: 1:00 PM - 2:00 PM
- Actual Join: 1:15 PM (15 minutes late) ❌
- Actual Leave: 1:50 PM (10 minutes early) ❌
- Status: NON-COMPLIANT (Joined late + Left early)
```

---

## Layer 3: Leave/Rejoin Tracking

**What we track:**
- Every single join event
- Every single leave event
- Time away from meeting
- Number of disruptions

**How we track it:**
Zoom fires webhooks for EVERY join and leave:
- First join: `ZOOM_JOINED` event
- First leave: `ZOOM_LEFT` event
- Rejoin: `ZOOM_JOINED` event (with `isRejoin: true`)
- Leave again: `ZOOM_LEFT` event

**Example Timeline:**
```json
{
  "activityTimeline": {
    "events": [
      {
        "type": "ZOOM_JOINED",
        "timestamp": "2025-11-24T13:00:00Z",
        "data": { "isRejoin": false }
      },
      {
        "type": "ZOOM_LEFT",
        "timestamp": "2025-11-24T13:15:00Z",
        "data": { "isTemporaryLeave": true, "totalJoins": 1, "totalLeaves": 1 }
      },
      {
        "type": "ZOOM_JOINED",
        "timestamp": "2025-11-24T13:25:00Z",
        "data": { "isRejoin": true, "previousEvents": 2 }
      },
      {
        "type": "ZOOM_LEFT",
        "timestamp": "2025-11-24T14:00:00Z",
        "data": { "isTemporaryLeave": false, "totalJoins": 2, "totalLeaves": 2 }
      }
    ]
  }
}
```

**Analysis:**
```
Leave/Rejoin Report:
- Total Joins: 2
- Total Leaves: 2
- Time Away: 10 minutes (1:15 PM - 1:25 PM)
- Active Time: 50 minutes (60 scheduled - 10 away)
- Attendance: 83.3% (50/60 minutes) ✅
```

**Court-Admissible Because:**
- Each event has exact timestamp from Zoom
- Can't be fabricated (third-party webhooks)
- Timeline shows complete meeting history
- Gaps in timeline prove absence

---

## Layer 4: Webcam Snapshots (SUPPLEMENTARY)

**What we track:**
- Periodic webcam images (every 5 minutes)
- Face detection (AI verification)
- Visual proof of presence

**How it works:**
1. Browser requests webcam permission (if tab is open)
2. Captures snapshot every 5 minutes
3. Sends to backend with timestamp
4. Backend stores snapshot + runs face detection
5. Results stored in `webcamSnapshots` array

**Example Data:**
```json
{
  "webcamSnapshots": [
    {
      "timestamp": "2025-11-24T13:05:00Z",
      "minuteIntoMeeting": 5,
      "faceDetected": true,
      "photoData": "[base64 image]"
    },
    {
      "timestamp": "2025-11-24T13:10:00Z",
      "minuteIntoMeeting": 10,
      "faceDetected": true,
      "photoData": "[base64 image]"
    }
  ]
}
```

**Court Card Display:**
```
Webcam Verification:
- Total Snapshots: 10
- Face Detected: 9 (90%)
- Visual Verification: PASSED ✅
```

**Important Notes:**
- **NOT REQUIRED** for compliance
- Provides BONUS verification
- Only works if browser tab is open
- Absence of snapshots doesn't invalidate attendance
- Used to increase confidence level: LOW → MEDIUM → HIGH

---

## Layer 5: Browser Activity (SUPPLEMENTARY)

**What we track:**
- Mouse movements
- Keyboard activity
- Tab focus time
- Scroll events

**How it's used:**
- Calculate engagement score (0-100)
- Detect bot/fraud attempts
- Provide context for court card

**Example:**
```json
{
  "engagementScore": 85,
  "activityEvents": 450,
  "mouseMovements": 300,
  "keyboardActivity": 100,
  "tabFocusTime": 2700000
}
```

**Important Notes:**
- **NOT REQUIRED** for attendance
- Used for engagement scoring only
- Absence of activity doesn't fail validation
- Only works if ProofMeet tab is open

---

## Validation Rules (Court Card Pass/Fail)

### PRIMARY RULES (Required for PASS):
1. ✅ Attended ≥80% of scheduled duration (from Zoom)
2. ✅ Joined within 15 minutes of scheduled start
3. ✅ Stayed until end OR left ≤10 minutes early

### SUPPLEMENTARY BONUSES:
- +10% confidence: Webcam snapshots present (≥5 snapshots)
- +10% confidence: Face detected in ≥80% of snapshots
- +5% confidence: Browser activity present
- +5% confidence: No leave/rejoin disruptions

### CRITICAL VIOLATIONS (Auto-FAIL):
- ❌ Attended <80% of duration
- ❌ Joined >15 minutes late
- ❌ Left >10 minutes early
- ❌ Total time away >20% of meeting (from leave/rejoin)

---

## Court Card Example

```
COURT CARD: CC-2025-00555-987
STATUS: COMPLIANT ✅

Primary Verification (Zoom):
- Scheduled: 1:00 PM - 2:00 PM (60 minutes)
- Joined: 1:02 PM (2 minutes late) ✅
- Left: 1:58 PM (2 minutes early) ✅
- Duration: 56 minutes (93.3%) ✅

Leave/Rejoin Analysis:
- Total Joins: 1
- Total Leaves: 1
- Time Away: 0 minutes ✅
- No disruptions ✅

Supplementary Verification:
- Webcam Snapshots: 11 captured
- Face Detection: 10/11 (91%) ✅
- Browser Activity: 487 events ✅
- Engagement Score: 88/100 ✅

Confidence Level: HIGH
Verification Method: ZOOM_WEBHOOK + VISUAL + ACTIVITY
```

---

## Technical Implementation

### Backend (Zoom Webhooks)
- `handleParticipantJoined()`: Records each join (including rejoins)
- `handleParticipantLeft()`: Records each leave, calculates punctuality
- Appends events to timeline (never replaces)
- Stores join/leave pairs for analysis

### Frontend (Optional Supplementary)
- `WebcamSnapshotCapture`: Captures images every 5 min
- `ActivityMonitor`: Tracks mouse/keyboard/focus
- Both can be closed without affecting primary tracking

### Court Card Generation
- Primary data: Zoom webhook timeline
- Supplementary data: Snapshots + activity (if available)
- Validation rules check primary data only
- Supplementary data increases confidence level
- All data hashed and stored in blockchain ledger

---

## FAQ

**Q: What if the participant closes the browser tab?**
A: Primary tracking (Zoom) continues. They lose supplementary bonuses but still pass if they attended ≥80%.

**Q: What if there are no webcam snapshots?**
A: No problem! Zoom data alone is sufficient. Confidence level is MEDIUM instead of HIGH.

**Q: How do we prove they didn't manipulate the data?**
A: 
1. Zoom webhooks are third-party (can't be faked)
2. All events stored in blockchain ledger (immutable)
3. Court card has cryptographic hash (tampering detected)
4. Timestamps from Zoom servers (not participant's device)

**Q: What if they leave and rejoin multiple times?**
A: Every join/leave is recorded. If total time away >20%, they fail. Court card shows complete timeline.

**Q: Can they pass without camera on?**
A: Yes! Zoom tracking doesn't require camera. Webcam snapshots are supplementary. However, some court programs may have specific video requirements.

