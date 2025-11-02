# ProofMeet Tracking & Validation Rules

**Last Updated:** November 1, 2025  
**Version:** 2.0.10

This document describes all tracking mechanisms, validation rules, and threshold calculations used in the ProofMeet Court Compliance System.

---

## Table of Contents

1. [Overview](#overview)
2. [What We Track](#what-we-track)
3. [Engagement Detection Rules](#engagement-detection-rules)
4. [Fraud Detection Rules](#fraud-detection-rules)
5. [Court Card Validation Rules](#court-card-validation-rules)
6. [Score Calculations](#score-calculations)
7. [Decision Logic](#decision-logic)
8. [Threshold Reference](#threshold-reference)

---

## Overview

ProofMeet uses a multi-layered validation system to verify genuine meeting attendance:

1. **Data Collection** - Real-time activity tracking during meetings
2. **Engagement Analysis** - Scoring participant presence and behavior
3. **Fraud Detection** - Identifying suspicious patterns
4. **Court Card Validation** - Final compliance checks
5. **Blockchain Ledger** - Immutable record creation

All validations happen **automatically** when a meeting's scheduled time window ends.

---

## What We Track

### 📊 Primary Data Sources

#### 1. Zoom Webhook Data (MOST IMPORTANT)
- **Join Time** - When participant entered the meeting (source of truth)
- **Leave Time** - When participant exited the meeting (source of truth)
- **Total Duration** - Calculated from Zoom webhook times
- **Meeting Metadata** - Meeting ID, topic, scheduled duration

#### 2. Frontend Activity Monitor (30-second heartbeat)
```javascript
// Tracked every 30 seconds while participant is in meeting
{
  type: 'ACTIVE' | 'IDLE',
  timestamp: Date,
  data: {
    mouseMovement: boolean,      // Any mouse movement detected
    keyboardActivity: boolean,    // Any key pressed
    tabFocused: boolean,          // Is browser tab active
    audioActive: boolean,         // Is microphone on
    videoActive: boolean,         // Is camera on
    zoomReaction: boolean         // Did user send Zoom reaction
  }
}
```

#### 3. Re-join Tracking
- **Absence Periods** - Time spent outside meeting after leaving
- **Re-join Count** - Number of times participant re-entered
- **Net Duration** - Total time minus absence time

### 📝 Stored Metadata

```json
{
  "activityTimeline": {
    "events": [/* all heartbeat events */],
    "summary": {
      "totalEvents": 10,
      "activeEvents": 8,
      "idleEvents": 2
    }
  },
  "absencePeriods": [
    {
      "leftAt": "2025-11-01T10:15:00Z",
      "rejoinedAt": "2025-11-01T10:20:00Z",
      "absenceMinutes": 5
    }
  ],
  "rejoinCount": 1,
  "totalRawDuration": 30,
  "totalAbsenceTime": 5,
  "netAttendanceTime": 25
}
```

---

## Engagement Detection Rules

**File:** `backend/src/services/engagementDetection.ts`

### Purpose
Verify that a participant was **actually present** during the meeting, not just logged in with the tab open.

### Scoring System

#### Weights (Total = 100%)
```javascript
{
  audioVideo: 50%,        // Is camera on? (visual verification)
  hasAnyActivity: 30%,    // Did they show ANY signs of presence?
  consistency: 20%        // Pattern consistency (bot detection)
}
```

### Component Scores

#### 1. Audio/Video Score (0-100 points)
```
Camera ON:  70 points (PRIMARY INDICATOR)
Audio ON:   30 points (helpful but not required)
Total Max:  100 points
```

**Logic:**
- Video is the **most important** indicator of actual presence
- Audio helps but many meetings are muted
- No video = Cannot visually verify they're actually there

**Flags:**
- `NO_VIDEO` - Camera was off (flags for review)

---

#### 2. Activity Presence Score (0-100 points)
```
ANY activity detected:  100 points
Zero activity:          0 points
```

**What counts as activity:**
- ANY mouse movement (even once or twice)
- ANY keyboard activity
- ANY activity heartbeat event

**Logic:**
- We don't require constant activity
- Even minimal activity proves someone is actually there
- People in meetings listen, take notes elsewhere, etc.
- We only care that they showed SOME sign of presence

**Flags:**
- `ZERO_ACTIVITY` - No activity detected in meeting >10 minutes (tab left open)

---

#### 3. Consistency Score (0-100 points)
```
Normal activity:              100 points
Very high activity (>10/min): 50 points (suspicious)
Extremely high (>15/min):     0 points (bot detected)
```

**Logic:**
- Detects automated scripts/bots
- Real humans don't have perfectly timed activity
- Activity rate >15 events/min = likely automation

**Flags:**
- `SUSPICIOUSLY_HIGH_ACTIVITY` - More than 10 events per minute
- `LIKELY_AUTOMATED` - More than 15 events per minute

---

### Final Engagement Score Calculation

```javascript
finalScore = 
  (audioVideoScore × 0.50) +
  (activityScore × 0.30) +
  (consistencyScore × 0.20)
```

**Range:** 0-100

---

### Engagement Recommendation Logic

```javascript
if (flags.includes('LIKELY_AUTOMATED')) {
  return 'REJECT';  // Bot detected
}

if (flags.includes('ZERO_ACTIVITY')) {
  return 'REJECT';  // Tab left open
}

if (finalScore >= 80) {
  return 'APPROVE';  // Great engagement
}

if (finalScore >= 50) {
  // Check if video was on
  return flags.includes('NO_VIDEO') ? 'FLAG_FOR_REVIEW' : 'APPROVE';
}

if (finalScore >= 30) {
  return 'FLAG_FOR_REVIEW';  // Minimal engagement
}

return 'REJECT';  // Below minimum threshold
```

---

### Engagement Levels

| Score Range | Level | Meaning |
|------------|-------|---------|
| 80-100 | HIGH | Video ON + clear activity |
| 50-79 | MEDIUM | Some presence indicators |
| 30-49 | LOW | Minimal engagement |
| 0-29 | SUSPICIOUS | Likely not present |

---

## Fraud Detection Rules

**File:** `backend/src/services/fraudDetection.ts`

### Purpose
Identify impossible scenarios, data integrity issues, and suspicious patterns that suggest fraud or system abuse.

### Detection Categories

#### 1. Duration Violations

| Rule | Description | Threshold | Action |
|------|-------------|-----------|--------|
| `IMPOSSIBLE_DURATION` | Duration exceeds scheduled meeting time | >15 min over | REJECT |
| `ZERO_DURATION` | No attendance time recorded | = 0 minutes | REJECT |
| `NEGATIVE_DURATION` | Duration is negative | < 0 | REJECT |
| `INSUFFICIENT_DURATION` | Duration below minimum | < 5 minutes | FLAG |

**Logic:**
```javascript
// Example: 60-minute meeting
scheduledDuration = 60 minutes
actualDuration = 78 minutes
difference = 78 - 60 = 18 minutes

if (difference > 15) {
  REJECT: 'IMPOSSIBLE_DURATION'
}
```

---

#### 2. Engagement Violations

| Rule | Description | Check | Action |
|------|-------------|-------|--------|
| `NO_ENGAGEMENT_SIGNALS` | Zero activity in long meeting | 0 events && >10 min | REJECT |
| `LOW_ENGAGEMENT_SCORE` | Engagement analysis failed | score < 30 | FLAG |
| `ENGAGEMENT_ANALYSIS_FAILED` | Engagement recommendation = REJECT | from analysis | REJECT |

**Integration with Engagement Analysis:**
```javascript
engagementAnalysis = await analyzeAttendanceEngagement(record);

if (engagementAnalysis.recommendation === 'REJECT') {
  addViolation({
    rule: 'ENGAGEMENT_ANALYSIS_FAILED',
    severity: 'HIGH',
    action: 'REJECT',
    riskScore: +25
  });
}
```

---

#### 3. Data Integrity Violations

| Rule | Description | Threshold | Action |
|------|-------------|-----------|--------|
| `DURATION_DATA_MISMATCH` | Zoom vs tracked duration differ | >10 min difference | FLAG |
| `MISSING_VERIFICATION_DATA` | No Zoom webhook data | No webhook && >15 min | FLAG |

---

#### 4. Attendance Violations

| Rule | Description | Threshold | Action |
|------|-------------|-----------|--------|
| `ATTENDANCE_BELOW_THRESHOLD` | Attended less than required | <80% of meeting | FLAG |
| `EXTREMELY_HIGH_IDLE_TIME` | Too much idle time | Idle >50% of total | FLAG |

**Calculation Example:**
```javascript
// Meeting: 60 minutes scheduled
// Attended: 40 minutes actual
attendancePercent = (40 / 60) * 100 = 66.67%

if (attendancePercent < 80) {
  FLAG: 'ATTENDANCE_BELOW_THRESHOLD'
}
```

---

### Risk Score Calculation

```javascript
riskScore = 0

for each violation:
  if (severity === 'CRITICAL')  riskScore += 30
  if (severity === 'HIGH')      riskScore += 20
  if (severity === 'MEDIUM')    riskScore += 10

// From engagement analysis
if (engagement === 'REJECT')     riskScore += 25
if (engagement === 'FLAG')       riskScore += 15

// Cap at 100
riskScore = Math.min(riskScore, 100)
```

---

### Fraud Detection Recommendation

```javascript
if (violations.some(v => v.action === 'REJECT')) {
  return 'REJECT';
}

if (violations.length > 0 || riskScore > 50) {
  return 'FLAG_FOR_REVIEW';
}

return 'APPROVE';
```

---

### Auto-Rejection Logic

```javascript
function shouldAutoReject(fraudResult) {
  return (
    fraudResult.recommendation === 'REJECT' ||
    fraudResult.riskScore >= 80 ||
    fraudResult.violations.some(v => v.severity === 'CRITICAL')
  );
}
```

**Auto-reject if ANY of these are true:**
- Recommendation is `REJECT`
- Risk score ≥ 80
- Any `CRITICAL` severity violation exists

---

## Court Card Validation Rules

**File:** `backend/src/services/courtCardService.ts`

### Purpose
Final compliance checks before generating the official court card. These rules ensure the attendance meets court requirements.

### Validation Rules

#### Rule 0: Attendance Window Violation
```javascript
CUMULATIVE_GRACE_PERIOD = 10 minutes total

minutesLate = max(0, joinTime - scheduledStartTime)
minutesEarly = max(0, scheduledEndTime - leaveTime)
totalMissed = minutesLate + minutesEarly

if (totalMissed > 10) {
  CRITICAL VIOLATION
}
```

**Examples:**
- 5 min late + 3 min early = 8 min total ✅ PASS
- 7 min late + 5 min early = 12 min total ❌ FAIL
- 0 min late + 11 min early = 11 min total ❌ FAIL

---

#### Rule 1: Active Time Requirement
```javascript
activePercent = (activeDurationMin / totalDurationMin) * 100

if (activePercent < 80) {
  CRITICAL VIOLATION
}
```

**Logic:**
- Must be "active" (not idle) for 80% of time attended
- Based on activity timeline events

---

#### Rule 2: Minimum Attendance Duration
```javascript
MINIMUM_DURATION = 5 minutes

if (totalDurationMin < 5) {
  CRITICAL VIOLATION
}
```

---

#### Rule 3: Meeting Attendance Percentage
```javascript
meetingAttendancePercent = (totalDurationMin / scheduledMeetingDuration) * 100

if (meetingAttendancePercent < 80) {
  WARNING VIOLATION
}
```

**Example:**
- Meeting scheduled: 60 minutes
- Attended: 45 minutes
- Percentage: 75% ❌ WARNING (need 80%)

---

#### Rule 4: Missing Primary Verification
```javascript
if (verificationMethod !== 'BOTH' && verificationMethod !== 'ZOOM_WEBHOOK') {
  WARNING VIOLATION
}
```

**Verification Methods:**
- `ZOOM_WEBHOOK` - Zoom API confirmed join/leave (preferred)
- `SCREEN_ACTIVITY` - Only frontend tracking (less reliable)
- `BOTH` - Zoom + frontend (best)

---

### Validation Status

```javascript
validationStatus = violations.some(v => v.severity === 'CRITICAL') 
  ? 'FAILED' 
  : 'PASSED'
```

**Court Card Generation:**
- `PASSED` → Court card generated with signature and QR code
- `FAILED` → No court card, attendance marked invalid

---

## Score Calculations

### Engagement Score (0-100)

```
Engagement Score = 
  (Audio/Video Score × 0.50) +
  (Activity Score × 0.30) +
  (Consistency Score × 0.20)

Where:
  Audio/Video Score = 70 (video ON) + 30 (audio ON)
  Activity Score = 100 (any activity) OR 0 (none)
  Consistency Score = 100 - (bot penalties)
```

**Examples:**

**Example 1: Ideal Participant**
```
Video ON: 70 points
Audio ON: 30 points
Activity detected: 100 points
Normal pattern: 100 points

Score = (100 × 0.50) + (100 × 0.30) + (100 × 0.20)
      = 50 + 30 + 20
      = 100 → APPROVE ✅
```

**Example 2: Video Off, Active**
```
Video OFF: 0 points
Audio ON: 30 points
Activity detected: 100 points
Normal pattern: 100 points

Score = (30 × 0.50) + (100 × 0.30) + (100 × 0.20)
      = 15 + 30 + 20
      = 65 → FLAG FOR REVIEW ⚠️
```

**Example 3: Tab Left Open**
```
Video OFF: 0 points
Audio OFF: 0 points
No activity: 0 points
Normal pattern: 100 points

Score = (0 × 0.50) + (0 × 0.30) + (100 × 0.20)
      = 0 + 0 + 20
      = 20 → REJECT ❌
```

---

### Risk Score (0-100)

```
Risk Score = Sum of all violation scores

CRITICAL violation:   +30 points
HIGH violation:       +20 points  
MEDIUM violation:     +10 points
Engagement REJECT:    +25 points
Engagement FLAG:      +15 points

Capped at 100
```

---

### Attendance Percentage

```
Attendance % = (totalDurationMin / scheduledMeetingDuration) × 100

Required: ≥ 80%
```

**Example:**
```
Scheduled: 60 minutes
Attended: 50 minutes
Percentage: (50/60) × 100 = 83.33% ✅ PASS

Scheduled: 60 minutes
Attended: 45 minutes
Percentage: (45/60) × 100 = 75% ❌ FAIL
```

---

## Decision Logic

### Complete Flow

```
┌─────────────────────────────────────────┐
│  Meeting Ends (scheduled end time)      │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  1. Run Engagement Analysis              │
│     - Extract metrics from timeline      │
│     - Calculate engagement score         │
│     - Generate recommendation            │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  2. Run Fraud Detection                  │
│     - Check all fraud rules              │
│     - Calculate risk score               │
│     - Integrate engagement result        │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  3. Check Auto-Rejection Criteria        │
│     - Recommendation = REJECT?           │
│     - Risk Score ≥ 80?                   │
│     - Any CRITICAL violations?           │
└───────────────┬─────────────────────────┘
                │
         ┌──────┴──────┐
         │             │
         ▼             ▼
     YES: Reject   NO: Continue
         │             │
         │             ▼
         │     ┌─────────────────────────────┐
         │     │  4. Generate Court Card      │
         │     │     - Validate attendance    │
         │     │     - Create digital sig     │
         │     │     - Generate QR code       │
         │     └─────────────────────────────┘
         │             │
         │             ▼
         │     ┌─────────────────────────────┐
         │     │  5. Create Ledger Block      │
         │     │     - Hash all data          │
         │     │     - Link to previous block │
         │     │     - Store immutably        │
         │     └─────────────────────────────┘
         │             │
         └─────────────┴──────────────────────┐
                                              ▼
                                 ┌─────────────────────────┐
                                 │  6. Update Record       │
                                 │     - Mark finalized    │
                                 │     - Store results     │
                                 │     - Notify Court Rep  │
                                 └─────────────────────────┘
```

---

### Decision Matrix

| Engagement Score | Video | Activity | Risk Score | Fraud Result | Final Decision |
|-----------------|-------|----------|------------|--------------|----------------|
| 80-100 | ON | YES | <50 | APPROVE | ✅ APPROVED - Generate Card |
| 50-79 | ON | YES | <50 | APPROVE | ✅ APPROVED - Generate Card |
| 50-79 | OFF | YES | <50 | APPROVE | ⚠️ FLAGGED - Manual Review |
| 30-49 | Any | YES | <50 | FLAG | ⚠️ FLAGGED - Manual Review |
| <30 | Any | Any | Any | REJECT | ❌ REJECTED - No Card |
| Any | Any | NO | Any | REJECT | ❌ REJECTED - No Card |
| Any | Any | Any | ≥80 | Any | ❌ REJECTED - No Card |
| Any | Any | Bot | Any | REJECT | ❌ REJECTED - No Card |

---

## Threshold Reference

### Quick Reference Table

| Parameter | Threshold | Action |
|-----------|-----------|--------|
| **Engagement Score** | | |
| Excellent | ≥80 | Auto-approve |
| Good | 50-79 | Approve (if video ON) |
| Poor | 30-49 | Flag for review |
| Failing | <30 | Auto-reject |
| **Activity** | | |
| Sufficient | Any detected | Pass check |
| Insufficient | Zero | Auto-reject |
| Suspicious | >15 events/min | Auto-reject (bot) |
| **Risk Score** | | |
| Low Risk | 0-49 | Continue processing |
| Medium Risk | 50-79 | Flag for review |
| High Risk | ≥80 | Auto-reject |
| **Attendance** | | |
| Compliant | ≥80% | Pass |
| Non-compliant | <80% | Flag/Fail |
| Minimum | ≥5 minutes | Required |
| **Grace Period** | | |
| Tardiness + Early Leave | ≤10 min total | Pass |
| Tardiness + Early Leave | >10 min total | Critical violation |
| **Active Time** | | |
| Required | ≥80% of attended | Pass |
| Insufficient | <80% of attended | Critical violation |

---

## Examples & Scenarios

### Scenario 1: Model Participant ✅
```yaml
Meeting Duration: 60 minutes
Attended: 55 minutes (91.7%)
Video: ON
Activity: 3 mouse movements
Pattern: Normal

Engagement Analysis:
  Video Score: 70
  Audio Score: 30
  Activity Score: 100
  Consistency: 100
  Final Score: 100
  Recommendation: APPROVE

Fraud Detection:
  Violations: None
  Risk Score: 0
  Recommendation: APPROVE

Result: ✅ COURT CARD GENERATED
```

---

### Scenario 2: No Video ⚠️
```yaml
Meeting Duration: 60 minutes
Attended: 60 minutes (100%)
Video: OFF
Activity: 5 mouse movements, typing
Pattern: Normal

Engagement Analysis:
  Video Score: 0
  Audio Score: 30
  Activity Score: 100
  Consistency: 100
  Final Score: 65
  Recommendation: FLAG_FOR_REVIEW (no video)

Fraud Detection:
  Violations: None
  Risk Score: 0
  Recommendation: APPROVE

Result: ⚠️ FLAGGED FOR MANUAL REVIEW
Reason: Cannot verify visual presence
```

---

### Scenario 3: Tab Left Open ❌
```yaml
Meeting Duration: 60 minutes
"Attended": 60 minutes
Video: OFF
Activity: ZERO
Pattern: No engagement

Engagement Analysis:
  Video Score: 0
  Audio Score: 0
  Activity Score: 0
  Consistency: 100
  Final Score: 20
  Recommendation: REJECT

Fraud Detection:
  Violations:
    - NO_ENGAGEMENT_SIGNALS (CRITICAL)
    - ENGAGEMENT_ANALYSIS_FAILED (HIGH)
  Risk Score: 55
  Recommendation: REJECT

Result: ❌ AUTO-REJECTED
Reason: No signs of actual presence
```

---

### Scenario 4: Bot Detected ❌
```yaml
Meeting Duration: 30 minutes
Attended: 30 minutes
Video: ON
Activity: 500 events (16.7 per minute)
Pattern: Perfectly timed every 3.6 seconds

Engagement Analysis:
  Video Score: 70
  Audio Score: 0
  Activity Score: 100
  Consistency: 0 (bot detected)
  Final Score: 55
  Recommendation: REJECT (automation)

Fraud Detection:
  Violations:
    - ENGAGEMENT_ANALYSIS_FAILED (HIGH)
  Risk Score: 25
  Recommendation: REJECT

Result: ❌ AUTO-REJECTED
Reason: Automated bot behavior detected
```

---

### Scenario 5: Left and Rejoined ✅
```yaml
Meeting Duration: 60 minutes
First Join: 0:00 - Left at 15:00 (15 min)
Rejoined: 20:00 - Left at 60:00 (40 min)
Total Attended: 55 minutes
Absence: 5 minutes
Net Attendance: 55 minutes (91.7%)
Video: ON
Activity: Yes

Engagement Analysis:
  Score: 100
  Recommendation: APPROVE

Fraud Detection:
  Violations: None
  Risk Score: 0
  Recommendation: APPROVE

Metadata Stored:
  absencePeriods: [
    { leftAt: "15:00", rejoinedAt: "20:00", absenceMinutes: 5 }
  ]
  rejoinCount: 1
  netAttendanceTime: 55 minutes

Result: ✅ COURT CARD GENERATED
Note: Absence period documented in metadata
```

---

## Integration Points

### When Validations Run

1. **Join Meeting** - Basic checks only (duplicate join prevention)
2. **Leave Meeting** - Check if meeting window ended
   - If YES: Full finalization
   - If NO: Mark as temporary leave, allow rejoin
3. **Scheduled Finalization** - Every 5 minutes
   - Find all COMPLETED records without court cards
   - Check if meeting window ended
   - Run full validation pipeline

### Validation Pipeline

```javascript
// backend/src/services/meetingFinalizationService.ts

async function finalizePendingMeetings() {
  // 1. Find pending records
  const records = await findCompletedWithoutCourtCards();
  
  for (const record of records) {
    // 2. Check if meeting window ended
    const meetingEndTime = calculateMeetingEnd(record);
    if (now <= meetingEndTime) continue;
    
    // 3. Run engagement analysis
    const engagement = await analyzeAttendanceEngagement(record);
    
    // 4. Run fraud detection
    const fraud = await runFraudDetection(record);
    
    // 5. Create ledger block (immutable)
    const ledger = await createLedgerBlock(record);
    
    // 6. Check auto-rejection
    if (shouldAutoReject(fraud)) {
      await rejectAttendance(record, fraud);
    } else {
      // 7. Generate court card
      const courtCard = await generateCourtCard(record);
      
      // 8. Notify Court Rep
      await queueDailyDigest(courtRepId, [record.id]);
    }
  }
}
```

---

## Monitoring & Logging

All validation steps are logged for troubleshooting:

```javascript
// Engagement Analysis
logger.info('Engagement analysis:', {
  attendanceId,
  score,
  level,
  recommendation,
  flags
});

// Fraud Detection
logger.info('Fraud detection complete:', {
  attendanceId,
  violations: violations.length,
  recommendation,
  riskScore
});

// Auto-Rejection
logger.warn('Attendance auto-rejected:', {
  attendanceId,
  reason: fraudResult.reasons.join('; ')
});

// Court Card Generation
logger.info('Court Card generated:', {
  attendanceId,
  cardNumber,
  validationStatus
});
```

---

## Updates & Version History

### Version 2.0.10 (November 1, 2025)
- Adjusted engagement rules to be more realistic for meetings
- Removed strict tab focus requirements
- Changed to "any activity" model vs "frequent activity"
- Increased weight of video verification to 50%
- Added better bot detection for automation

### Version 2.0.9 (October 31, 2025)
- Implemented delayed court card generation
- Added meeting finalization scheduler
- Improved re-join logic and absence tracking

---

## Technical Notes

### Performance
- Engagement analysis: ~50ms per record
- Fraud detection: ~100ms per record
- Court card generation: ~200ms per record
- Scheduler runs every 5 minutes in background

### Data Storage
- All raw data preserved in `metadata` field (JSONB)
- Immutable ledger blocks in `AttendanceLedger` table
- Court cards stored as separate records with signatures

### Privacy
- Video/audio data is NOT stored (only boolean flags)
- Mouse positions NOT tracked (only movement detection)
- Keyboard content NOT captured (only activity flag)

---

## Support & Questions

For questions about tracking rules or thresholds, contact the development team or file an issue in the project repository.

**Related Documentation:**
- [API Documentation](./API_DOCUMENTATION.md)
- [User Guide](./USER_GUIDE.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)

