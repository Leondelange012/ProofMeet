# ProofMeet Tracking Architecture

## PRIMARY DATA SOURCE: Zoom Webhooks

**ProofMeet does NOT require participants to keep the browser tab open.**

All attendance tracking is done exclusively through Zoom's webhook system:

### How It Works

1. **Participant joins Zoom meeting**
   - Zoom fires `meeting.participant_joined` webhook
   - Backend records: `joinTime`, `participantEmail`, `zoomUserId`
   - Creates `AttendanceRecord` with status `IN_PROGRESS`

2. **Participant attends meeting**
   - NO browser tab required
   - NO activity tracking required
   - Zoom tracks everything internally

3. **Participant leaves Zoom meeting**
   - Zoom fires `meeting.participant_left` webhook
   - Zoom provides: `leaveTime`, `duration` (in seconds)
   - Backend uses **Zoom's duration as source of truth**
   - Marks `AttendanceRecord` as `COMPLETED`
   - Generates `CourtCard` immediately

### Key Code Changes (2025-11-24)

#### `backend/src/routes/zoom-webhooks.ts`
```typescript
// Use Zoom's reported duration (participant.duration in seconds)
const zoomDurationSeconds = participant.duration || 0;
const duration = Math.floor(zoomDurationSeconds / 60);

// Fallback: calculate from timestamps if Zoom didn't provide duration
const calculatedDuration = Math.floor(
  (leaveTime.getTime() - attendanceRecord.joinTime.getTime()) / (1000 * 60)
);
const finalDuration = duration > 0 ? duration : calculatedDuration;
```

#### `backend/src/services/finalizationService.ts`
```typescript
// Finalization service now WAITS for Zoom webhook
// If no leave time, return false (don't finalize yet)
if (!attendance.leaveTime) {
  logger.warn(`No Zoom leave time yet - waiting for webhook`);
  return false; // Wait for Zoom
}
```

### Browser Tab Activity (OPTIONAL)

The ProofMeet browser tab provides **optional supplementary data**:
- Mouse/keyboard activity (engagement scoring)
- Webcam snapshots (visual verification)
- Tab focus time

**These are NOT required for attendance validation.**

### Why This Matters

**Problem:** Previous system required browser tab to be open, leading to:
- False negatives (tab closed = no tracking)
- Unreliable data
- User confusion

**Solution:** Trust Zoom as the single source of truth
- Zoom always knows when someone is in a meeting
- Can't be manipulated by participant
- Court-admissible accuracy
- Works even if participant closes browser entirely

### Validation Rules

Attendance is valid if:
- ✅ Zoom reported `duration >= 80%` of scheduled meeting time
- ✅ `joinTime` and `leaveTime` from Zoom webhooks
- ✅ Email matches registered participant

Browser activity is optional for engagement scoring only.

### Testing

To test tracking:
1. Create test meeting
2. Join Zoom (use registered email)
3. **Close ProofMeet browser tab** (optional)
4. Stay in Zoom for desired duration
5. Leave Zoom
6. Check court card - should show accurate Zoom duration

### Troubleshooting

If duration is incorrect:
1. Check Railway logs for `participant_left` webhook
2. Verify `participant.duration` value from Zoom
3. Ensure participant email matches registration
4. Confirm Zoom webhooks are configured correctly

### Configuration

Zoom webhook subscription events:
- `meeting.started`
- `meeting.ended`
- `meeting.participant_joined`
- `meeting.participant_left`

Webhook URL:
```
https://proofmeet-backend-production.up.railway.app/api/webhooks/zoom
```

