# ProofMeet API Documentation
**Version 2.0 - Court Compliance System**

*Last Updated: October 7, 2024*

---

## 🌐 Base URLs

**Production:** `https://proofmeet-backend-production.up.railway.app`  
**Development:** `http://localhost:5000`

---

## 🔐 Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <token>
```

Tokens are obtained through login and stored in localStorage.

---

## 📚 API Endpoints

### Authentication

#### Register Court Representative

```http
POST /api/auth/register/court-rep
```

**Request Body:**
```json
{
  "email": "officer.smith@probation.ca.gov",
  "password": "SecurePass123!",
  "firstName": "Sarah",
  "lastName": "Smith",
  "courtName": "Los Angeles County Probation",
  "badgeNumber": "12345"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Court Representative registered successfully. Please verify your email.",
  "data": {
    "userId": "uuid-here",
    "email": "officer.smith@probation.ca.gov",
    "userType": "COURT_REP",
    "verificationEmailSent": true
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Email domain not approved for Court Representatives",
  "details": {
    "domain": "gmail.com",
    "approvedDomains": ["probation.ca.gov", "courts.ca.gov"]
  }
}
```

---

#### Register Participant

```http
POST /api/auth/register/participant
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "caseNumber": "2024-12345",
  "courtRepEmail": "officer.smith@probation.ca.gov",
  "phoneNumber": "+1-555-123-4567"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Participant registered successfully. Please verify your email.",
  "data": {
    "userId": "uuid-here",
    "email": "john.doe@example.com",
    "userType": "PARTICIPANT",
    "caseNumber": "2024-12345",
    "courtRepId": "uuid-court-rep",
    "courtRepName": "Sarah Smith",
    "verificationEmailSent": true
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Court Representative not found",
  "details": {
    "courtRepEmail": "nonexistent@probation.ca.gov"
  }
}
```

---

#### Verify Email

```http
GET /api/auth/verify-email/:token
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in.",
  "data": {
    "email": "john.doe@example.com",
    "isEmailVerified": true
  }
}
```

---

#### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "uuid-here",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "PARTICIPANT",
      "caseNumber": "2024-12345",
      "courtRepId": "uuid-court-rep"
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "error": "Please verify your email before logging in"
}
```

---

#### Get Current User

```http
GET /api/auth/me
```

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "PARTICIPANT",
    "caseNumber": "2024-12345",
    "courtRep": {
      "id": "uuid-court-rep",
      "name": "Sarah Smith",
      "email": "officer.smith@probation.ca.gov"
    }
  }
}
```

---

### Court Representative Endpoints

#### Get Dashboard Summary

```http
GET /api/court-rep/dashboard
```

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalParticipants": 24,
      "activeThisWeek": 21,
      "complianceRate": 87.5,
      "meetingsToday": 8
    },
    "recentActivity": [
      {
        "id": "attendance-uuid",
        "participantName": "John Doe",
        "participantId": "uuid",
        "caseNumber": "2024-12345",
        "meetingName": "Tuesday Night AA",
        "meetingProgram": "AA",
        "completedAt": "2024-10-07T20:02:00Z",
        "duration": 62,
        "attendancePercentage": 95.2,
        "status": "COMPLETED"
      }
    ],
    "alerts": [
      {
        "type": "LOW_COMPLIANCE",
        "participantName": "Jane Smith",
        "caseNumber": "2024-67890",
        "message": "Only 1/3 required meetings this week"
      }
    ]
  }
}
```

---

#### Get All Participants

```http
GET /api/court-rep/participants
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by compliance status (`compliant`, `at_risk`, `non_compliant`)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "caseNumber": "2024-12345",
      "registeredAt": "2024-10-01T10:00:00Z",
      "lastActivity": "2024-10-07T20:02:00Z",
      "thisWeek": {
        "meetingsAttended": 3,
        "meetingsRequired": 3,
        "averageAttendance": 95.2,
        "status": "COMPLIANT"
      },
      "allTime": {
        "totalMeetings": 24,
        "totalHours": 24.5,
        "averageAttendance": 94.8
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 24,
    "totalPages": 2
  }
}
```

---

#### Get Participant Details

