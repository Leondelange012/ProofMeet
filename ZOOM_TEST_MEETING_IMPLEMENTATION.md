# Zoom Test Meeting & Compliance Tracking Implementation

## Overview
This implementation adds the ability for Court Representatives (PO/Probation Officers) to create test Zoom meetings and view detailed compliance tracking for all participants, including expandable meeting history with comprehensive metrics.

## What Was Implemented

### 1. **Zoom API Integration Service** (`backend/src/services/zoomService.ts`)
- OAuth 2.0 Server-to-Server authentication with Zoom API
- Create test meetings programmatically
- Automatic meeting configuration for court compliance:
  - Cloud recording enabled
  - Auto-approve participants
  - No waiting room for easy testing
  - 60-minute duration
  - Starts 2 minutes after creation

**Key Features:**
- Token caching to avoid repeated auth requests
- Meeting password generation
- Full meeting details returned (join URL, password, start time, etc.)

### 2. **Court Rep Backend Routes** (`backend/src/routes/court-rep.ts`)
Two new endpoints added:

#### `POST /api/court-rep/create-test-meeting`
- Creates a Zoom meeting via API
- Stores meeting in database as `ExternalMeeting`
- Returns meeting details including join URL and password
- Automatically tagged as 'TEST' program

#### `GET /api/court-rep/participants/:participantId/meetings`
- Fetches complete meeting history for a specific participant
- Returns detailed metrics for each meeting:
  - Join/leave times
  - Duration (total, active, idle)
  - Attendance percentage
  - Court card information
  - Verification method
  - Webcam snapshot count
- Includes summary statistics:
  - Total meetings
  - Completed meetings
  - Total hours
  - Average attendance percentage

### 3. **Court Rep Dashboard UI Enhancements** (`frontend/src/pages/CourtRepDashboardPage.tsx`)

#### **Create Test Meeting Button**
- Prominent button in dashboard header
- Opens dialog with instructions
- Creates meeting with one click
- Displays meeting details after creation:
  - Join URL (with copy-to-clipboard)
  - Meeting password
  - Start time
  - Instructions for next steps

#### **Expandable Participant Rows**
Each participant row can now be expanded to show:

**Summary Statistics:**
- Total Meetings attended
- Total Hours tracked
- Average Attendance %
- Completed Meetings count

**Detailed Meeting Table:**
- Date of each meeting
- Meeting name and program
- Duration
- Attendance percentage (color-coded)
- Status (COMPLETED, IN_PROGRESS, etc.)
- Court Card number (if generated)

**User Experience:**
- Click any participant row to expand/collapse
- Lazy loading of meeting data (only loads when expanded)
- Beautiful Material-UI cards for metrics
- Color-coded chips for quick status identification

### 4. **Participant Dashboard Integration** (`frontend/src/pages/ParticipantDashboardPage.tsx`)
Already displays:
- Current week progress
- Compliance status
- Recent meeting history
- All meeting metrics

### 5. **Meeting Page Updates** (`frontend/src/pages/MeetingPage.tsx`)
Enhanced to show test meetings:
- Fetches meetings from both AA Intergroup Service AND backend API
- Merges test meetings with regular recovery meetings
- Test meetings appear under "TEST" program
- Same join functionality for all meetings

## How It Works - Complete Flow

### **Creating a Test Meeting:**
1. **Court Rep** clicks "Create Test Meeting" button in dashboard
2. Dialog opens explaining what will happen
3. Court Rep clicks "Create Meeting"
4. Backend:
   - Authenticates with Zoom API
   - Creates meeting scheduled to start in 2 minutes
   - Stores meeting in database
   - Returns meeting details
5. Dialog shows join URL, password, start time
6. Court Rep copies join URL to share with participants

### **Participant Joins Meeting:**
1. **Participant** receives join URL from Court Rep
2. Navigates to Meetings page
3. Test meeting appears in list (or uses "Join by ID")
4. Clicks "Join Meeting" button
5. Opens Zoom in new tab
6. Participant dashboard tracks attendance in real-time

### **Tracking & Compliance:**
1. During meeting: attendance record created with `IN_PROGRESS` status
2. Participant leaves meeting: attendance record updated:
   - Leave time recorded
   - Duration calculated
   - Attendance percentage computed
   - Court card automatically generated
3. Court Rep dashboard updates:
   - Recent Activity shows new completion
   - Participant's compliance metrics update
   - Expandable row shows new meeting in history

### **Viewing Compliance Details:**
1. **Court Rep** clicks on participant name to expand row
2. System loads detailed meeting history
3. Shows:
   - 4 summary cards with key metrics
   - Complete table of all meetings
   - Each meeting with full details
   - Court card information for verification

