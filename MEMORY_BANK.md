# ProofMeet Development Memory Bank

## Project Overview
ProofMeet is a court-ordered meeting attendance tracking system that integrates with Zoom and Microsoft Teams to provide verifiable attendance records for probation compliance.

## Core Requirements
- **Court Integration**: Court-verified email registration system
- **Zoom Integration**: Real-time meeting attendance tracking with host approval
- **QR Code System**: In-person meeting check-in/out verification
- **Compliance Reporting**: Automated reports for POs, lawyers, and judges
- **Privacy Protection**: Maintains AA/NA anonymity while ensuring compliance
- **Multi-State Support**: California, Texas, and New York compliance

## Technical Architecture Decisions

### Tech Stack (Decided 2024-01-XX)
- **Frontend**: React 18 + TypeScript + Material-UI
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: Auth0 (for court verification)
- **Zoom Integration**: Zoom SDK/API
- **QR Codes**: qrcode library + camera scanning
- **Deployment**: Docker containers on AWS

### Project Structure
```
proofmeet/
├── frontend/          # React TypeScript app
├── backend/           # Node.js Express API
├── shared/            # Shared TypeScript types
├── docs/              # Documentation
└── docker/            # Docker configurations
```

## Key Features Implementation Status

### ✅ Completed
- [x] Project structure setup
- [x] Memory bank creation
- [x] User documentation outline
- [x] Database schema design (Prisma + PostgreSQL)
- [x] QR code system implementation
- [x] Court/PO dashboard for monitoring compliance
- [x] Basic frontend components and pages
- [x] Backend API routes and middleware
- [x] Docker configuration
- [x] Authentication system (JWT-based)

### 🚧 In Progress
- [ ] Zoom API integration research and implementation

### 📋 Planned
- [ ] Court verification system integration
- [ ] Mobile responsiveness testing
- [ ] Security audit
- [ ] Production deployment setup
- [ ] Testing suite implementation

## Legal Compliance Considerations

### State-Specific Requirements
- **California**: PC §1203.1 compliance, secular alternatives (SMART, LifeRing)
- **Texas**: CCP ch. 42A compliance, DWI education separation
- **New York**: CPL Art. 410 compliance, IDP program awareness

### Privacy & Security
- Minimal data collection (court ID + email only)
- Immutable audit logs with digital signatures
- HIPAA-level data protection
- Court-only access to compliance data

## Development Notes

### Meeting Attendance Logic
- **Online**: Join/leave time tracking, ≥90% duration requirement
- **In-Person**: QR check-in/out system, both scans required
- **Fraud Prevention**: No retroactive approvals, late entry flags

### Host Approval Workflow
1. Meeting near end → Host popup with attendee list
2. Host clicks "Approve" → Auto-fills meeting details
3. Digital signature applied → Entry sent to compliance log
4. No bypassing (late join = reduced credit)

## API Endpoints (Planned)
- `POST /api/auth/register` - Court email verification
- `POST /api/meetings/join` - Join Zoom meeting
- `POST /api/meetings/leave` - Leave meeting
- `POST /api/meetings/approve` - Host approval
- `GET /api/compliance/reports` - Generate compliance reports
- `POST /api/qr/checkin` - QR code check-in
- `POST /api/qr/checkout` - QR code check-out

## Database Schema (Planned)
- `users` - Court-verified users
- `court_orders` - Court order configurations
- `meetings` - Meeting sessions (online/in-person)
- `attendance` - Attendance records
- `compliance_logs` - Immutable compliance data
- `hosts` - Meeting hosts/approvers

## Security Considerations
- JWT tokens for authentication
- Role-based access control (User, Host, PO, Judge)
- Encrypted data transmission
- Audit trail for all actions
- Rate limiting on API endpoints

## Next Steps
1. Set up development environment
2. Implement database schema
3. Create basic authentication flow
4. Integrate Zoom API
5. Build QR code system
6. Develop court dashboard

## Clarified Requirements (2024-01-XX)
1. **Platform**: Web app with mobile-responsive design
2. **Court Integration**: Through existing court system (email verification)
3. **Host Management**: Court-appointed monitors with verified email access
4. **Compliance**: No HIPAA or other compliance standards needed initially
5. **Zoom Integration**: Via Zoom's API (not app/extension)
6. **Geographic Scope**: Build for all 3 states (CA/TX/NY) from beginning

## Questions for Stakeholders
1. Preferred deployment platform (AWS/Azure/GCP)?
2. Data retention policies?
3. Host training requirements?

---
*Last Updated: 2024-01-XX*
*Version: 1.0.0*
