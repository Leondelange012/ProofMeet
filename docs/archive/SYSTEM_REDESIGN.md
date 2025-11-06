# ProofMeet System Redesign Document
**Version 2.0 - Court Compliance-First Architecture**

*Created: October 7, 2024*  
*Status: Requirements Finalized - Ready for Implementation*

---

## 📋 Executive Summary

### The Pivot
ProofMeet is transitioning from a general meeting management platform to a **specialized court compliance monitoring system** for recovery program attendance. This redesign fundamentally changes our user model, workflow, and value proposition.

### Key Changes
- **Old Model**: Hosts create meetings, participants join
- **New Model**: Court Representatives monitor participants attending external recovery meetings
- **Core Value**: Automated, passive compliance monitoring with detailed proof of attendance

### Why This Matters
- Eliminates manual reporting burden on participants
- Reduces workload for Court Representatives (passive monitoring)
- Provides legally-defensible attendance proof
- Scales to support multiple courts and recovery programs

---

## 👥 User Types & Roles

### 1. Court Representative (Court Rep)
**Who They Are:**
- Probation officers, case managers, court administrators
- Responsible for monitoring court-ordered participants
- Need compliance data for legal proceedings

**Registration Requirements:**
- Corporate/court email address (e.g., `@probation.ca.gov`, `@courts.texas.gov`)
- Email domain verification (ensures legitimacy)
- Automatic activation after email verification

**What They Can Do:**
- View all assigned participants and their registration status
- Monitor real-time attendance updates on dashboard
- Optionally set meeting requirements (e.g., "3 meetings/week")
- Receive daily digest emails of all participant meetings
- Access detailed attendance reports with tracking metrics
- Export compliance data for court filings

**What They DON'T Do:**
- Create meetings (meetings come from external APIs)
- Manually approve each attendance (automatic proof acceptance)
- Micromanage which specific meetings participants attend

### 2. Court-Ordered Participant
**Who They Are:**
- Individuals with court-ordered recovery meeting attendance requirements
- Under supervision of a specific Court Representative
- Need flexibility to attend meetings in their area/schedule

**Registration Requirements:**
- Email address
- Case number (links to court records)
- Court Representative's email or ID (creates the linkage)
- Email confirmation required

**What They Can Do:**
- Browse all available recovery meetings (AA, NA, SMART, etc.)
- View "My Assigned Meetings" page (if Court Rep sets requirements)
- Join meetings and have attendance automatically tracked
- View their own compliance progress
- See which meetings count toward their requirements

**What Gets Tracked Automatically:**
- Meeting join/leave times
- Total duration in meeting
- Visual activity timestamps (active vs. idle)
- Meeting details (type, program, location)
- Court Card generation (attendance proof)

---

## 🔄 Core User Flows

### Flow 1: Court Representative Registration & Setup
```
1. Court Rep visits registration page
2. Enters corporate email (e.g., officer.smith@probation.ca.gov)
3. System validates email domain against approved court domains
4. Receives email verification link
5. Confirms email → Account activated
6. Logs in to empty dashboard
7. Waits for participants to register under their supervision
```

### Flow 2: Participant Registration & Linkage
```
1. Participant receives court order with Court Rep's email/ID
2. Visits registration page
3. Enters:
   - Personal email
   - Case number
   - Court Rep email/ID
4. System validates Court Rep exists
5. Receives email confirmation
6. Confirms email → Account activated
7. Appears on Court Rep's dashboard as "Registered"
8. Can now browse and attend meetings
```

### Flow 3: Meeting Attendance & Automatic Reporting
```
1. Participant browses recovery meetings on main dashboard
2. Selects meeting to attend (e.g., "Tuesday Night AA - Downtown")
3. Clicks "Join Meeting"
4. System starts tracking:
   - Join time
   - Visual activity (webcam/screen presence)
   - Mouse/keyboard activity
   - Duration
5. Participant attends meeting
6. Meeting ends or participant leaves
7. System automatically:
   - Calculates total duration
   - Generates Court Card with all metrics
   - Updates Court Rep's dashboard in real-time
   - Queues for daily digest email
8. Court Rep sees update immediately on dashboard
9. No approval needed - automatically accepted as proof
```