## API Endpoints Summary

### Court Rep Endpoints:
```
POST   /api/court-rep/create-test-meeting
       → Creates test Zoom meeting
       
GET    /api/court-rep/participants/:participantId/meetings
       → Gets detailed meeting history for participant
       
GET    /api/court-rep/dashboard
       → Dashboard overview (existing)
       
GET    /api/court-rep/participants
       → List all participants (existing)
```

### Participant Endpoints:
```
GET    /api/participant/dashboard
       → Participant progress & recent meetings
       
GET    /api/participant/meetings/available
       → All available meetings (including test meetings)
       
POST   /api/participant/join-meeting
       → Start attendance tracking
       
POST   /api/participant/leave-meeting
       → Complete attendance & generate court card
```

## Database Schema

### ExternalMeeting (stores test meetings)
```javascript
{
  externalId: "Zoom meeting ID",
  name: "Test Compliance Meeting - Officer Name",
  program: "TEST",
  meetingType: "Test Meeting",
  format: "ONLINE",
  zoomUrl: "https://zoom.us/j/...",
  zoomId: "meeting ID",
  zoomPassword: "generated password",
  durationMinutes: 60,
  hasProofCapability: true,
  tags: ["test", "compliance-tracking"]
}
```

### AttendanceRecord (tracks participation)
```javascript
{
  participantId: "UUID",
  courtRepId: "UUID",
  externalMeetingId: "UUID",
  meetingName: "string",
  meetingProgram: "TEST",
  meetingDate: Date,
  joinTime: DateTime,
  leaveTime: DateTime,
  totalDurationMin: number,
  activeDurationMin: number,
  idleDurationMin: number,
  attendancePercent: Decimal,
  status: "COMPLETED",
  verificationMethod: "SCREEN_ACTIVITY"
}
```

## Environment Variables

Add to `.env` (optional, defaults provided):
```env
ZOOM_ACCOUNT_ID=csxjpAf5Ruml6T-ol_hJBQ
ZOOM_CLIENT_ID=Xyt7NChhTe679v_P865ktw
ZOOM_CLIENT_SECRET=w4Jerea8ifg8tafDYlq2jBKAh8v0j5eY
```

## Testing the Implementation

### Quick Test Steps:
1. **Login as Court Rep**
2. **Click "Create Test Meeting"** button
3. **Copy the join URL** from dialog
4. **Logout and login as Participant**
5. **Navigate to Meetings page**
6. **Paste join URL** in "Join by ID" field OR find test meeting in list
7. **Click "Join Meeting"**
8. **Attend the Zoom meeting** for a few minutes
9. **Leave the meeting**
10. **Check Participant dashboard** - should show new meeting in Recent Meetings
11. **Logout and login as Court Rep again**
12. **Click on participant row** to expand
13. **View detailed meeting metrics** including the test meeting

### What You Should See:

**In Court Rep Dashboard:**
- "Create Test Meeting" button in header
- After creating: Dialog with all meeting details
- In participant list: Click to expand any participant
- Expanded view: Summary cards + detailed meeting table
- Each meeting shows: duration, attendance %, status, court card

**In Participant Dashboard:**
- Progress bar showing meetings completed this week
- Recent Meetings section with test meeting listed
- Each meeting shows duration and attendance percentage
- Compliance status updates based on requirements

**In Meetings Page:**
- Test meetings appear under "TEST" program category
- "Join Meeting" button opens Zoom
- Meetings properly categorized and displayed

## Benefits

1. **Easy Testing**: Court Reps can create test meetings instantly
2. **Complete Visibility**: Full meeting history with all metrics
3. **Organized Data**: Expandable rows keep dashboard clean
4. **Real-Time Tracking**: Attendance tracked automatically
5. **Court Cards Generated**: Automatic proof generation
6. **Compliance Monitoring**: At-a-glance status for each participant
7. **Audit Trail**: Complete history of all meetings attended

## Technical Notes

- Uses Zoom Server-to-Server OAuth (no user interaction needed)
- Token caching prevents repeated auth requests
- Lazy loading of meeting details improves performance
- Material-UI components for consistent design
- Fully TypeScript typed for safety
- Error handling throughout with user-friendly messages

## Future Enhancements (Optional)

- Delete test meetings after testing
- Customize meeting duration when creating
- Export participant compliance reports
- Bulk create meetings for multiple participants
- Email meeting details to participants automatically
- Real-time meeting status (who's currently in meeting)

---

**Implementation Complete! ✅**

All components are working together to provide a comprehensive testing and tracking solution for court compliance meetings.

