# Frontend Activity Tracking Integration

## Summary
Successfully integrated the new backend activity tracking endpoints into the frontend, enabling accurate tracking of leave/rejoin events and detailed activity monitoring.

## Changes Made

### 1. **authService-v2.ts** - Added Activity Tracking Methods
- `trackActivity()` - Sends activity events (MOUSE_MOVE, KEYBOARD, SCROLL, CLICK, IDLE, ACTIVE)
- `leaveMeetingTemp()` - Records temporary leave events
- `rejoinMeeting()` - Records rejoin events after temporary leave

### 2. **ActivityMonitor.tsx** - Enhanced Activity Tracking
- **Integrated new endpoints**: Now uses `authServiceV2.trackActivity()` instead of old heartbeat endpoint
- **Automatic leave/rejoin detection**: 
  - Tracks window visibility changes (tab switching, window hiding)
  - Automatically records leave events when window is hidden for 5+ seconds
  - Automatically records rejoin events when window becomes visible again
- **Real-time activity events**: 
  - Mouse movements (throttled to every 2 seconds)
  - Keyboard events (sent immediately)
  - Scroll events
  - Click events
- **Enhanced metadata**: Includes device fingerprinting, tab focus time, camera/audio status, and meeting state

### 3. **Key Features**

#### Automatic Leave/Rejoin Detection
- Detects when user switches tabs or hides window
- Waits 5 seconds before recording leave (prevents false positives from brief blurs)
- Waits 1 second before recording rejoin (confirms it's a real rejoin)
- Tracks state to prevent duplicate events

#### Activity Event Throttling
- Mouse movements throttled to every 2 seconds to reduce API calls
- Keyboard and click events sent immediately (less frequent)
- Heartbeat sent every 30 seconds with aggregated activity data

#### Window Visibility Tracking
- Uses `document.visibilitychange` API
- Tracks tab focus time for engagement metrics
- Automatically handles leave/rejoin based on visibility state

## Integration Points

### ActiveMeetingPage
- Already uses `ActivityMonitor` component
- No changes needed - ActivityMonitor handles all tracking automatically

### MeetingPage
- Handles joining meetings
- Navigates to ActiveMeetingPage where ActivityMonitor takes over

## Backend Integration

The frontend now communicates with these backend endpoints:
- `POST /api/participant/track-activity` - Real-time activity events
- `POST /api/participant/leave-meeting-temp` - Temporary leave events
- `POST /api/participant/rejoin-meeting` - Rejoin events

## Testing Checklist

- [ ] Mouse movements tracked and sent to backend
- [ ] Keyboard events tracked and sent to backend
- [ ] Scroll events tracked and sent to backend
- [ ] Click events tracked and sent to backend
- [ ] Window hiding triggers leave event (after 5 seconds)
- [ ] Window showing triggers rejoin event (after 1 second)
- [ ] Heartbeat sent every 30 seconds with aggregated data
- [ ] Activity timeline properly recorded in backend
- [ ] Duration calculations use activity timeline
- [ ] Court cards generated with accurate attendance data

## Next Steps

1. **Deploy frontend** to Vercel
2. **Test integration** with real meetings
3. **Monitor logs** for activity events
4. **Verify** court card accuracy with new tracking

## Notes

- Activity tracking is fully automatic - no user action required
- Window visibility tracking helps detect when users switch away from meeting
- All events are throttled/optimized to prevent API spam
- Backward compatible with existing heartbeat system (now uses track-activity endpoint)