### Flow 4: Court Rep Monitoring (Passive)
```
1. Court Rep logs in to dashboard
2. Sees list of all assigned participants
3. For each participant, views:
   - Registration status
   - Total meetings attended
   - Compliance percentage (if requirements set)
   - Recent meeting history
4. Clicks participant name for detailed breakdown:
   - Individual meeting details
   - Duration and activity metrics
   - Timeline of attendance
5. Receives daily digest email at end of day
6. Exports compliance reports as needed for court
```

### Flow 5: Optional Meeting Requirements Assignment
```
1. Court Rep clicks on participant profile
2. Selects "Set Requirements" (optional feature)
3. Chooses:
   - Number of meetings per week (e.g., 3)
   - Specific programs (e.g., AA, NA) or "Any"
   - Duration requirement (e.g., must attend 90% of meeting)
4. Participant sees requirements on "My Assigned Meetings" page
5. System tracks progress automatically
6. Dashboard shows compliance: "3/3 meetings this week" ✅
```

---

## 🗄️ Database Schema Redesign

### New/Modified Tables

#### **Users Table** (Modified)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Role-based fields
  user_type ENUM('COURT_REP', 'PARTICIPANT') NOT NULL,
  
  -- Court Rep specific
  court_domain VARCHAR(255), -- e.g., "probation.ca.gov"
  court_name VARCHAR(255),   -- e.g., "Los Angeles County Probation"
  rep_badge_number VARCHAR(100),
  
  -- Participant specific
  case_number VARCHAR(100),
  court_rep_id UUID REFERENCES users(id), -- Links to their Court Rep
  
  -- Common fields
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_court_rep ON users(court_rep_id);
CREATE INDEX idx_users_case_number ON users(case_number);
CREATE INDEX idx_users_type ON users(user_type);
```

#### **Meeting Requirements Table** (NEW)
```sql
CREATE TABLE meeting_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID REFERENCES users(id) NOT NULL,
  court_rep_id UUID REFERENCES users(id) NOT NULL,
  
  -- Requirements
  meetings_per_week INTEGER DEFAULT 0,
  meetings_per_month INTEGER DEFAULT 0,
  required_programs TEXT[], -- ['AA', 'NA', 'SMART']
  minimum_duration_minutes INTEGER DEFAULT 60,
  minimum_attendance_percentage DECIMAL(5,2) DEFAULT 90.00,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_requirements_participant ON meeting_requirements(participant_id);
```

#### **External Meetings Table** (NEW)
```sql
-- Meetings from external APIs (AA, NA, SMART, etc.)
CREATE TABLE external_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(255) UNIQUE, -- ID from external API
  
  -- Meeting details
  name VARCHAR(255) NOT NULL,
  program VARCHAR(50) NOT NULL, -- 'AA', 'NA', 'SMART', etc.
  meeting_type VARCHAR(100),
  description TEXT,
  
  -- Schedule
  day_of_week VARCHAR(20),
  time TIME,
  timezone VARCHAR(50),
  duration_minutes INTEGER,
  
  -- Format
  format ENUM('ONLINE', 'IN_PERSON', 'HYBRID') NOT NULL,
  zoom_url TEXT,
  zoom_id VARCHAR(50),
  zoom_password VARCHAR(50),
  location VARCHAR(255),
  address TEXT,
  
  -- Metadata
  tags TEXT[],
  has_proof_capability BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_external_meetings_program ON external_meetings(program);
CREATE INDEX idx_external_meetings_format ON external_meetings(format);
```

#### **Attendance Records Table** (Modified)
```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core linkage
  participant_id UUID REFERENCES users(id) NOT NULL,
  court_rep_id UUID REFERENCES users(id) NOT NULL,
  external_meeting_id UUID REFERENCES external_meetings(id),
  
  -- Meeting session info
  meeting_name VARCHAR(255),
  meeting_program VARCHAR(50),
  meeting_date DATE NOT NULL,
  
  -- Timing
  join_time TIMESTAMP NOT NULL,
  leave_time TIMESTAMP,
  total_duration_minutes INTEGER,
  
  -- Activity tracking
  activity_timeline JSONB, -- Array of {timestamp, status: 'active'|'idle'}
  active_duration_minutes INTEGER,
  idle_duration_minutes INTEGER,
  attendance_percentage DECIMAL(5,2),
  
  -- Visual verification
  webcam_snapshots_count INTEGER DEFAULT 0,
  screen_activity_logs JSONB,
  
  -- Status
  status ENUM('IN_PROGRESS', 'COMPLETED', 'FLAGGED') DEFAULT 'IN_PROGRESS',
  is_valid BOOLEAN DEFAULT TRUE,
  
  -- Flags
  flags JSONB, -- [{type: 'EARLY_LEAVE', severity: 'MEDIUM', message: '...'}]
  
  -- Court Card
  court_card_generated BOOLEAN DEFAULT FALSE,
  court_card_data JSONB,
  court_card_sent_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_attendance_participant ON attendance_records(participant_id);
