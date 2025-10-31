# Pending Status Explainer Feature ✅

## Overview
Court Reps (POs) can now see **exactly why** a court card validation is "PENDING" instead of completed.

## What Was Added

### 1. Detailed "Why Pending" Section
Each pending meeting now shows a highlighted box explaining what's missing:

```
┌─────────────────────────────────────────┐
│ PENDING                                  │
│ ┌─────────────────────────────────────┐ │
│ │ Why Pending:                         │ │
│ │ ✍️ Missing participant signature    │ │
│ │ ✍️ Missing host signature           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 2. Summary Alert at Top
When expanding a participant's details, POs see an alert summarizing all pending items:

```
⚠️ 2 Pending Meetings
Action needed: Missing participant signature, Missing host signature
```

### 3. Possible Pending Reasons

The system detects and shows these specific reasons:

#### Meeting Status
- **⏳ Meeting still in progress**
  - Meeting hasn't ended yet
  - Duration still being tracked

- **⏳ Awaiting court card generation**
  - Meeting complete but card not generated yet
  - Usually resolves within seconds

#### Signature Requirements
- **✍️ Missing participant signature**
  - Participant needs to sign their court card
  - Can be done from Participant Dashboard → My Progress

- **✍️ Missing host/meeting leader signature**
  - Meeting host needs to verify attendance
  - Participant must request via email link

#### Validation Issues
- **⚠️ Critical violation(s)**
  - Attendance below 80% threshold
  - Active time below 80% threshold
  - Idle time above 20% threshold
  - Other compliance violations

#### Final Review
- **⏳ Awaiting Court Rep review**
  - All signatures present
  - All criteria met
  - Waiting for PO final approval

## Visual Design

### Pending Status Box
```
┌──────────────────────────────────────────────┐
│ ⚠️ Warning colored background                 │
│ Bold header: "Why Pending:"                   │
│ Clear emoji indicators (⏳ ✍️ ⚠️)             │
│ Easy-to-read list format                      │
└──────────────────────────────────────────────┘
```

### Summary Alert
```
┌──────────────────────────────────────────────┐
│ ⚠️ 2 Pending Meetings                         │
│ Action needed: Missing participant signature, │
│ Missing host signature                        │
└──────────────────────────────────────────────┘
```

## User Experience

### Before
```
Status: PENDING
(No explanation - PO doesn't know why)
```

### After
```
Status: PENDING

Why Pending:
✍️ Missing participant signature
✍️ Missing host/meeting leader signature
```

## Benefits

### For Court Reps (POs)
✅ **Instant clarity** - Know exactly what's blocking completion
✅ **Actionable info** - Can contact participant/host directly
✅ **Quick overview** - Summary shows all pending items at once
✅ **Less frustration** - No more guessing why cards aren't ready

### For Participants
✅ **Clear expectations** - Know what they need to do
✅ **Faster resolution** - Can take action immediately
✅ **Better communication** - PO can guide them specifically

### For System Efficiency
✅ **Reduced support calls** - Self-explanatory status
✅ **Faster completion** - Users know exactly what to do
✅ **Better compliance** - Clear requirements drive action

## Technical Details

### Detection Logic
```typescript
// Check meeting status
if (meeting.status === 'IN_PROGRESS') {
  pendingReasons.push('⏳ Meeting still in progress');
}

// Check court card existence
if (!meeting.courtCard) {
  pendingReasons.push('⏳ Awaiting court card generation');
}

// Check signatures
const signatures = meeting.courtCard?.signatures || [];
const hasParticipantSignature = signatures.some(
  sig => sig.signerRole === 'PARTICIPANT'
);
const hasHostSignature = signatures.some(
  sig => sig.signerRole === 'MEETING_HOST'
);

if (!hasParticipantSignature) {
  pendingReasons.push('✍️ Missing participant signature');
}
if (!hasHostSignature) {
  pendingReasons.push('✍️ Missing host/meeting leader signature');
}

// Check violations
const criticalViolations = violations.filter(
  v => v.severity === 'CRITICAL'
);
if (criticalViolations.length > 0) {
  pendingReasons.push(`⚠️ ${criticalViolations.length} critical violation(s)`);
}

// Default if nothing else
if (pendingReasons.length === 0) {
  pendingReasons.push('⏳ Awaiting Court Rep review');
}
```

### Display Components
1. **Individual Meeting Row**: Shows reasons specific to that meeting
2. **Summary Alert**: Aggregates reasons across all pending meetings
3. **Violation Details**: Still shows critical/warning violations below

## Files Modified

### Frontend
- ✅ `frontend/src/pages/CourtRepDashboardPage.tsx`
  - Added `pendingReasons` calculation logic
  - Added "Why Pending" display box
  - Added summary alert for multiple pending meetings

## Example Scenarios

### Scenario 1: Fresh Meeting
```
Status: PENDING
Why Pending:
⏳ Awaiting court card generation
```
**Action**: Wait a few seconds for auto-generation

### Scenario 2: Missing Signatures
```
Status: PENDING
Why Pending:
✍️ Missing participant signature
✍️ Missing host/meeting leader signature
```
**Action**: Contact participant to sign, request host signature

### Scenario 3: Low Attendance
```
Status: PENDING
Why Pending:
⚠️ 1 critical violation(s)

CRITICAL:
• Attendance below 80% threshold (attended only 45%)
```
**Action**: Review violation, may not be approvable

### Scenario 4: Ready for Review
```
Status: PENDING
Why Pending:
⏳ Awaiting Court Rep review
```
**Action**: PO can review and approve

## Deployment Status

✅ **Code Complete**
✅ **Staged for Commit**
⏳ **Ready to Push**

Once deployed, Court Reps will immediately see detailed explanations for all pending court cards!

## Testing

### How to Test
1. **Login as Court Rep**
2. **Expand a participant** with pending meetings
3. **Look for**:
   - Warning alert at top showing pending count
   - "Why Pending" box under each PENDING status
   - Specific reasons listed with emoji indicators
4. **Verify reasons match** actual meeting state

### Test Cases
- ✅ Meeting in progress → Shows "Meeting still in progress"
- ✅ Meeting complete, no card → Shows "Awaiting court card generation"
- ✅ Card exists, no signatures → Shows "Missing participant/host signature"
- ✅ Signatures present, violations → Shows "Critical violation(s)"
- ✅ All complete → Shows "Awaiting Court Rep review"

## Next Steps

Once deployed, monitor for:
1. **User feedback** - Do POs find the explanations helpful?
2. **Completion rates** - Do more pending items get resolved faster?
3. **Support tickets** - Fewer "why is this pending?" questions?

The system now provides complete transparency into the validation process! 🎉

