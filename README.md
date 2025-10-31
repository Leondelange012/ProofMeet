# ProofMeet - Digital Court Card System
## Verifiable Attendance Tracking for Court-Ordered Meetings

[![Production Status](https://img.shields.io/badge/status-production-brightgreen)](https://proof-meet-frontend.vercel.app)
[![Backend](https://img.shields.io/badge/backend-railway-blue)](https://proofmeet-backend-production.up.railway.app)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 🎯 Overview

**ProofMeet** is a fully digitized court card system for tracking attendance at AA/NA meetings and other court-ordered programs. The system eliminates physical signatures in favor of cryptographically secure digital signatures, QR code verification, and blockchain-style chain of trust.

### Key Differentiators
- ✅ **No Physical Signatures** - Fully digital, cryptographically secure
- ✅ **QR Code Verification** - Instant validation by scanning
- ✅ **Multi-Party Signing** - Participant + Host digital signatures
- ✅ **Tamper-Proof** - Blockchain-inspired chain of trust
- ✅ **Real-Time Tracking** - Zoom integration with webcam verification
- ✅ **Court-Ready** - Professional PDFs with all verification data

---

## 🚀 Live System

### Production URLs
- **Frontend**: https://proof-meet-frontend.vercel.app
- **Backend API**: https://proofmeet-backend-production.up.railway.app/api
- **Health Check**: https://proofmeet-backend-production.up.railway.app/health

### Quick Start
1. **Visit**: https://proof-meet-frontend.vercel.app
2. **Register** as Court Representative, Participant, or Host
3. **Create/Join Meetings** via Zoom integration
4. **Sign Court Cards** with digital signatures
5. **Download/Verify** via QR codes

---

## ✨ Features

### 1. Digital Court Cards
- **Automated Generation** - Court cards created automatically after meeting completion
- **Unique Card Numbers** - Sequential, trackable identifiers
- **QR Code Embedded** - Scannable verification on every card
- **Professional Format** - Court-acceptable PDF format
- **Digital Signatures** - Cryptographically secure (RSA-2048)

### 2. Attendance Tracking
- **Zoom Integration** - Real-time join/leave tracking
- **Webcam Verification** - Periodic snapshots for identity verification
- **Activity Monitoring** - Active vs. idle time calculation
- **Validation Rules** - 80% attendance + 80% active time required
- **Fraud Detection** - Multiple verification layers

### 3. Digital Signatures
- **Participant Signing** - Password-authenticated digital signature
- **Host Signing** - Unique email link with verification
- **Court Rep Review** - Optional approval/rejection workflow
- **Chain of Trust** - Cryptographic linking of all signatures
- **Timestamping** - Trusted timestamps for all actions

### 4. Verification System
- **QR Code Scanning** - Instant verification from any device
- **Public Verification Portal** - No login required to verify
- **Signature Details** - See all signers and timestamps
- **Audit Trail** - Complete history of all actions
- **Hash Verification** - Cryptographic proof of authenticity

### 5. User Dashboards

**Court Representatives:**
- Create test meetings with Zoom integration
- Manage participants and their requirements
- View real-time attendance and compliance
- Download participant court cards
- Sync latest data on demand

**Participants:**
- View meeting attendance history
- Sign own court cards with password
- Request host signatures
- Download verified court cards
- Track compliance status

**Meeting Hosts:**
- Receive signature requests via email
- Review attendance details
- Sign court cards via unique link
- No special account required

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Material-UI + Vite
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL (Railway)
- **Authentication**: JWT + bcrypt (512-bit secret)
- **Video**: Zoom SDK/Webhooks
- **Crypto**: RSA-2048 digital signatures, SHA-256 hashing
- **QR Codes**: QRCode library with base64 encoding
- **PDF**: HTML-to-PDF generation with embedded QR codes

### Deployment
- **Frontend**: Vercel (auto-deploy from main branch)
- **Backend**: Railway (auto-deploy from main branch)
- **Database**: Railway PostgreSQL with automatic backups

### Security Features
- 🔒 Helmet.js for HTTP security headers
- 🔒 CORS with whitelisted origins
- 🔒 Rate limiting (tiered by endpoint)
- 🔒 JWT authentication with refresh tokens
- 🔒 bcrypt password hashing
- 🔒 Environment variable encryption
- 🔒 SQL injection prevention (Prisma)
- 🔒 XSS protection
- 🔒 CSRF tokens

---

## 📂 Project Structure

```
ProofMeet/
├── frontend/                      # React frontend (Vercel)
│   ├── src/
│   │   ├── pages/                 # Dashboard pages
│   │   │   ├── CourtRepDashboardPage.tsx
│   │   │   ├── ParticipantDashboardPage.tsx
│   │   │   ├── ParticipantProgressPage.tsx
│   │   │   ├── VerificationPage.tsx
│   │   │   └── PublicVerificationSearchPage.tsx
│   │   ├── components/            # Reusable UI components
│   │   │   ├── SignCourtCardDialog.tsx
│   │   │   ├── RequestHostSignatureDialog.tsx
│   │   │   ├── ActivityMonitor.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── services/              # API integration
│   │   │   ├── authService-v2.ts
│   │   │   └── aaIntergroupService.ts
│   │   └── hooks/                 # Custom hooks
│   │       └── useAuthStore-v2.ts
│   └── vercel.json                # Vercel config
│
├── backend/                       # Node.js backend (Railway)
│   ├── src/
│   │   ├── routes/                # API endpoints
│   │   │   ├── auth-v2.ts         # Authentication
│   │   │   ├── court-rep.ts       # Court Rep operations
│   │   │   ├── participant.ts     # Participant operations
│   │   │   ├── verification.ts    # Public verification
│   │   │   ├── verification-photos.ts  # Photo/signature handling
│   │   │   └── zoom-webhooks.ts   # Zoom integration
│   │   ├── services/              # Business logic
│   │   │   ├── digitalSignatureService.ts  # RSA signing, QR codes
│   │   │   ├── courtCardService.ts        # Court card generation
│   │   │   ├── attendanceLedger.ts        # Immutable audit log
│   │   │   ├── fraudDetection.ts          # Fraud prevention
│   │   │   ├── engagementDetection.ts     # Active/idle tracking
│   │   │   ├── webcamVerification.ts      # Identity verification
│   │   │   ├── pdfGenerator.ts            # PDF generation
│   │   │   ├── zoomService.ts             # Zoom API
│   │   │   └── emailService.ts            # Email notifications
│   │   ├── middleware/            # Express middleware
│   │   │   ├── auth.ts            # JWT verification
│   │   │   └── errorHandler.ts    # Global error handling
│   │   └── utils/
│   │       └── logger.ts          # Winston logging
│   ├── prisma/                    # Database
│   │   ├── schema.prisma          # Data models
│   │   ├── migrations/            # Version-controlled migrations
│   │   └── seed.ts                # Test data
│   ├── scripts/                   # Utility scripts
│   │   ├── update-court-card-qr-codes.ts
│   │   └── clear-attendance-data.ts
│   └── railway.json               # Railway config
│
├── docs/                          # Documentation
│   ├── guides/                    # User guides
│   │   ├── DEMO_GUIDE.md
│   │   └── TESTING_GUIDE.md
│   ├── deployment/                # Deployment docs
│   │   ├── railway-deploy.md
│   │   ├── vercel-deploy.md
│   │   └── INSTALLATION.md
│   ├── archive/                   # Historical docs
│   ├── API_DOCUMENTATION.md       # API reference
│   ├── DEVELOPER_GUIDE.md         # Developer setup
│   └── USER_GUIDE.md              # End-user manual
│
├── FIELD_TESTING_GUIDE.md         # Field testing instructions
├── FIELD_TESTING_GUIDE.pdf        # PDF version for email
├── FIELD_READY_SYSTEM_SUMMARY.md  # System overview
├── FIELD_READY_SYSTEM_SUMMARY.pdf # PDF version
├── docker-compose.yml             # Local development
└── README.md                      # This file
```

---

## 🚀 Getting Started

### For Field Testers
📄 **See [FIELD_TESTING_GUIDE.pdf](FIELD_TESTING_GUIDE.pdf)** for complete step-by-step instructions.

**Quick Summary:**
1. Login to https://proof-meet-frontend.vercel.app
2. Court Reps: Create meetings, manage participants
3. Participants: Join meetings, sign court cards
4. Hosts: Sign court cards via email
5. Everyone: Download/verify court cards with QR codes

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
```

**Frontend (.env)**
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 📖 Documentation

### User Documentation
- **[Field Testing Guide](FIELD_TESTING_GUIDE.pdf)** - Complete testing instructions (PDF)
- **[System Summary](FIELD_READY_SYSTEM_SUMMARY.pdf)** - Technical overview (PDF)
- **[User Guide](docs/USER_GUIDE.md)** - End-user manual
- **[Demo Guide](docs/guides/DEMO_GUIDE.md)** - System demonstration

### Developer Documentation
- **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API reference
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Development setup
- **[Deployment Guide](docs/deployment/railway-deploy.md)** - Production deployment

### Deployment Documentation
- **[Railway Deployment](docs/deployment/railway-deploy.md)** - Backend deployment
- **[Vercel Deployment](docs/deployment/vercel-deploy.md)** - Frontend deployment
- **[Installation Guide](docs/deployment/INSTALLATION.md)** - Full setup

---

## 🔧 How It Works

### Complete Workflow

#### 1. Meeting Creation (Court Rep)
```
Court Rep → Create Meeting → Generates Zoom Link → Share with Participants
```

#### 2. Meeting Attendance (Participant)
```
Participant → Join Zoom → System Tracks:
  - Join/leave times
  - Active vs. idle time
  - Webcam snapshots (verification)
  - Engagement metrics
```

#### 3. Validation (Automatic)
```
Meeting Ends → System Validates:
  ✅ 80%+ attendance required
  ✅ 80%+ active time required
  ✅ 20% max idle time
  → Status: VALID or NEEDS_ATTENTION
```

#### 4. Court Card Generation (Automatic)
```
Validation Complete → Generate Court Card:
  - Unique card number
  - Meeting details
  - Attendance data
  - QR code image
  - Verification URL
```

#### 5. Digital Signing (Manual)
```
Participant → Signs with password → Digital signature added
Participant → Requests host signature → Email sent to host
Host → Clicks email link → Reviews → Signs digitally
```

#### 6. Verification (Public)
```
Anyone → Scans QR code → Public verification page shows:
  - All meeting details
  - Both signatures (participant + host)
  - Validation status
  - Cryptographic hash
  - Chain of trust
```

---

## 🎯 Key Technologies

### Digital Signatures
- **Algorithm**: RSA-2048
- **Hashing**: SHA-256
- **Storage**: JSON in PostgreSQL
- **Verification**: Public key cryptography
- **Timestamping**: Trusted timestamps with each signature

### QR Codes
- **Format**: Base64-encoded PNG
- **Content**: Verification URL with court card ID
- **Generation**: QRCode library
- **Embedding**: Direct in HTML/PDF

### Blockchain-Style Features
- **Chain of Trust**: Each signature references previous signatures
- **Immutable Ledger**: Attendance events cannot be modified
- **Hash Linking**: Cryptographic hashes link all records
- **Audit Trail**: Complete history of all actions

---

## 📊 Current Status

### ✅ Production Ready
- User registration and authentication
- Court rep dashboard with meeting creation
- Participant dashboard with progress tracking
- Zoom integration with real-time tracking
- Webcam verification and activity monitoring
- Automatic court card generation
- Digital signature system (participant + host)
- QR code generation and verification
- Public verification portal
- PDF court card downloads

### 🚧 In Progress
- SMS notifications for signatures
- Mobile app (React Native)
- Bulk court card downloads
- Advanced reporting dashboard

### 📅 Planned
- Multi-language support
- Integration with court case management systems
- In-person meeting QR code check-in
- Offline mode for participants

---

## 🤝 Contributing

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

## 📞 Support

### For Field Testers
- **Email**: leondelange001@gmail.com | Kevinrichardson.za@gmail.com
- **Documentation**: See [FIELD_TESTING_GUIDE.pdf](FIELD_TESTING_GUIDE.pdf)

### For Developers
- **Issues**: [GitHub Issues](https://github.com/Leondelange012/ProofMeet/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Leondelange012/ProofMeet/discussions)
- **Email**: leondelange001@gmail.com

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **AA Intergroup** - Meeting directory and data
- **Zoom** - Video conferencing API
- **Vercel** - Frontend hosting
- **Railway** - Backend and database hosting
- **Prisma** - Database ORM
- **Material-UI** - React component library

---

## 🔐 Security & Privacy

### Data Protection
- ✅ Minimal data collection (email, case number only)
- ✅ Encrypted at rest and in transit
- ✅ No participant names shared with other attendees
- ✅ Audit trails for all actions
- ✅ Secure password storage (bcrypt)
- ✅ JWT tokens with expiration

### Compliance
- ✅ GDPR-friendly (minimal PII)
- ✅ HIPAA-aware (no health data collected)
- ✅ Court-acceptable documentation
- ✅ Tamper-proof records
- ✅ Digital signature legal compliance

---

**ProofMeet** - Digital Court Cards for the Modern Era

*Eliminating physical signatures. Ensuring authenticity. Streamlining compliance.*