CREATE INDEX idx_attendance_court_rep ON attendance_records(court_rep_id);
CREATE INDEX idx_attendance_date ON attendance_records(meeting_date);
CREATE INDEX idx_attendance_status ON attendance_records(status);
```

#### **Daily Digest Queue Table** (NEW)
```sql
CREATE TABLE daily_digest_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  court_rep_id UUID REFERENCES users(id) NOT NULL,
  digest_date DATE NOT NULL,
  attendance_record_ids UUID[] NOT NULL,
  status ENUM('PENDING', 'SENT', 'FAILED') DEFAULT 'PENDING',
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_digest_court_rep ON daily_digest_queue(court_rep_id);
CREATE INDEX idx_digest_date ON daily_digest_queue(digest_date);
```

#### **Court Cards Table** (NEW)
```sql
CREATE TABLE court_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_record_id UUID REFERENCES attendance_records(id) UNIQUE NOT NULL,
  
  -- Identification
  participant_email VARCHAR(255) NOT NULL,
  case_number VARCHAR(100) NOT NULL,
  court_rep_email VARCHAR(255) NOT NULL,
  
  -- Meeting details
  meeting_name VARCHAR(255) NOT NULL,
  meeting_program VARCHAR(50) NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_duration_minutes INTEGER NOT NULL,
  
  -- Attendance proof
  join_time TIMESTAMP NOT NULL,
  leave_time TIMESTAMP NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  attendance_percentage DECIMAL(5,2) NOT NULL,
  
  -- Activity summary
  active_periods JSONB NOT NULL, -- Detailed timeline
  verification_method VARCHAR(50), -- 'WEBCAM', 'SCREEN_ACTIVITY', 'BOTH'
  
  -- Legal metadata
  generated_at TIMESTAMP DEFAULT NOW(),
  card_hash VARCHAR(64) UNIQUE, -- SHA-256 for integrity verification
  is_tampered BOOLEAN DEFAULT FALSE,
  
  -- Export
  pdf_url TEXT,
  exported_at TIMESTAMP
);

CREATE INDEX idx_court_cards_participant ON court_cards(participant_email);
CREATE INDEX idx_court_cards_case ON court_cards(case_number);
CREATE INDEX idx_court_cards_date ON court_cards(meeting_date);
```

---

## 🔌 API Architecture

### Authentication Endpoints
```
POST   /api/auth/register/court-rep
POST   /api/auth/register/participant
POST   /api/auth/verify-email/:token
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Court Representative Endpoints
```
GET    /api/court-rep/dashboard
GET    /api/court-rep/participants
GET    /api/court-rep/participants/:id
POST   /api/court-rep/participants/:id/requirements
PUT    /api/court-rep/participants/:id/requirements
DELETE /api/court-rep/participants/:id/requirements
GET    /api/court-rep/attendance-reports
GET    /api/court-rep/daily-digest
POST   /api/court-rep/export-compliance/:participantId
```

### Participant Endpoints
```
GET    /api/participant/dashboard
GET    /api/participant/meetings/available
GET    /api/participant/meetings/assigned
GET    /api/participant/requirements
GET    /api/participant/my-attendance
POST   /api/participant/join-meeting
POST   /api/participant/leave-meeting
```

### External Meetings Endpoints
```
GET    /api/meetings/external
GET    /api/meetings/external/:id
GET    /api/meetings/external/by-program
POST   /api/meetings/sync-external (Admin/Cron)
```

### Attendance Tracking Endpoints
```
POST   /api/attendance/start
POST   /api/attendance/activity-ping
POST   /api/attendance/end
GET    /api/attendance/records/:participantId
GET    /api/attendance/court-card/:recordId
```

### Admin/System Endpoints
```
POST   /api/admin/sync-meetings
GET    /api/admin/system-health
POST   /api/admin/send-daily-digests
GET    /api/admin/approved-court-domains
POST   /api/admin/approved-court-domains
```