```http
GET /api/court-rep/participants/:participantId
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "participant": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "caseNumber": "2024-12345",
      "phoneNumber": "+1-555-123-4567",
      "registeredAt": "2024-10-01T10:00:00Z"
    },
    "requirements": {
      "meetingsPerWeek": 3,
      "requiredPrograms": ["AA", "NA"],
      "minimumDuration": 60,
      "minimumAttendance": 90
    },
    "compliance": {
      "currentWeek": {
        "attended": 3,
        "required": 3,
        "percentage": 100,
        "status": "ON_TRACK"
      },
      "lastMonth": {
        "attended": 12,
        "required": 12,
        "percentage": 100
      }
    },
    "recentMeetings": [
      {
        "id": "attendance-uuid",
        "meetingName": "Tuesday Night AA",
        "meetingProgram": "AA",
        "date": "2024-10-07",
        "joinTime": "19:00:00",
        "leaveTime": "20:02:00",
        "duration": 62,
        "attendancePercentage": 95.2,
        "activitySummary": {
          "totalMinutes": 62,
          "activeMinutes": 59,
          "idleMinutes": 3
        },
        "courtCardId": "card-uuid",
        "status": "VALID"
      }
    ]
  }
}
```

---

#### Set Meeting Requirements

```http
POST /api/court-rep/participants/:participantId/requirements
```

**Request Body:**
```json
{
  "meetingsPerWeek": 3,
  "requiredPrograms": ["AA", "NA"],
  "minimumDuration": 60,
  "minimumAttendancePercentage": 90.0
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Requirements set successfully",
  "data": {
    "requirementId": "uuid",
    "participantId": "uuid",
    "meetingsPerWeek": 3,
    "requiredPrograms": ["AA", "NA"],
    "createdAt": "2024-10-07T15:00:00Z"
  }
}
```

---

#### Update Meeting Requirements

```http
PUT /api/court-rep/participants/:participantId/requirements
```

**Request Body:** Same as POST

**Success Response (200):**
```json
{
  "success": true,
  "message": "Requirements updated successfully",
  "data": {
    "requirementId": "uuid",
    "updatedAt": "2024-10-07T15:30:00Z"
  }
}
```

---

#### Get Attendance Reports

```http
GET /api/court-rep/attendance-reports
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `participantId` (optional): Filter by participant
- `program` (optional): Filter by program (AA, NA, etc.)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "dateRange": {
      "start": "2024-10-01",
      "end": "2024-10-07"
    },
    "summary": {
      "totalMeetings": 48,
      "totalParticipants": 24,
      "averageAttendance": 94.3,
      "complianceRate": 87.5
    },
    "reports": [
      {
        "attendanceId": "uuid",
        "participantName": "John Doe",
        "caseNumber": "2024-12345",
        "meetingName": "Tuesday Night AA",
        "date": "2024-10-07",
        "duration": 62,
        "attendancePercentage": 95.2,
        "courtCardId": "card-uuid"
      }
    ]
  }
}
```

---

#### Export Compliance Report

```http
POST /api/court-rep/export-compliance/:participantId
```

**Query Parameters:**
- `format`: `pdf` or `csv`
- `startDate` (optional)
- `endDate` (optional)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.proofmeet.com/reports/report-uuid.pdf",
    "expiresAt": "2024-10-08T15:00:00Z",
    "format": "pdf"
  }
}
```

---

### Participant Endpoints

#### Get Participant Dashboard

```http
GET /api/participant/dashboard
```

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "participant": {
      "firstName": "John",
      "lastName": "Doe",
      "caseNumber": "2024-12345",
      "courtRep": {
        "name": "Officer Smith",
        "email": "officer.smith@probation.ca.gov"
      }
    },
    "progress": {
      "thisWeek": {
        "attended": 3,
        "required": 3,
        "status": "ON_TRACK",
        "averageAttendance": 95.2
      }
    },
    "requirements": {
      "meetingsPerWeek": 3,
      "requiredPrograms": ["AA", "NA"],
      "minimumDuration": 60
    },
    "recentMeetings": [
      {
        "id": "attendance-uuid",
        "meetingName": "Tuesday Night AA",
        "date": "2024-10-07",
        "duration": 62,
        "attendancePercentage": 95.2,
        "status": "COMPLETED"
      }
    ]
  }
}
```

---

#### Get Available Meetings

```http
GET /api/participant/meetings/available
```

