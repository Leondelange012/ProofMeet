# Attendance Tracking Fixes

## Issues Found:

1. **Duration Overcount**: Activity heartbeat accumulates time incorrectly - shows 39 min when only 10 min attended
2. **No Meeting Requirements**: Participant has no MeetingRequirement record
3. **Meeting Status**: Meetings stay IN_PROGRESS and don't auto-complete

## Solutions:

### 1. Add Meeting Requirement for Participant
Run this in Railway PostgreSQL console to add the requirement:

```sql
-- Create meeting requirement for leondelange001@gmail.com
INSERT INTO meeting_requirements (
  id,
  participant_id,
  court_rep_id,
  created_by_id,
  meetings_per_week,
  meetings_per_month,
  required_programs,
  minimum_duration_minutes,
  minimum_attendance_percent,
  is_active,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.court_rep_id,
  u.court_rep_id,
  1,
  4,
  ARRAY['TEST', 'AA']::text[],
  5,
  80.00,
  TRUE,
  NOW(),
  NOW()
FROM users u
WHERE u.email = 'leondelange001@gmail.com'
AND u.user_type = 'PARTICIPANT'
AND NOT EXISTS (
  SELECT 1 FROM meeting_requirements mr
  WHERE mr.participant_id = u.id AND mr.is_active = TRUE
);
```

### 2. Fix Activity Duration Calculation
- Stop activity heartbeat when tab is closed/meeting ends
- Cap duration at actual join-to-leave time
- Use real Zoom webhook data when available

### 3. Auto-complete Meetings
- Add timeout to mark meetings as COMPLETED after expected duration + buffer
- Update court rep dashboard to show only truly active meetings