---

## 📊 Dashboard Designs

### Court Representative Dashboard

#### Overview Section
```
┌─────────────────────────────────────────────────────┐
│  Welcome, Officer Smith                             │
│  Los Angeles County Probation                       │
│                                                     │
│  📊 Your Participants Overview                     │
│  ├─ Total Assigned: 24                            │
│  ├─ Active This Week: 21                          │
│  ├─ Compliance Rate: 87.5%                        │
│  └─ Meetings Today: 8                             │
└─────────────────────────────────────────────────────┘
```

#### Participants List
```
┌─────────────────────────────────────────────────────┐
│  Participants                          [+ Add New]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✅ John Doe (#2024-12345)                         │
│     └─ 3/3 meetings this week | 95% attendance     │
│                                                     │
│  ⚠️  Jane Smith (#2024-67890)                      │
│     └─ 1/3 meetings this week | 65% attendance     │
│                                                     │
│  ✅ Mike Johnson (#2024-11111)                     │
│     └─ 4/3 meetings this week | 100% attendance    │
│                                                     │
│  🔴 Sarah Williams (#2024-22222)                   │
│     └─ 0/3 meetings this week | 0% attendance      │
└─────────────────────────────────────────────────────┘
```

#### Recent Activity Feed
```
┌─────────────────────────────────────────────────────┐
│  Recent Activity                    [Daily Digest]  │
├─────────────────────────────────────────────────────┤
│  🕐 2 hours ago                                     │
│  John Doe completed "Tuesday Night AA"              │
│  Duration: 62 min | Activity: 98%                   │
│                                          [Details]  │
│                                                     │
│  🕐 4 hours ago                                     │
│  Mike Johnson completed "SMART Recovery"            │
│  Duration: 58 min | Activity: 95%                   │
│                                          [Details]  │
└─────────────────────────────────────────────────────┘
```

### Participant Dashboard

#### Main Section
```
┌─────────────────────────────────────────────────────┐
│  Welcome, John Doe                                  │
│  Case #2024-12345 | Officer: Smith                  │
│                                                     │
│  📈 Your Progress This Week                         │
│  ├─ Meetings Attended: 3/3 ✅                      │
│  ├─ Average Attendance: 95%                        │
│  └─ Status: On Track                               │
└─────────────────────────────────────────────────────┘
```

#### Navigation Tabs
```
┌─────────────────────────────────────────────────────┐
│  [All Meetings] [My Assigned Meetings] [My History] │
└─────────────────────────────────────────────────────┘
```

#### All Meetings View (Browse Recovery Meetings)
```
┌─────────────────────────────────────────────────────┐
│  🔵 Alcoholics Anonymous (AA)                       │
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │ Morning Reflections                   │          │
│  │ Monday at 7:00 AM PST                │          │
│  │ 🎥 Online (Zoom)                      │          │
│  │                      [Join Meeting]   │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │ Downtown Recovery                     │          │
│  │ Tuesday at 6:00 PM PST               │          │
│  │ 📍 In-Person (Downtown)              │          │
│  │                      [Check In]       │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  🟢 Narcotics Anonymous (NA)                        │
│  ...                                               │
└─────────────────────────────────────────────────────┘
```