**Query Parameters:**
- `program` (optional): Filter by program (AA, NA, SMART, etc.)
- `format` (optional): Filter by format (ONLINE, IN_PERSON, HYBRID)
- `day` (optional): Filter by day of week

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "AA": [
      {
        "id": "meeting-uuid",
        "name": "Morning Reflections",
        "program": "AA",
        "type": "Big Book Study",
        "day": "Monday",
        "time": "07:00",
        "timezone": "PST",
        "duration": 60,
        "format": "ONLINE",
        "zoomUrl": "https://zoom.us/j/123456789",
        "description": "Start your week with reflection...",
        "tags": ["Beginner Friendly", "Meditation"]
      }
    ],
    "NA": [...],
    "SMART": [...]
  }
}
```

---

#### Get Assigned Meetings

```http
GET /api/participant/meetings/assigned
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "requirements": {
      "meetingsPerWeek": 3,
      "requiredPrograms": ["AA", "NA"]
    },
    "thisWeekProgress": {
      "completed": 3,
      "required": 3,
      "status": "COMPLETED"
    },
    "completedMeetings": [
      {
        "id": "attendance-uuid",
        "meetingName": "Tuesday Night AA",
        "program": "AA",
        "date": "2024-10-07",
        "duration": 62,
        "status": "VALID"
      }
    ],
    "upcomingOpportunities": [
      {
        "id": "meeting-uuid",
        "name": "Weekend Recovery",
        "program": "AA",
        "day": "Saturday",
        "time": "10:00",
        "format": "ONLINE"
      }
    ]
  }
}
```

---

#### Get My Attendance History

```http
GET /api/participant/my-attendance
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `startDate` (optional)
- `endDate` (optional)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "attendance-uuid",
      "meeting": {
        "name": "Tuesday Night AA",
        "program": "AA",
        "type": "Open Discussion"
      },
      "date": "2024-10-07",
      "joinTime": "19:00:00",
      "leaveTime": "20:02:00",
      "duration": 62,
      "attendancePercentage": 95.2,
      "status": "COMPLETED",
      "courtCardId": "card-uuid",
      "sentToCourtRep": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 24,
    "totalPages": 2
  }
}
```

---

#### Join Meeting

```http
POST /api/participant/join-meeting
```

**Request Body:**
```json
{
  "meetingId": "external-meeting-uuid",
  "joinMethod": "ONLINE"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Attendance tracking started",
  "data": {
    "attendanceId": "uuid",
    "meetingName": "Tuesday Night AA",
    "joinTime": "2024-10-07T19:00:00Z",
    "trackingActive": true,
    "meetingUrl": "https://zoom.us/j/123456789"
  }
}
```

---

#### Leave Meeting

```http
POST /api/participant/leave-meeting
```

**Request Body:**
```json
{
  "attendanceId": "uuid"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Meeting attendance recorded successfully",
  "data": {
    "attendanceId": "uuid",
    "duration": 62,
    "attendancePercentage": 95.2,
    "courtCardGenerated": true,
    "courtCardId": "card-uuid",
    "sentToCourtRep": true
  }
}
```

---

### Attendance Tracking Endpoints

#### Activity Ping (During Meeting)

```http
POST /api/attendance/activity-ping
```

**Request Body:**
```json
{
  "attendanceId": "uuid",
  "activityData": {
    "timestamp": "2024-10-07T19:15:00Z",
    "isActive": true,
    "screenActivity": {
      "mouseMovements": 45,
      "keyboardInputs": 12,
      "tabFocused": true
    }
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Activity recorded"
}
```

---

#### Get Court Card

```http
GET /api/attendance/court-card/:recordId
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "courtCard": {
      "id": "card-uuid",
      "cardNumber": "CC-2024-12345-001",
      "participant": {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "caseNumber": "2024-12345"
      },
      "courtRep": {
        "name": "Officer Smith",
        "email": "officer.smith@probation.ca.gov"
      },
      "meeting": {
        "name": "Tuesday Night AA",
        "program": "AA",
        "date": "2024-10-07",
        "duration": 60
      },
      "attendance": {
        "joinTime": "19:00:00",
        "leaveTime": "20:02:00",
        "totalDuration": 62,
        "activeDuration": 59,
        "idleDuration": 3,
        "attendancePercentage": 95.2
      },
      "verification": {
        "method": "SCREEN_ACTIVITY",
        "confidenceLevel": "HIGH",
        "activityTimeline": [...]
      },
      "metadata": {
        "generatedAt": "2024-10-07T20:02:00Z",
        "hash": "a3f5b9c2d4e6...",
        "isTampered": false
      }
    },
    "pdfUrl": "https://storage.proofmeet.com/cards/card-uuid.pdf"
  }
}
```

---

### External Meetings Endpoints

#### Get All External Meetings

```http
GET /api/meetings/external
```

**Query Parameters:**
- `program`: Filter by program
- `format`: Filter by format
- `day`: Filter by day

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "externalId": "aa-001",
      "name": "Morning Reflections",
      "program": "AA",
      "meetingType": "Big Book Study",
      "day": "Monday",
      "time": "07:00",
      "timezone": "PST",
      "duration": 60,
      "format": "ONLINE",
      "zoomUrl": "https://zoom.us/j/123456789",
      "description": "...",
      "tags": ["Beginner Friendly"]
    }
  ],
  "total": 150
}
```

