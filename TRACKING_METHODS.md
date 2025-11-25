# ProofMeet Tracking Methods - Complete Reference

## Overview

ProofMeet uses a **dual-tracking system** to ensure court-admissible attendance verification:

1. **PRIMARY TRACKING:** Zoom Webhooks (Required - Backend)
2. **SUPPLEMENTARY TRACKING:** ProofMeet Tab (Optional - Frontend)

---

## 🔵 PRIMARY TRACKING: Zoom Webhooks

**System:** Backend (`backend/src/routes/zoom-webhooks.ts`)  
**Requirement:** Participant must be in Zoom meeting  
**ProofMeet Tab:** NOT REQUIRED  
**Reliability:** 100% - Cannot be manipulated by participant

### What Gets Tracked

| Metric | Source | Accuracy | Court-Admissible |
|--------|--------|----------|------------------|
| **Join Time** | Zoom servers | To the second | ✅ Yes |
| **Leave Time** | Zoom servers | To the second | ✅ Yes |
| **Total Duration** | Zoom calculation | Exact seconds | ✅ Yes |
| **Participant Email** | Zoom account | Verified | ✅ Yes |
| **Join/Leave Cycles** | Each webhook event | Every instance | ✅ Yes |
| **Multiple Rejoins** | Separate webhooks | All tracked | ✅ Yes |

### How It Works

#### When Participant Joins:
```
1. Participant clicks "Join" in Zoom
2. Zoom fires: meeting.participant_joined webhook
3. ProofMeet backend receives:
   - participant.join_time (exact timestamp)
   - participant.email (identity)
   - participant.user_name
4. Backend creates/updates AttendanceRecord
5. Adds ZOOM_JOINED event to timeline
```

#### When Participant Leaves:
```
1. Participant clicks "Leave" or disconnects
2. Zoom fires: meeting.participant_left webhook
3. ProofMeet backend receives:
   - participant.leave_time (exact timestamp)
   - participant.duration (TOTAL seconds in meeting)
   - participant.email
4. Backend updates AttendanceRecord with:
   - leaveTime
   - totalDurationMin (from Zoom's duration)
   - attendancePercent (calculated)
5. Adds ZOOM_LEFT event to timeline
6. Triggers court card generation
```

#### Leave/Rejoin Tracking:
```
Example Timeline:
- 1:00 PM: ZOOM_JOINED (first join)
- 1:15 PM: ZOOM_LEFT (temporary leave)
- 1:25 PM: ZOOM_JOINED (rejoin - marked with isRejoin: true)
- 2:00 PM: ZOOM_LEFT (final leave)

Result:
- Total Joins: 2
- Total Leaves: 2
- Time Away: 10 minutes (1:15 PM - 1:25 PM)
- Active Time: 50 minutes (60 - 10)
- Attendance: 83.3% (50/60)
```

### Punctuality Tracking

**Late Join Detection:**
```typescript
scheduledStart = meeting.meetingDate
actualJoin = webhook.participant.join_time
minutesLate = max(0, (actualJoin - scheduledStart) / 60000)
joinedLate = minutesLate > 5 // Threshold: 5 minutes

✅ PASS: Joined within 15 minutes of start
⚠️ WARNING: Joined 5-15 minutes late
❌ FAIL: Joined >15 minutes late
```

**Early Leave Detection:**
```typescript
scheduledEnd = scheduledStart + meetingDuration
actualLeave = webhook.participant.leave_time
minutesEarly = max(0, (scheduledEnd - actualLeave) / 60000)
leftEarly = minutesEarly > 5 // Threshold: 5 minutes

✅ PASS: Left within 10 minutes of end
⚠️ WARNING: Left 5-10 minutes early
❌ FAIL: Left >10 minutes early
```

### Data Storage Example

