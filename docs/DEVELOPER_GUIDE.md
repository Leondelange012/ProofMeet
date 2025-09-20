# ProofMeet Developer Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Architecture](#architecture)
4. [Development Setup](#development-setup)
5. [API Documentation](#api-documentation)
6. [Database Schema](#database-schema)
7. [Frontend Development](#frontend-development)
8. [Backend Development](#backend-development)
9. [Testing](#testing)
10. [Deployment](#deployment)

## Project Overview

ProofMeet is a court-ordered meeting attendance tracking system built with TypeScript, React, Node.js, and PostgreSQL. The system supports both online (Zoom) and in-person meetings with comprehensive compliance reporting.

### Key Features
- **Multi-Platform Support**: Web app with mobile-responsive design
- **Zoom Integration**: Real-time meeting attendance tracking
- **QR Code System**: In-person meeting check-in/out verification
- **Compliance Reporting**: Automated reports for court officials
- **Multi-State Support**: California, Texas, and New York compliance
- **Privacy Protection**: Maintains participant anonymity

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)
- Git

### Quick Start
```bash
# Clone the repository
git clone https://github.com/your-org/proofmeet.git
cd proofmeet

# Install dependencies
npm install

# Set up environment variables
cp backend/env.example backend/.env
# Edit backend/.env with your configuration

# Start with Docker
docker-compose up

# Or start manually
npm run dev
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Material-UI + Vite
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Integration**: Zoom SDK/API
- **Deployment**: Docker + AWS

### Project Structure
```
proofmeet/
├── frontend/              # React TypeScript application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service functions
│   │   └── utils/         # Utility functions
│   ├── public/            # Static assets
│   └── package.json
├── backend/               # Node.js Express API
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/         # Utility functions
│   │   └── index.ts       # Application entry point
│   ├── prisma/            # Database schema and migrations
│   └── package.json
├── shared/                # Shared TypeScript types
│   └── types/
├── docs/                  # Documentation
├── docker/                # Docker configurations
└── docker-compose.yml
```

## Development Setup

### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your database and API keys

# Set up database
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Database Setup
```bash
# Using Docker
docker-compose up postgres

# Or install PostgreSQL locally
# Create database: proofmeet
# Update DATABASE_URL in backend/.env
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user with court-verified email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "courtId": "CA-12345",
  "state": "CA",
  "courtCaseNumber": "CASE-2024-001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Awaiting court verification.",
  "data": {
    "userId": "user-id",
    "email": "user@example.com",
    "courtId": "CA-12345",
    "state": "CA"
  }
}
```

#### POST /api/auth/login
Login with court-verified email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "courtId": "CA-12345",
      "state": "CA",
      "isHost": false,
      "isVerified": true
    }
  }
}
```

### Meeting Endpoints

#### POST /api/meetings/create
Create a new meeting.

**Request Body:**
```json
{
  "meetingType": "AA",
  "meetingFormat": "online",
  "scheduledStart": "2024-01-20T19:00:00Z",
  "scheduledEnd": "2024-01-20T20:00:00Z",
  "zoomMeetingId": "123456789"
}
```

#### GET /api/meetings/host/:hostId
Get meetings for a specific host.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status (active, completed)

### Attendance Endpoints

#### POST /api/attendance/join
Join an online meeting.

**Request Body:**
```json
{
  "meetingId": "meeting-id",
  "userId": "user-id"
}
```

#### POST /api/attendance/leave
Leave an online meeting.

**Request Body:**
```json
{
  "attendanceId": "attendance-id"
}
```

#### POST /api/attendance/approve
Approve attendance (host action).

**Request Body:**
```json
{
  "attendanceId": "attendance-id",
  "approved": true,
  "hostSignature": "host-signature",
  "notes": "Optional notes"
}
```

### QR Code Endpoints

#### POST /api/qr/generate
Generate QR code for in-person meeting.

**Request Body:**
```json
{
  "meetingId": "meeting-id"
}
```

#### POST /api/qr/checkin
Check in to in-person meeting with QR code.

**Request Body:**
```json
{
  "qrData": "qr-code-data",
  "userId": "user-id"
}
```

#### POST /api/qr/checkout
Check out of in-person meeting with QR code.

**Request Body:**
```json
{
  "qrData": "qr-code-data",
  "userId": "user-id"
}
```

## Database Schema

### Core Tables

#### Users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  court_id TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  state TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  is_host BOOLEAN DEFAULT FALSE,
  host_id TEXT UNIQUE,
  court_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Meetings
```sql
CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL REFERENCES users(id),
  meeting_type TEXT NOT NULL,
  meeting_format TEXT NOT NULL,
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  meeting_id TEXT, -- Zoom meeting ID
  qr_code TEXT, -- For in-person meetings
  location TEXT, -- For in-person meetings
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Attendance
```sql
CREATE TABLE attendances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  meeting_id TEXT NOT NULL REFERENCES meetings(id),
  join_time TIMESTAMP,
  leave_time TIMESTAMP,
  duration INTEGER, -- in minutes
  attendance_percentage FLOAT, -- 0-100
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMP,
  check_in_qr TEXT, -- For in-person
  check_out_qr TEXT, -- For in-person
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Frontend Development

### Component Structure
```
src/
├── components/
│   ├── Layout.tsx           # Main layout wrapper
│   ├── ProtectedRoute.tsx   # Route protection
│   └── ...
├── pages/
│   ├── LoginPage.tsx        # Login page
│   ├── DashboardPage.tsx    # User dashboard
│   ├── MeetingPage.tsx      # Meeting management
│   ├── CompliancePage.tsx   # Compliance reports
│   └── HostDashboardPage.tsx # Host dashboard
├── hooks/
│   ├── useAuthStore.ts      # Authentication state
│   └── ...
├── services/
│   ├── authService.ts       # Authentication API calls
│   ├── meetingService.ts    # Meeting API calls
│   └── ...
└── utils/
    └── ...
```

### State Management
- **Zustand**: Lightweight state management for authentication
- **React Query**: Server state management and caching
- **React Hook Form**: Form state management

### Styling
- **Material-UI**: Component library and theming
- **CSS Modules**: Component-specific styles
- **Responsive Design**: Mobile-first approach

### Key Components

#### ProtectedRoute
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'host' | 'po' | 'judge' | 'admin';
}
```

#### Layout
- Responsive navigation
- User profile menu
- Role-based menu items

## Backend Development

### Project Structure
```
src/
├── routes/
│   ├── auth.ts              # Authentication routes
│   ├── meetings.ts          # Meeting management
│   ├── attendance.ts        # Attendance tracking
│   ├── compliance.ts        # Compliance reporting
│   └── qr.ts               # QR code system
├── middleware/
│   ├── errorHandler.ts      # Error handling
│   └── ...
├── utils/
│   ├── logger.ts           # Logging utility
│   └── ...
└── index.ts                # Application entry point
```

### Key Features

#### Error Handling
- Centralized error handling middleware
- Structured error responses
- Logging with Winston

#### Authentication
- JWT-based authentication
- Role-based access control
- Court verification system

#### Database
- Prisma ORM
- Type-safe database queries
- Automatic migrations

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/proofmeet"

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="24h"

# Zoom Integration
ZOOM_API_KEY="your-zoom-api-key"
ZOOM_API_SECRET="your-zoom-api-secret"

# Court System Integration
COURT_API_ENDPOINT="https://court-api.example.com"
COURT_API_KEY="your-court-api-key"
```

## Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

### Test Structure
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user flow testing

## Deployment

### Docker Deployment
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Setup
1. **Environment Variables**: Set production environment variables
2. **Database**: Set up production PostgreSQL instance
3. **SSL**: Configure HTTPS certificates
4. **Monitoring**: Set up logging and monitoring
5. **Backup**: Configure database backups

### AWS Deployment
- **ECS**: Container orchestration
- **RDS**: Managed PostgreSQL
- **CloudFront**: CDN for frontend
- **Route 53**: DNS management

## Contributing

### Development Workflow
1. Create feature branch
2. Make changes
3. Write tests
4. Run linting and tests
5. Submit pull request

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format

### Pull Request Process
1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Code review
6. Merge to main

## Security Considerations

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Authentication**: JWT with secure secrets
- **Authorization**: Role-based access control
- **Audit Logs**: Comprehensive activity logging

### Privacy
- **Minimal Data**: Only collect necessary information
- **Anonymity**: Protect participant identities
- **Retention**: Data retention policies
- **Compliance**: Legal compliance requirements

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check database status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up postgres
```

#### Frontend Build Issues
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run build
```

#### Backend API Issues
```bash
# Check API logs
docker-compose logs backend

# Test API endpoints
curl http://localhost:5000/health
```

---

*Last Updated: January 2024*
*Version: 1.0.0*
