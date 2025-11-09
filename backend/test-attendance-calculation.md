# Attendance Calculation Verification

## Test Scenario
- **Meeting Duration**: 15 minutes
- **Join Time**: 5:58pm
- **Left**: 6:02pm (4 minutes active)
- **Rejoined**: 6:10pm (8 minutes absent)
- **Final Leave**: Assume 6:13pm (meeting end)

## Expected Calculation

### Step 1: Activity Timeline Events
1. JOIN event at 5:58pm
2. LEAVE event at 6:02pm
3. REJOIN event at 6:10pm
4. Final LEAVE at 6:13pm (or when meeting ends)

### Step 2: Leave/Rejoin Periods
- Leave period: 6:02pm to 6:10pm = 8 minutes

### Step 3: Duration Calculations
- **Total Duration**: Join (5:58pm) to Final Leave (6:13pm) = 15 minutes
- **Idle Duration**: 8 minutes (time away during leave)
- **Active Duration**: 15 - 8 = 7 minutes

### Step 4: Attendance Percentage
- **attendancePercent**: (activeDurationMin / meetingDuration) * 100 = (7 / 15) * 100 = **46.7%**
- **meetingAttendancePercent**: (totalDurationMin / meetingDurationMin) * 100 = (15 / 15) * 100 = **100%**

### Step 5: Validation Rules

#### Rule 1: Active Time (80% of time attended)
- **activePercent**: (activeDurationMin / totalDurationMin) * 100 = (7 / 15) * 100 = **46.7%**
- **Result**: ❌ FAIL (46.7% < 80%)
- **Violation**: "Only 46.7% active during meeting (required 80%). Active: 7 min, Total: 15 min."

#### Rule 2: Idle Time (max 20%)
- **idlePercent**: (idleDurationMin / totalDurationMin) * 100 = (8 / 15) * 100 = **53.3%**
- **Result**: ❌ FAIL (53.3% > 20%)
- **Violation**: "Idle for 8 minutes (53.3% of attendance). Maximum allowed: 20%."

#### Rule 3: Meeting Attendance (80% of scheduled duration)
- **meetingAttendancePercent**: (totalDurationMin / meetingDurationMin) * 100 = (15 / 15) * 100 = **100%**
- **Result**: ✅ PASS (100% >= 80%)
- **Note**: This passes because they were "present" for the full meeting duration, even though inactive

### Expected Validation Result
- **Status**: ❌ **FAILED**
- **Critical Violations**: 2
  1. LOW_ACTIVE_TIME (46.7% < 80%)
  2. EXCESSIVE_IDLE_TIME (53.3% > 20%)

## Key Insight
The system uses **totalDurationMin** (time from join to leave) vs **activeDurationMin** (time actually active) to determine:
- **Rule 1 & 2**: Check active/idle percentages of **totalDurationMin**
- **Rule 3**: Checks if **totalDurationMin** meets 80% of **meetingDurationMin**

This means even if someone stays for the full meeting duration, if they're idle/absent for too long, they'll fail.