```typescript
AttendanceRecord {
  // Core Zoom data
  joinTime: Date,                    // From Zoom webhook
  leaveTime: Date,                   // From Zoom webhook
  totalDurationMin: 45,              // From Zoom (participant.duration)
  activeDurationMin: 45,             // Set to totalDurationMin
  idleDurationMin: 0,                // Always 0 (Zoom presence = active)
  attendancePercent: 75.00,          // Calculated: 45/60 = 75%
  verificationMethod: 'ZOOM_WEBHOOK',
  
  // Timeline (all Zoom events)
  activityTimeline: {
    events: [
      {
        type: 'ZOOM_JOINED',
        timestamp: '2025-11-24T13:00:15.000Z',
        source: 'ZOOM_WEBHOOK',
        data: {
          participantEmail: 'john@example.com',
          zoomUserId: 'xyz123'
        }
      },
      {
        type: 'ZOOM_LEFT',
        timestamp: '2025-11-24T13:45:30.000Z',
        source: 'ZOOM_WEBHOOK',
        data: {
          zoomDurationSeconds: 2715,
          zoomDurationMinutes: 45,
          minutesEarly: 15,
          leftEarly: true
        }
      }
    ]
  },
  
  // Punctuality metadata
  metadata: {
    minutesLate: 0,
    joinedLate: false,
    minutesEarly: 15,
    leftEarly: true
  }
}
```

### Validation Rules

```
PASS Requirements (All Must Be True):
✅ Attended ≥80% of scheduled duration
✅ Joined within 15 minutes of start
✅ Left within 10 minutes of end (OR meeting ended)
✅ Time away ≤20% of meeting (if left/rejoined)

FAIL Conditions (Any One Triggers Fail):
❌ Attended <80% of scheduled duration
❌ Joined >15 minutes late
❌ Left >10 minutes early
❌ Time away >20% of meeting
```

---

## 🟢 SUPPLEMENTARY TRACKING: ProofMeet Tab

**System:** Frontend (`frontend/src/components/`)  
**Requirement:** ProofMeet browser tab must stay open  
**Purpose:** Provide bonus verification layers  
**Impact on Pass/Fail:** NONE - Only affects confidence level

### What Gets Tracked

| Metric | How | Frequency | Purpose |
|--------|-----|-----------|---------|
| **Webcam Snapshots** | Camera API | 3 per session | Visual proof |
| **Face Detection** | AI analysis | Per snapshot | Identity verification |
| **Mouse Movement** | Browser events | Continuous | Activity proof |
| **Tab Focus** | Visibility API | Per second | Engagement proof |
| **Active/Idle Status** | Timer-based | Every 30s | Presence verification |

### 1. Webcam Snapshots

**Component:** `WebcamSnapshotCapture.tsx`

**Timing Strategy:**
```typescript
For ANY meeting duration:
- Snapshot 1: Early (3 min or 5% into meeting, whichever is less)
- Snapshot 2: Middle (50% through meeting)
- Snapshot 3: Late (85% through meeting)

Examples:
60-minute meeting: 3 min, 30 min, 51 min
30-minute meeting: 2 min, 15 min, 26 min
10-minute meeting: 0.5 min, 5 min, 8.5 min
```

**Process:**
```
1. Request camera access: navigator.mediaDevices.getUserMedia()
2. Capture video frame to canvas at scheduled times
3. Convert to JPEG (80% quality)
4. Send to backend: POST /api/verification/webcam-snapshot
5. Backend stores + runs face detection AI
6. Result stored: { faceDetected: true/false, confidence: 0-1 }
```

**Data Storage:**
```typescript
WebcamSnapshot {
  id: string,
  attendanceRecordId: string,
  photoData: string,              // Base64 JPEG
  capturedAt: Date,                // Exact timestamp
  minuteIntoMeeting: number,       // 3, 30, 51
  faceDetected: boolean,           // AI result
  faceMatchScore: number           // 0.0 - 1.0 confidence
}
```

**Validation Impact:**
```
Snapshots Present:
✅ +10% confidence: ≥3 snapshots captured
✅ +10% confidence: ≥80% face detection rate
✅ Upgrades: MEDIUM → HIGH confidence

No Snapshots (Tab Closed):
⚠️ No penalty to pass/fail status
⚠️ Confidence level stays: MEDIUM
⚠️ Still court-admissible via Zoom data
```

### 2. Mouse Activity

**Component:** `ActivityMonitor.tsx`

**Events Tracked:**
```typescript
- mousemove: Tracks cursor position changes
- mousedown: Tracks clicks (lenient - only updates activity)
- scroll: Tracks scrolling (lenient - only updates activity)
```

**NOT Tracked (Removed):**
```
❌ Keyboard activity (removed - not needed)
❌ Detailed click positions (removed - too invasive)
❌ Detailed scroll metrics (removed - too invasive)
```