#### My Assigned Meetings View
```
┌─────────────────────────────────────────────────────┐
│  Your Requirements (Set by Officer Smith)           │
│  └─ 3 AA or NA meetings per week                   │
│                                                     │
│  This Week's Progress: 3/3 ✅                       │
│                                                     │
│  ✅ Completed:                                      │
│  ├─ Monday: Morning Reflections (AA) - 62 min      │
│  ├─ Tuesday: Evening Hope (NA) - 58 min            │
│  └─ Thursday: Step Study (AA) - 65 min             │
│                                                     │
│  📅 Upcoming Opportunities:                         │
│  └─ Saturday: Weekend Recovery (AA) - 10:00 AM     │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Attendance Tracking System

### Visual Activity Tracking

#### Webcam-Based Verification
```javascript
// Periodically capture frame and verify face presence
{
  timestamp: "2024-10-07T19:35:22Z",
  status: "active",
  confidence: 0.95,
  face_detected: true,
  looking_at_screen: true
}
```

#### Screen Activity Verification
```javascript
// Track mouse/keyboard activity
{
  timestamp: "2024-10-07T19:35:22Z",
  mouse_movements: 45,
  keyboard_inputs: 12,
  tab_focused: true,
  status: "active"
}
```

#### Combined Activity Timeline
```javascript
{
  meeting_id: "aa-001",
  participant_id: "user-123",
  activity_timeline: [
    { time: "19:00:00", status: "active", method: "webcam+screen" },
    { time: "19:05:00", status: "active", method: "webcam+screen" },
    { time: "19:10:00", status: "idle", method: "screen", note: "No activity for 2 min" },
    { time: "19:12:00", status: "active", method: "webcam+screen" },
    // ... continues
  ],
  summary: {
    total_duration: 62,
    active_duration: 59,
    idle_duration: 3,
    attendance_percentage: 95.2
  }
}
```

### Court Card Generation

#### Automatic Triggers
1. Participant leaves meeting
2. Meeting end time reached
3. System detects inactivity > 10 minutes

#### Court Card Contents
```
╔════════════════════════════════════════════════════╗
║             COURT ATTENDANCE CARD                  ║
║              Official Proof of Attendance          ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║  Participant: John Doe                            ║
║  Email: john.doe@example.com                      ║
║  Case Number: 2024-12345                          ║
║                                                    ║
║  Court Representative: Officer Sarah Smith         ║
║  Email: s.smith@probation.ca.gov                  ║
║                                                    ║
║  Meeting: Tuesday Night AA - Downtown             ║
║  Program: Alcoholics Anonymous                     ║
║  Date: October 7, 2024                            ║
║  Time: 7:00 PM - 8:02 PM PST                      ║
║                                                    ║
║  ATTENDANCE DETAILS:                               ║
║  ├─ Join Time: 7:00 PM                            ║
║  ├─ Leave Time: 8:02 PM                           ║
║  ├─ Total Duration: 62 minutes                    ║
║  ├─ Active Time: 59 minutes (95.2%)               ║
║  └─ Status: VALID ✓                               ║
║                                                    ║
║  VERIFICATION METHOD:                              ║
║  ├─ Webcam Presence: Verified                     ║
║  ├─ Screen Activity: Verified                     ║
║  └─ Confidence Level: High                        ║
║                                                    ║
║  Card ID: CC-2024-12345-001                       ║
║  Generated: October 7, 2024 8:02 PM               ║
║  Hash: a3f5b9c...                                 ║
║                                                    ║
╚════════════════════════════════════════════════════╝

This card is automatically accepted as legal proof
of attendance. No manual approval required.
```

---

## 📧 Email Notification System

### Daily Digest Email (to Court Rep)

**Subject:** Daily Attendance Report - October 7, 2024

```
Officer Smith,

Here's today's attendance summary for your 24 assigned participants:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 TODAY'S OVERVIEW
├─ Total Meetings Attended: 8
├─ Participants Active: 6
├─ Average Attendance: 94.3%
└─ Issues Requiring Attention: 1 ⚠️

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ COMPLETED MEETINGS

