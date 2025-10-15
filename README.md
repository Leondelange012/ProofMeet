# ProofMeet - Court-Ordered Meeting Attendance Tracker

ProofMeet is a comprehensive attendance tracking system designed for court-ordered meetings, supporting both online (Zoom/Teams) and in-person sessions with verifiable compliance reporting.

## 🎯 Overview

ProofMeet helps courts, probation officers, and meeting hosts track attendance for court-ordered programs like AA, NA, SMART Recovery, and other secular alternatives. The system ensures compliance while maintaining participant anonymity and preventing fraud.

## ✨ Key Features

### Online Meeting Integration
- **Zoom Integration**: Real-time attendance tracking with automatic join/leave time recording
- **Host Approval**: Secure popup system for meeting hosts to approve attendance
- **Fraud Prevention**: Late entry/early leave detection with automatic flagging
- **Duration Verification**: Ensures participants attend ≥90% of meeting duration

### In-Person Meeting Support
- **QR Code System**: Check-in/check-out verification using QR codes
- **Dual Scan Requirement**: Both entry and exit scans required for complete attendance
- **Session Management**: Automatic session generation and tracking

### Compliance & Reporting
- **Automated Reports**: Weekly/monthly compliance reports for POs and judges
- **Real-time Dashboard**: Live compliance monitoring for court officials
- **Immutable Logs**: Tamper-proof attendance records with digital signatures
- **Multi-State Support**: Compliant with California, Texas, and New York requirements

## 🚀 Live System

### 🌐 **Production URLs**
- **Frontend**: https://proof-meet-frontend.vercel.app
- **Backend API**: https://proofmeet-backend-production.up.railway.app
- **Health Check**: https://proofmeet-backend-production.up.railway.app/health

### 🎯 **Getting Started**

**🚀 Try the Live System:**

1. **Visit**: https://proof-meet-frontend.vercel.app

2. **Register an Account** (Choose your role):
   - **Court Representative**: Register to create and monitor meetings
   - **Participant**: Register to track your meeting attendance

3. **Complete Your Profile**:
   - Court Reps: Enter court name and badge number
   - Participants: Enter case number and select your court rep

4. **Start Using the System**:
   - Court Reps: Create meetings, manage participants, view compliance
   - Participants: View assigned meetings, track attendance, monitor compliance status

### 🎬 **Demo Workflow**

**For Court Representatives:**
1. Register → Login → Court Rep Dashboard
2. Create a new meeting requirement for a participant
3. Monitor participant compliance in real-time
4. Generate compliance reports

**For Participants:**
1. Register → Login → Participant Dashboard
2. View your assigned meetings and requirements
3. Join meetings and get attendance verified
4. Track your compliance status

### 📊 **Current Status**
- ✅ **Production Ready**: Full deployment with persistent database
- ✅ **Secure Authentication**: JWT-based with 512-bit secret key
- ✅ **User Registration**: Separate flows for Court Reps and Participants
- ✅ **Database Integration**: PostgreSQL with Prisma ORM on Railway
- ✅ **Role-Based Access**: Court Representative and Participant roles
- ✅ **Data Persistence**: Automatic backups and migration tracking
- ✅ **Environment Security**: All secrets properly secured (not in version control)
- ⏳ **In Development**: Meeting attendance tracking and Zoom integration
- ⏳ **Next Phase**: QR code system for in-person attendance

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Leondelange012/ProofMeet.git
   cd ProofMeet
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   npm install
   ```

4. **Set up environment variables**
   ```bash
   # Backend: Create .env file with DATABASE_URL
   # Frontend: Configure API endpoint
   ```

5. **Run database migrations**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Start development servers**
   ```bash
   # Backend (port 5000)
   npm run dev
   
   # Frontend (port 3000) - in separate terminal
   cd ../frontend
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📱 User Guides

### For Court Officials
- [Setting Up Court Orders](docs/court-setup.md)
- [Monitoring Compliance](docs/compliance-monitoring.md)
- [Generating Reports](docs/reporting.md)

### For Meeting Hosts
- [Host Dashboard](docs/host-dashboard.md)
- [Approving Attendance](docs/approval-process.md)
- [QR Code Management](docs/qr-management.md)

### For Participants
- [Account Registration](docs/participant-registration.md)
- [Joining Online Meetings](docs/online-meetings.md)
- [In-Person Check-in](docs/in-person-meetings.md)

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Material-UI (Deployed on Vercel)
- **Backend**: Node.js + Express + TypeScript + Prisma ORM (Deployed on Railway)
- **Database**: PostgreSQL with automatic migrations (Hosted on Railway)
- **Authentication**: JWT-based with bcrypt password hashing (512-bit secret key)
- **Security**: Helmet, CORS, rate limiting, secure environment variables
- **Integration**: Zoom SDK/API (In Development)
- **Deployment**: Vercel (Frontend) + Railway (Backend + Database)

### Project Structure
```
ProofMeet/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/     # Court Rep & Participant dashboards
│   │   ├── services/  # API integration (V2)
│   │   └── hooks/     # Authentication & state management
│   └── vercel.json    # Vercel deployment config
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/    # API endpoints (auth, court-rep, participant, admin)
│   │   ├── middleware/# Authentication & error handling
│   │   └── services/  # Business logic
│   ├── prisma/        # Database schema & migrations
│   └── railway.json   # Railway deployment config
├── docs/              # User and developer documentation
├── docker-compose.yml # Local development setup
└── .env.example       # Environment variable template
```

## 🔒 Security & Privacy

- **Minimal Data Collection**: Only court ID and email required
- **Anonymity Protection**: No participant names visible to other attendees
- **Encrypted Storage**: All data encrypted at rest and in transit
- **Audit Trails**: Immutable logs for all attendance actions
- **Role-Based Access**: Granular permissions for different user types

## 📊 Compliance Features

### State-Specific Support
- **California**: PC §1203.1 compliance with secular alternatives
- **Texas**: CCP ch. 42A compliance with DWI education separation  
- **New York**: CPL Art. 410 compliance with IDP program awareness

### Reporting Capabilities
- Weekly/monthly attendance summaries
- Compliance percentage calculations
- Flagged attendance issues
- Export capabilities for court records

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run test` - Run test suites
- `npm run lint` - Run code linting
- `npm run db:migrate` - Run database migrations

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

For technical support or questions:
- Email: support@proofmeet.com
- Documentation: [docs.proofmeet.com](https://docs.proofmeet.com)
- Issues: [GitHub Issues](https://github.com/your-org/proofmeet/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

---

**ProofMeet** - Ensuring compliance, maintaining anonymity, preventing fraud.