**Throttling:**
```
- Mouse events sent every 2 seconds (max)
- Prevents server overload
- Still captures activity proof
```

**Process:**
```
1. Browser listens: window.addEventListener('mousemove')
2. Counter increments: mouseActivity++
3. Throttled send to backend every 2 seconds
4. Heartbeat every 30 seconds with summary:
   {
     mouseActivityCount: 150,
     timestamp: '...',
     isActive: true
   }
```

### 3. Tab Focus Tracking

**Purpose:** Verify participant has ProofMeet tab visible

**Process:**
```
1. Listen: document.addEventListener('visibilitychange')
2. Track focus time: tabFocusTime += 1000ms per second
3. Detect tab switches:
   - Tab hidden >5 seconds → Record LEAVE event
   - Tab visible again → Record REJOIN event
```

**Note:** This is OPTIONAL tracking - main leave/rejoin comes from Zoom webhooks

### 4. Active/Idle Detection

**Idle Threshold:** 2 minutes without activity

**Process:**
```
Every 30 seconds:
1. Check: timeSinceLastActivity
2. If <2 minutes: Send 'ACTIVE' status
3. If ≥2 minutes: Send 'IDLE' status
4. Activity resets timer:
   - Mouse movement
   - Clicks
   - Scrolling
   - Tab focus
```

### 5. Engagement Scoring

**Calculation (During Court Card Generation):**
```typescript
function calculateEngagementMetrics(activityTimeline, totalDurationMin) {
  const mouseMovements = events.filter(e => e.type === 'MOUSE_MOVE').length;
  const activeEvents = events.filter(e => e.type === 'ACTIVE').length;
  const idleEvents = events.filter(e => e.type === 'IDLE').length;
  
  // Activity rate: movements per minute
  const activityRate = mouseMovements / totalDurationMin;
  
  // Active ratio: active vs idle heartbeats
  const activeRatio = activeEvents / (activeEvents + idleEvents || 1);
  
  // Engagement score (0-100)
  const engagementScore = Math.min(
    (activityRate * 50) + (activeRatio * 50),
    100
  );
  
  return {
    engagementScore: Math.round(engagementScore),
    engagementLevel: score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW'
  };
}
```

**Engagement Levels:**
```
HIGH (80-100): Strong activity, consistent presence
MEDIUM (60-79): Moderate activity, mostly present
LOW (0-59): Minimal activity, frequently idle
```

### Data Storage Example

```typescript
AttendanceRecord {
  // Webcam data
  webcamSnapshots: [
    {
      photoData: 'data:image/jpeg;base64,...',
      capturedAt: '2025-11-24T13:03:00Z',
      minuteIntoMeeting: 3,
      faceDetected: true,
      faceMatchScore: 0.95
    },
    {
      photoData: 'data:image/jpeg;base64,...',
      capturedAt: '2025-11-24T13:30:00Z',
      minuteIntoMeeting: 30,
      faceDetected: true,
      faceMatchScore: 0.92
    },
    {
      photoData: 'data:image/jpeg;base64,...',
      capturedAt: '2025-11-24T13:51:00Z',
      minuteIntoMeeting: 51,
      faceDetected: true,
      faceMatchScore: 0.97
    }
  ],
  
  // Activity timeline (browser events)
  activityTimeline: {
    events: [
      // Zoom events (always present)
      { type: 'ZOOM_JOINED', timestamp: '13:00:00Z', source: 'ZOOM_WEBHOOK' },
      
      // Browser events (only if tab open)
      { type: 'MOUSE_MOVE', timestamp: '13:01:00Z', metadata: { x: 450, y: 320 } },
      { type: 'ACTIVE', timestamp: '13:01:30Z', metadata: { mouseActivity: 15 } },
      { type: 'MOUSE_MOVE', timestamp: '13:03:00Z', metadata: { x: 520, y: 280 } },
      { type: 'ACTIVE', timestamp: '13:02:00Z', metadata: { mouseActivity: 22 } },
      // ... more events ...
      
      { type: 'ZOOM_LEFT', timestamp: '14:00:00Z', source: 'ZOOM_WEBHOOK' }
    ]
  },
  
  // Engagement metrics
  metadata: {
    engagementScore: 88,
    engagementLevel: 'HIGH',
    mouseMovements: 350,
    activityEvents: 120,
    totalSnapshots: 3,
    snapshotsWithFace: 3,
    snapshotFaceDetectionRate: 100,
    videoOnPercentage: 100
  }
}
```