1. John Doe (#2024-12345)
   Tuesday Night AA - Downtown
   Duration: 62 min | Attendance: 95.2%
   Status: Valid ✓
   [View Court Card]

2. Mike Johnson (#2024-11111)
   SMART Recovery Workshop
   Duration: 58 min | Attendance: 94.8%
   Status: Valid ✓
   [View Court Card]

3. Lisa Brown (#2024-33333)
   Women's NA Group
   Duration: 67 min | Attendance: 98.5%
   Status: Valid ✓
   [View Court Card]

... (5 more)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ REQUIRES ATTENTION

Jane Smith (#2024-67890)
└─ Only 1/3 required meetings this week
   Last attendance: 3 days ago
   [View Details]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[View Full Dashboard] | [Export All Reports]

—
ProofMeet Court Compliance System
Automated Attendance Monitoring
```

### Participant Confirmation Email

**Subject:** Meeting Attendance Confirmed - Tuesday Night AA

```
Hi John,

Your attendance has been recorded and reported to Officer Smith.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ATTENDANCE CONFIRMED

Meeting: Tuesday Night AA - Downtown
Date: October 7, 2024
Duration: 62 minutes
Attendance: 95.2%

Your Court Card has been automatically sent to your
Court Representative.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 YOUR PROGRESS

This Week: 3/3 meetings ✅
Status: On Track

[View Full History] | [Download Court Card]

—
ProofMeet
```

---

## 🔒 Security & Compliance

### Email Domain Verification for Court Reps
```javascript
const approvedCourtDomains = [
  'probation.ca.gov',
  'courts.ca.gov',
  'courts.texas.gov',
  'probation.texas.gov',
  'nycourts.gov',
  // ... expandable list
];

function validateCourtEmail(email) {
  const domain = email.split('@')[1];
  return approvedCourtDomains.includes(domain);
}
```

### Court Card Integrity
- SHA-256 hash of card contents
- Tamper detection on retrieval
- Immutable once generated
- Blockchain integration (future consideration)

### Data Privacy
- HIPAA-compliant data handling
- Participant data only visible to assigned Court Rep
- Encrypted database storage
- Audit logs for all access

### Legal Considerations
- Court Cards are legally defensible documents
- Automatic acceptance as proof (no manual approval)
- Timestamp and activity verification
- Export capabilities for court filings

---

## 📈 Success Metrics

### For Court Representatives
- Time saved per participant (target: 90% reduction)
- Compliance visibility (target: real-time updates)
- Report generation time (target: < 30 seconds)

### For Participants
- Meeting flexibility (access to 100+ meetings)
- Zero manual reporting burden
- Clear progress visibility

### For the System
- Attendance tracking accuracy (target: 99%+)
- Court Card generation success rate (target: 100%)
- Uptime for critical compliance periods (target: 99.9%)
- Email delivery success rate (target: 99%+)

---

## 🎨 User Experience Principles

### Court Representatives
1. **Passive Monitoring**: Dashboard updates automatically
2. **At-a-Glance Status**: Quick identification of issues
3. **Zero Manual Work**: No approvals or data entry needed
4. **Professional Reports**: Export-ready compliance data

### Participants
1. **Flexibility**: Choose meetings that fit their schedule
2. **Transparency**: Always see their progress
3. **Automatic Proof**: No manual reporting stress
4. **Clear Requirements**: Know exactly what's expected

---

## 🚀 MVP (Minimum Viable Product) Features

### Phase 1 - Core Functionality
- [ ] Dual registration system (Court Rep + Participant)
- [ ] Email verification for both user types
- [ ] Court Rep dashboard with participant list
- [ ] Participant dashboard with meeting browser
- [ ] Basic attendance tracking (join/leave times)
- [ ] Court Card generation
- [ ] Real-time dashboard updates

### Phase 2 - Enhanced Tracking
- [ ] Visual activity tracking (webcam + screen)
- [ ] Activity timeline generation
- [ ] Meeting requirements system
- [ ] Daily digest emails
- [ ] Compliance percentage calculations

### Phase 3 - External Integrations
- [ ] AA Intergroup API integration
- [ ] NA Meeting API integration
- [ ] SMART Recovery API integration
- [ ] Additional recovery program APIs

### Phase 4 - Advanced Features
- [ ] Export compliance reports (PDF)
- [ ] Mobile app for participants
- [ ] SMS notifications
- [ ] Calendar integrations
- [ ] Multi-state court domain support

---

## 📝 Open Questions

1. **Visual Tracking Implementation**
   - Which method: Webcam, screen activity, or both?
   - Privacy concerns with webcam snapshots?
   - Storage requirements for activity data?

2. **Meeting Requirements**
   - Should this be mandatory or optional for Court Reps?
   - How flexible should the requirement types be?
   - What happens if participant doesn't meet requirements?

3. **Email Notifications**
   - What time should daily digests be sent?
   - Should participants get confirmation after each meeting?
   - Should Court Reps get instant alerts for issues?

4. **Court Domain Verification**
   - Who manages the approved domains list?
   - Process for adding new court systems?
   - Fallback for courts without specific domains?

5. **Data Retention**
   - How long should attendance records be kept?
   - What's the legal requirement for court compliance data?
   - Archive strategy for old cases?

---

## 🎯 Definition of Done

This redesign is considered complete and ready for stakeholder review when:

- ✅ All user flows are documented
- ✅ Database schema is fully designed
- ✅ API endpoints are specified
- ✅ Dashboard wireframes are described
- ✅ Security considerations are addressed
- ✅ Success metrics are defined
- ✅ MVP phases are outlined
- ✅ Open questions are identified

**Status: ✅ COMPLETE - Ready for Technical Review**

---

*Document prepared by: AI Development Team*  
*Next Steps: Technical review → Migration planning → Implementation*

