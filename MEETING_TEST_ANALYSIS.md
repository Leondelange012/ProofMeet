# Meeting Test Analysis - failtest5

## Test Scenario
- **Meeting**: failtest5
- **Duration**: 15 minutes
- **Start Time**: 5:58pm
- **Join Time**: 5:58pm
- **Left**: 6:02pm (4 minutes active)
- **Rejoined**: 6:10pm (8 minutes absent)
- **Final Leave**: 6:13pm (meeting end)

## Expected Backend Processing

### 1. Activity Timeline Events
The frontend should have sent:
- `JOIN` event at 5:58pm (when meeting started)
- `MOUSE_MOVE`, `KEYBOARD`, `ACTIVE` events during first 4 minutes
- `LEAVE` event at 6:02pm (when window hidden/tab switched)
- `REJOIN` event at 6:10pm (when window became visible)
- `MOUSE_MOVE`, `KEYBOARD`, `ACTIVE` events during last 3 minutes
- `LEAVE` event at 6:13pm (final leave)

### 2. Duration Calculation
Using `calculateActiveDuration()`:
- **Total Duration**: 15 minutes (5:58pm to 6:13pm)
- **Leave/Rejoin Period**: 6:02pm to 6:10pm = 8 minutes
- **Idle Duration**: 8 minutes (time away)
- **Active Duration**: 15 - 8 = 7 minutes

### 3. Attendance Percentage
- **attendancePercent**: (7 / 15) * 100 = **46.7%**
- **meetingAttendancePercent**: (15 / 15) * 100 = **100%**

### 4. Validation Rules Applied

#### Rule 1: Active Time (80% of time attended)
- **activePercent**: (7 / 15) * 100 = **46.7%**
- **Result**: ❌ **FAIL** (46.7% < 80%)
- **Violation**: "Only 46.7% active during meeting (required 80%). Active: 7 min, Total: 15 min."

#### Rule 2: Idle Time (max 20%)
- **idlePercent**: (8 / 15) * 100 = **53.3%**
- **Result**: ❌ **FAIL** (53.3% > 20%)
- **Violation**: "Idle for 8 minutes (53.3% of attendance). Maximum allowed: 20%."

#### Rule 3: Meeting Attendance (80% of scheduled duration)
- **meetingAttendancePercent**: (15 / 15) * 100 = **100%**
- **Result**: ✅ **PASS** (100% >= 80%)
- **Note**: This passes because they were "present" for the full meeting duration

### 5. Expected Validation Result
- **Status**: ❌ **FAILED**
- **Critical Violations**: 2
  1. `LOW_ACTIVE_TIME` - 46.7% active (required 80%)
  2. `EXCESSIVE_IDLE_TIME` - 53.3% idle (max 20%)

### 6. Court Card Generation
- **Should Generate**: Yes (even failed meetings get court cards)
- **Validation Status**: `FAILED`
- **Confidence Level**: `LOW` (due to low attendance and high idle time)
- **Violations Array**: Contains 2 critical violations

## What to Check in Railway Logs

Look for these log entries (around 6:13pm - 6:18pm):

### Meeting Finalization
```
🔍 STEP 2: Processing COMPLETED meetings for court card generation...
📅 Searching for meetings from: [timestamp]
📊 Query returned: 1 records
✅ Processing attendance record: [attendanceId]
   Join Time: 2025-11-09T17:58:00.000Z
   Last Activity: [timestamp]
   Calculated Leave Time: 2025-11-09T18:13:00.000Z
   Actual Duration: 15 minutes (NOT scheduled 15 minutes)
```

### Activity Calculation
```
Activity calculation: [X] active events, [Y] idle events
   ✅ Auto-completed record [id] - Duration: 15 min (100.0%)
```

### Court Card Generation
```
🎫 Generating court card for attendance: [attendanceId]
📊 Attendance Metrics:
   • Total Duration: 15 minutes
   • Active Duration: 7 minutes
   • Idle Duration: 8 minutes
   • Attendance: 46.7%
```

### Validation
```
🚫 Critical Violations:
   1. Only 46.7% active during meeting (required 80%). Active: 7 min, Total: 15 min.
   2. Idle for 8 minutes (53.3% of attendance). Maximum allowed: 20%.
❌ VALIDATION FAILED - Critical requirements not met
```

## How to View Results

### Option 1: Railway Web Interface
1. Go to https://railway.app
2. Select your ProofMeet project
3. Click on the backend service
4. Go to "Logs" tab
5. Filter for timestamps around 6:13pm - 6:18pm
6. Look for "Processing COMPLETED meetings" and "Generating court card"

### Option 2: Court Rep Dashboard
1. Log into ProofMeet as Court Rep
2. Go to Dashboard
3. Find the participant
4. Expand their row
5. Find "failtest5" meeting
6. Click the **FAILED** status chip
7. View the detailed breakdown

### Option 3: Check Database Directly
Query the `AttendanceRecord` table for:
- `meetingName` = "failtest5"
- `status` = "COMPLETED"
- `attendancePercent` ≈ 46.7
- `activeDurationMin` = 7
- `idleDurationMin` = 8

## Expected Timeline

- **5:58pm**: Meeting started, participant joined
- **6:02pm**: Participant left (LEAVE event recorded)
- **6:10pm**: Participant rejoined (REJOIN event recorded)
- **6:13pm**: Meeting ended (scheduled end time)
- **6:13pm - 6:18pm**: Scheduler processes meeting (runs every 5 minutes)
- **6:18pm**: Court card generated with FAILED status

## Troubleshooting

If the meeting shows as PASSED instead of FAILED:
1. Check if leave/rejoin events were properly recorded
2. Verify `calculateActiveDuration()` is using the activity timeline
3. Check if validation rules are being applied correctly
4. Review the `violations` array in the court card

If the meeting is still IN_PROGRESS:
1. Wait for the scheduler to run (every 5 minutes)
2. Check if meeting end time has passed
3. Verify the scheduler is running (check logs for "STEP 2: Processing COMPLETED meetings")

