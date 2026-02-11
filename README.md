# ProofMeet - Digital Attendance Tracking System
## Court-Verified Meeting Attendance for Recovery Programs

[![Production Status](https://img.shields.io/badge/status-production-brightgreen)](https://proof-meet-frontend.vercel.app)
[![Backend](https://img.shields.io/badge/backend-railway-blue)](https://proofmeet-backend-production.up.railway.app)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Overview

**ProofMeet** is a digital attendance tracking system for court-ordered recovery meetings. The system provides verifiable, tamper-resistant proof of attendance for AA, NA, SMART Recovery, and other programs through direct Zoom integration.

### Key Features
- Real-time attendance tracking via Zoom webhooks
- 1,800+ recovery meetings from AA, NA, and other programs
- Automated court card generation with detailed metrics
- PDF downloads for court submission
- Court representative dashboard for compliance monitoring
- Tamper-resistant attendance records

---

## Live System

### Production URLs
- **Frontend**: https://proof-meet-frontend.vercel.app
- **Backend API**: https://proofmeet-backend-production.up.railway.app/api
- **Health Check**: https://proofmeet-backend-production.up.railway.app/health

### Quick Start
1. Visit https://proof-meet-frontend.vercel.app
2. Register as Court Representative or Participant
3. Search and join recovery meetings or create test meetings
4. Attendance is tracked automatically via Zoom
5. Download court cards with detailed attendance metrics

---

## Features

### 1. Recovery Meeting Directory
- **1,800+ Live Meetings**: Automatically synced from AA-Intergroup, BMLT, and other sources
- **Daily Updates**: Meeting database refreshes daily at 2 AM
- **Smart Search**: Filter by program (AA, NA, SMART), day, time, and Zoom ID
- **Direct Join**: One-click join with automatic attendance tracking

### 2. Attendance Tracking
- **Zoom Integration**: Real-time join/leave tracking via secure webhooks
- **Precise Timing**: Duration calculated from Zoom's servers
- **Engagement Metrics**: Active vs. idle time monitoring
- **Leave/Rejoin Tracking**: Complete timeline of all participant activity
- **Validation Rules**: 80% attendance threshold for compliance
- **Fraud Detection**: Multi-layer verification system

### 3. Court Cards
- **Automatic Generation**: Court cards created immediately after meeting completion
- **Detailed Metrics**: Join time, leave time, duration, attendance percentage
- **Professional Format**: Court-acceptable PDF format
- **Compliance Status**: Pass/Fail based on configurable thresholds
- **Violation Tracking**: Critical and warning-level flags for review

### 4. User Dashboards

**Court Representatives:**
- Create test meetings with Zoom integration
- Manage participants and compliance requirements
- View real-time attendance and compliance data
- Download participant court cards
- Monitor multiple participants simultaneously

**Participants:**
- Search 1,800+ available recovery meetings
- Join meetings with one click
- View attendance history and compliance status
- Download court cards as PDFs
- Track progress toward requirements

**Meeting Hosts:**
- View attendance for hosted meetings
- Monitor participant engagement
- Access compliance reports

---

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Material-UI + Vite
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL (Railway)
- **Authentication**: JWT + bcrypt
- **Video Integration**: Zoom SDK & Webhooks
- **Meeting Sync**: Automated daily sync from external sources

### Deployment
- **Frontend**: Vercel (auto-deploy from main branch)
- **Backend**: Railway (auto-deploy from main branch)
- **Database**: Railway PostgreSQL with automatic backups

### Security Features
- Helmet.js for HTTP security headers
- CORS with whitelisted origins
- Rate limiting (tiered by endpoint)
- JWT authentication with refresh tokens
- bcrypt password hashing
- Environment variable encryption
- SQL injection prevention (Prisma ORM)
- XSS protection

---

## Project Structure

```
ProofMeet/
├── frontend/                      # React frontend (Vercel)
│   ├── src/
│   │   ├── pages/                 # Dashboard pages
│   │   │   ├── MeetingPage.tsx
│   │   │   ├── CourtRepDashboardPage.tsx
│   │   │   ├── ParticipantDashboardPage.tsx
│   │   │   ├── ActiveMeetingPage.tsx
│   │   │   └── VerificationPage.tsx
│   │   ├── components/            # Reusable UI components
│   │   │   ├── CourtCardViewer.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── services/              # API integration
│   │   │   ├── authService-v2.ts
│   │   │   ├── aaIntergroupService.ts
│   │   │   └── websocketService.ts
│   │   └── hooks/                 # Custom hooks
│   │       ├── useAuthStore-v2.ts
│   │       └── useWebSocket.ts
│   └── vercel.json                # Vercel config
│
├── backend/                       # Node.js backend (Railway)
│   ├── src/
│   │   ├── routes/                # API endpoints
│   │   │   ├── auth-v2.ts         # Authentication
│   │   │   ├── court-rep.ts       # Court Rep operations
│   │   │   ├── participant.ts     # Participant operations
│   │   │   ├── verification.ts    # Public verification
│   │   │   ├── admin.ts           # Admin/monitoring
│   │   │   └── zoom-webhooks.ts   # Zoom integration
│   │   ├── services/              # Business logic
│   │   │   ├── meetingSyncService.ts      # External meeting sync
│   │   │   ├── courtCardService.ts        # Court card generation
│   │   │   ├── activityTrackingService.ts # Engagement tracking
│   │   │   ├── syncMonitoringService.ts   # Sync health monitoring
│   │   │   ├── cronService.ts             # Scheduled tasks
│   │   │   ├── zoomService.ts             # Zoom API
│   │   │   ├── pdfGenerator.ts            # PDF generation
│   │   │   └── emailService.ts            # Email notifications
│   │   ├── middleware/            # Express middleware
│   │   │   ├── auth.ts            # JWT verification
│   │   │   └── errorHandler.ts    # Global error handling
│   │   └── utils/
│   │       └── logger.ts          # Winston logging
│   ├── prisma/                    # Database
│   │   ├── schema.prisma          # Data models
│   │   └── migrations/            # Version-controlled migrations
│   └── scripts/                   # Utility scripts
│       ├── diagnose-missing-meeting.ts
│       ├── sync-aa-intergroup.ts
│       └── add-meeting-interactive.ts
│
├── docs/                          # Documentation
│   ├── API_DOCUMENTATION.md       # API reference
│   ├── DEVELOPER_GUIDE.md         # Developer setup
│   ├── USER_GUIDE.md              # End-user manual
│   ├── AA_MEETING_INTEGRATION.md  # External meeting sync
│   ├── FIELD_READY_SYSTEM_SUMMARY.md # System architecture
│   ├── TRACKING_AND_VALIDATION_RULES.md # Compliance rules
│   └── archive/                   # Historical documentation
│
├── CHANGELOG.md                   # Version history & recent changes
├── SECURITY.md                    # Security policy & best practices
├── FIELD_USER_GUIDE.md            # Field testing guide
├── SYSTEM_MEMORY_BANK.md          # System architecture knowledge
├── docker-compose.yml             # Local development
└── README.md                      # This file
```

---

## Getting Started

### For Field Testers
See [FIELD_USER_GUIDE.md](FIELD_USER_GUIDE.md) for complete step-by-step testing instructions.

**Quick Summary:**
1. Login to https://proof-meet-frontend.vercel.app
2. Court Reps: Create test meetings, manage participants
3. Participants: Search and join recovery meetings
4. Attendance tracked automatically via Zoom
5. Download court cards with attendance metrics

### For Developers

#### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git
- Zoom Developer Account (for meeting integration)

#### Local Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/Leondelange012/ProofMeet.git
   cd ProofMeet
   ```

2. **Backend setup**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Edit .env with your DATABASE_URL, JWT_SECRET, ZOOM credentials
   npx prisma migrate dev
   npx prisma generate
   npm run dev
   ```

3. **Frontend setup** (separate terminal)
   ```bash
   cd frontend
   npm install
   cp env.example .env
   # Edit .env with VITE_API_BASE_URL=http://localhost:5000/api
   npm run dev
   ```

4. **Access locally**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api
   - Backend Health: http://localhost:5000/health

#### Environment Variables

**Backend (.env)**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/proofmeet
JWT_SECRET=your-512-bit-secret-key
FRONTEND_URL=http://localhost:5173
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
SCRAPERAPI_KEY=optional-for-some-meeting-sources
```

**Frontend (.env)**
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Documentation

### For Users
- **[User Guide](docs/USER_GUIDE.md)** - End-user manual for participants and court reps
- **[Field Testing Guide](FIELD_USER_GUIDE.md)** - Testing instructions for external users

### For Developers
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Complete development setup
- **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API reference
- **[Architecture Overview](docs/FIELD_READY_SYSTEM_SUMMARY.md)** - System design & tracking
- **[Backend Setup](backend/README.md)** - Backend-specific setup & database

### Setup & Integration
- **[AA Meeting Integration](docs/AA_MEETING_INTEGRATION.md)** - External meeting sync setup
- **[Tracking Rules](docs/TRACKING_AND_VALIDATION_RULES.md)** - Validation rules & troubleshooting
- **[System Memory Bank](SYSTEM_MEMORY_BANK.md)** - System architecture knowledge

### Additional Resources
- **[Changelog](CHANGELOG.md)** - Recent changes & version history
- **[Security](SECURITY.md)** - Security audit & best practices

---

## How It Works

### Complete Workflow

#### 1. Meeting Discovery
```
Participant → Browse Meetings → Filter by Program/Day/Time → View 1,800+ options
```

#### 2. Meeting Join
```
Participant → Click "Join" → Tracking starts → Click Zoom link → Join meeting
```

#### 3. Attendance Tracking (Automatic via Zoom)
```
Zoom Webhooks → Track:
  - Join time (precise timestamp)
  - Leave time
  - Active duration
  - Idle periods
  - Leave/rejoin events
```

#### 4. Validation (Automatic)
```
Meeting Ends → System Validates:
  ✅ 80%+ attendance required
  ✅ 80%+ active time
  ✅ Maximum 20% idle time
  → Status: PASSED or FAILED
```

#### 5. Court Card Generation (Automatic)
```
Validation Complete → Generate Court Card:
  - Unique card number
  - Meeting details (name, program, date)
  - Attendance metrics (duration, percentage)
  - Compliance status (PASSED/FAILED)
  - Violations (if any)
```

#### 6. Download & Submit
```
Participant → View Court Card → Download PDF → Submit to court
Court Rep → Review all participant cards → Monitor compliance
```

---

## External Meeting Sync

### How We Get Meetings

**AA Meetings:**
- Source: `https://data.aa-intergroup.org/`
- Method: Direct JSON API access (no proxy needed)
- Frequency: Daily sync at 2 AM
- Volume: ~8,000 meetings fetched, ~1,500 active Zoom meetings saved

**NA Meetings:**
- Source: BMLT (Basic Meeting List Toolbox) servers
- Method: BMLT API with virtual meeting filter
- Frequency: Daily sync at 2 AM
- Volume: Variable (depends on BMLT availability)

**Sync Process:**
1. Fetch meetings from all sources in parallel
2. Filter to only Zoom meetings with valid IDs
3. Remove inactive meetings (not updated in 12+ months)
4. Save to database with `hasProofCapability = true`
5. Clean up old/stale meetings
6. Monitor sync health with alerts

**Monitoring:**
- `/api/admin/sync-health` - Check sync status
- `/api/admin/sync-statistics` - View meeting counts
- `/api/admin/check-meeting/:zoomId` - Verify specific meeting
- Critical alerts if sync fails or returns <50 meetings

---

## Current Status

### Production Ready
- User registration and authentication
- Court rep dashboard with test meeting creation
- Participant dashboard with meeting search
- 1,800+ recovery meeting directory
- Zoom integration with real-time tracking
- Automated daily meeting sync
- Automatic court card generation with detailed metrics
- PDF court card downloads
- Public verification portal
- Sync health monitoring and alerts

### In Progress
- SMS notifications for court reps
- Mobile app (React Native)
- Bulk court card downloads
- Advanced analytics dashboard

### Planned
- Multi-language support
- Integration with court case management systems
- In-person meeting check-in
- Participant mobile app

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow existing code style
- Add comments for complex logic

---

## Support

### For Field Testers
- **Email**: leondelange001@gmail.com | Kevinrichardson.za@gmail.com
- **Documentation**: See [FIELD_USER_GUIDE.md](FIELD_USER_GUIDE.md)

### For Developers
- **Issues**: [GitHub Issues](https://github.com/Leondelange012/ProofMeet/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Leondelange012/ProofMeet/discussions)
- **Email**: leondelange001@gmail.com

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **AA Intergroup** - Meeting directory and data
- **BMLT** - NA meeting data
- **Zoom** - Video conferencing API and webhooks
- **Vercel** - Frontend hosting
- **Railway** - Backend and database hosting
- **Prisma** - Database ORM
- **Material-UI** - React component library

---

## Security & Privacy

### Data Protection
- Minimal data collection (email, case number only)
- Encrypted at rest and in transit
- No participant names shared with other attendees
- Audit trails for all actions
- Secure password storage (bcrypt)
- JWT tokens with expiration

### Compliance
- GDPR-friendly (minimal PII)
- HIPAA-aware (no health data collected)
- Court-acceptable documentation
- Tamper-resistant attendance records

---

**ProofMeet** - Verified Attendance Tracking for Recovery Programs

*Providing court-verifiable proof of meeting attendance through secure Zoom integration.*
