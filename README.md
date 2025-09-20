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

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Zoom API credentials
- Court verification system access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/proofmeet.git
   cd proofmeet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
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
- **Frontend**: React 18 + TypeScript + Material-UI
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: Auth0
- **Integration**: Zoom SDK/API
- **Deployment**: Docker + AWS

### Project Structure
```
proofmeet/
├── frontend/          # React TypeScript application
├── backend/           # Node.js Express API server
├── shared/            # Shared TypeScript types
├── docs/              # User and developer documentation
├── docker/            # Docker configurations
└── tests/             # Test suites
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