---

#### Get Meetings by Program

```http
GET /api/meetings/external/by-program
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "AA": [...],
    "NA": [...],
    "SMART": [...],
    "CMA": [...],
    "OA": [...],
    "GA": [...]
  }
}
```

---

### Admin Endpoints

#### Sync External Meetings (Cron)

```http
POST /api/admin/sync-meetings
```

**Headers:**
```
Authorization: Bearer <admin-token>
X-Admin-Secret: <secret>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "External meetings synced successfully",
  "data": {
    "newMeetings": 15,
    "updatedMeetings": 23,
    "totalMeetings": 150,
    "lastSyncedAt": "2024-10-07T15:00:00Z"
  }
}
```

---

#### Send Daily Digests

```http
POST /api/admin/send-daily-digests
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Daily digests sent successfully",
  "data": {
    "digestsSent": 45,
    "emailsSent": 45,
    "failed": 0
  }
}
```

---

#### Get Approved Court Domains

```http
GET /api/admin/approved-court-domains
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "domain": "probation.ca.gov",
      "state": "California",
      "organization": "California Probation Department",
      "addedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### Add Approved Court Domain

```http
POST /api/admin/approved-court-domains
```

**Request Body:**
```json
{
  "domain": "probation.ny.gov",
  "state": "New York",
  "organization": "New York Probation Department"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Court domain added successfully"
}
```

---

## 📊 Error Codes Reference

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid input data, validation failed |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Email not verified, insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Email already registered, duplicate data |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

---

## 🔄 Rate Limiting

**Default Limits:**
- 100 requests per 15 minutes per IP
- Authentication endpoints: 10 requests per hour
- Email endpoints: 5 requests per hour

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696720800
```

---

## 📝 Data Types Reference

### UserType Enum
```
COURT_REP | PARTICIPANT
```

### MeetingFormat Enum
```
ONLINE | IN_PERSON | HYBRID
```

### AttendanceStatus Enum
```
IN_PROGRESS | COMPLETED | FLAGGED
```

### ComplianceStatus Enum
```
COMPLIANT | AT_RISK | NON_COMPLIANT
```

### VerificationMethod Enum
```
WEBCAM | SCREEN_ACTIVITY | BOTH
```

---

## 🧪 Testing Examples

### Using cURL

**Register Participant:**
```bash
curl -X POST https://proofmeet-backend-production.up.railway.app/api/auth/register/participant \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.participant@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "Participant",
    "caseNumber": "2024-TEST-001",
    "courtRepEmail": "test.courtrep@probation.ca.gov"
  }'
```

**Login:**
```bash
curl -X POST https://proofmeet-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.participant@example.com",
    "password": "TestPass123!"
  }'
```

**Get Dashboard (with token):**
```bash
curl -X GET https://proofmeet-backend-production.up.railway.app/api/participant/dashboard \
  -H "Authorization: Bearer <your-token-here>"
```

---

## 🔗 WebSocket Events (Future)

For real-time dashboard updates:

```javascript
// Connect
const socket = io('wss://proofmeet-backend-production.up.railway.app');

// Subscribe to Court Rep updates
socket.emit('subscribe', { courtRepId: 'uuid' });

// Receive attendance updates
socket.on('attendance:completed', (data) => {
  console.log('New attendance recorded:', data);
});
```

---

*API Documentation maintained by ProofMeet Development Team*