### Validation Impact

```
Supplementary Data Present (Tab Open):
✅ Engagement score calculated
✅ Visual verification available
✅ Confidence level: HIGH
✅ Can override minor fraud flags if engagement is high
✅ Provides additional evidence for court

Supplementary Data Missing (Tab Closed):
⚠️ No engagement score
⚠️ No visual verification
⚠️ Confidence level: MEDIUM
✅ Still passes validation if Zoom metrics are good
✅ Still court-admissible via Zoom data alone
```

---

## 📊 Comparison: With vs Without ProofMeet Tab

### Scenario A: Zoom Only (Tab Closed)

```
✅ TRACKED:
- Join time (Zoom)
- Leave time (Zoom)
- Total duration (Zoom)
- Punctuality (Zoom)
- Leave/rejoin cycles (Zoom)
- Time away (Zoom)
- Pass/fail validation
- Court card generation

❌ NOT TRACKED:
- Webcam snapshots
- Face detection
- Mouse activity
- Engagement score
- Tab focus time

RESULT:
Verification Method: ZOOM_WEBHOOK
Confidence Level: MEDIUM
Court-Admissible: YES ✅
Can Pass Validation: YES ✅
```

### Scenario B: Zoom + ProofMeet Tab (Tab Open)

```
✅ TRACKED:
- Join time (Zoom)
- Leave time (Zoom)
- Total duration (Zoom)
- Punctuality (Zoom)
- Leave/rejoin cycles (Zoom)
- Time away (Zoom)
- Pass/fail validation
- Court card generation
+ 3 webcam snapshots
+ Face detection results
+ Mouse activity tracking
+ Engagement score (0-100)
+ Tab focus time
+ Active/idle status

RESULT:
Verification Method: ZOOM_WEBHOOK + VISUAL + ACTIVITY
Confidence Level: HIGH ⭐
Court-Admissible: YES ✅
Can Pass Validation: YES ✅
Additional Evidence: YES ✅
```

---

## 🎯 Court Card Examples

### With Zoom Webhooks Only:

```
═══════════════════════════════════════════════════
         PROOFMEET COURT COMPLIANCE CARD
═══════════════════════════════════════════════════

CARD NUMBER: CC-2025-00555-987
STATUS: COMPLIANT ✅

───────────────────────────────────────────────────
PRIMARY VERIFICATION (Zoom Webhooks)
───────────────────────────────────────────────────
Meeting: AA 12-Step Recovery
Scheduled: Nov 24, 2025, 1:00 PM - 2:00 PM (60 min)

Participant: John Doe (john@example.com)
Joined: 1:00 PM (on time) ✅
Left: 1:56 PM (4 min early) ✅
Duration: 56 minutes (93.3%) ✅

Leave/Rejoin: 1 join, 1 leave (no interruptions) ✅

───────────────────────────────────────────────────
SUPPLEMENTARY VERIFICATION
───────────────────────────────────────────────────
⚠️ Webcam: Not available (tab was closed)
⚠️ Activity: Not available (tab was closed)

───────────────────────────────────────────────────
VERIFICATION DETAILS
───────────────────────────────────────────────────
Verification Method: ZOOM_WEBHOOK
Confidence Level: MEDIUM
Result: PASSED ✅

Court Rep: Officer Jane Smith
Case Number: 2025-CR-12345
═══════════════════════════════════════════════════
```

### With Zoom + ProofMeet Tab:

```
═══════════════════════════════════════════════════
         PROOFMEET COURT COMPLIANCE CARD
═══════════════════════════════════════════════════

CARD NUMBER: CC-2025-00555-988
STATUS: COMPLIANT ✅

───────────────────────────────────────────────────
PRIMARY VERIFICATION (Zoom Webhooks)
───────────────────────────────────────────────────
Meeting: AA 12-Step Recovery
Scheduled: Nov 24, 2025, 1:00 PM - 2:00 PM (60 min)

Participant: John Doe (john@example.com)
Joined: 1:00 PM (on time) ✅
Left: 1:56 PM (4 min early) ✅
Duration: 56 minutes (93.3%) ✅

Leave/Rejoin: 1 join, 1 leave (no interruptions) ✅

───────────────────────────────────────────────────
SUPPLEMENTARY VERIFICATION
───────────────────────────────────────────────────
📸 Webcam Verification:
   - Total Snapshots: 3
   - Snapshot 1 (3 min): Face detected ✅
   - Snapshot 2 (30 min): Face detected ✅
   - Snapshot 3 (51 min): Face detected ✅
   - Face Detection Rate: 100% ✅

🖱️ Activity Tracking:
   - Mouse Activity: 350 movements
   - Total Events: 120
   - Engagement Score: 88/100 (HIGH) ✅
   - Tab Focus Time: 54 minutes ✅

───────────────────────────────────────────────────
VERIFICATION DETAILS
───────────────────────────────────────────────────
Verification Method: ZOOM_WEBHOOK + VISUAL + ACTIVITY
Confidence Level: HIGH ⭐
Result: PASSED ✅

Court Rep: Officer Jane Smith
Case Number: 2025-CR-12345
═══════════════════════════════════════════════════
```

---

## 🔒 Why Both Systems Are Court-Admissible

### Zoom Webhooks:
1. **Third-Party:** Not from participant's device
2. **Cryptographically Signed:** Can't be faked
3. **Server Timestamps:** Unmanipulatable
4. **Immutable Storage:** Blockchain ledger
5. **SHA-256 Hash:** Tampering detected immediately

### ProofMeet Tab (Supplementary):
1. **Visual Evidence:** Timestamped photos with face detection
2. **Activity Logs:** Complete timeline of presence
3. **Cross-Verification:** Multiple independent data sources
4. **Engagement Analysis:** Proves active participation
5. **Fraud Detection:** AI-powered anomaly detection

---

## 📋 Summary Table

| Feature | Zoom Webhooks | ProofMeet Tab | Required for PASS? |
|---------|---------------|---------------|-------------------|
| Join Time | ✅ | ❌ | ✅ YES |
| Leave Time | ✅ | ❌ | ✅ YES |
| Duration | ✅ | ❌ | ✅ YES |
| Punctuality | ✅ | ❌ | ✅ YES |
| Leave/Rejoin | ✅ | ❌ | ✅ YES |
| Webcam Photos | ❌ | ✅ (3 per session) | ❌ NO (bonus) |
| Face Detection | ❌ | ✅ (AI-powered) | ❌ NO (bonus) |
| Mouse Activity | ❌ | ✅ (lenient) | ❌ NO (bonus) |
| Keyboard Activity | ❌ | ❌ (removed) | ❌ NO |
| Click Tracking | ❌ | ✅ (lenient) | ❌ NO (bonus) |
| Scroll Tracking | ❌ | ✅ (lenient) | ❌ NO (bonus) |
| Engagement Score | ❌ | ✅ (0-100) | ❌ NO (bonus) |
| Court Card | ✅ | ❌ | ✅ YES |
| Pass/Fail | ✅ | ❌ | ✅ YES |
| Confidence Level | MEDIUM | HIGH upgrade | ⚠️ Impact only |

---

## 🎓 Key Takeaways

1. **Zoom Webhooks = Foundation**
   - Required for pass/fail
   - Court-admissible on their own
   - Tracks all critical metrics
   - Works even if tab is closed

2. **ProofMeet Tab = Enhancement**
   - Optional bonus verification
   - Upgrades confidence level
   - Provides visual proof
   - Tracks engagement
   - Not required for passing

3. **Lenient Browser Tracking**
   - No keyboard tracking
   - Lenient click/scroll (only update activity)
   - Focus on mouse movement
   - Minimal data collection
   - Privacy-conscious design

4. **3 Snapshots Only**
   - Strategic timing (early, middle, late)
   - Distributed across meeting duration
   - Not time-based (adaptive)
   - Face detection on each
   - Visual proof of presence

5. **Court Admissibility**
   - Both systems are court-admissible
   - Zoom = primary evidence
   - ProofMeet Tab = supporting evidence
   - SHA-256 hashes prevent tampering
   - Complete audit trail maintained

---

**Bottom Line:** The participant can close the ProofMeet tab entirely and still pass validation with a MEDIUM confidence level. Keeping the tab open adds visual proof and engagement data for a HIGH confidence level, but is not required for court compliance.

