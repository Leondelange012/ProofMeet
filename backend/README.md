# ProofMeet Backend

Node.js + Express + TypeScript + Prisma backend for ProofMeet digital court card system.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Zoom Developer Account

### Installation

```bash
cd backend
npm install
cp env.example .env
# Edit .env with your credentials
npx prisma migrate dev
npx prisma generate
npm run dev
```

**Server runs on:** http://localhost:5000

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── routes/              # API endpoints
│   │   ├── auth-v2.ts       # Authentication & registration
│   │   ├── court-rep.ts     # Court rep operations
│   │   ├── participant.ts   # Participant operations
│   │   ├── admin.ts         # Admin functions
│   │   ├── verification.ts  # Public verification
│   │   └── zoom-webhooks.ts # Zoom integration
│   ├── services/            # Business logic
│   │   ├── courtCardService.ts       # Court card generation
│   │   ├── digitalSignatureService.ts # RSA signing & QR codes
│   │   ├── meetingSyncService.ts     # External meeting sync
│   │   ├── fraudDetection.ts         # Fraud prevention
│   │   ├── engagementDetection.ts    # Activity tracking
│   │   └── pdfGenerator.ts           # PDF generation
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # JWT authentication
│   │   └── errorHandler.ts  # Error handling
│   └── utils/
│       └── logger.ts        # Winston logging
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Database migrations
│   └── seed.ts              # Test data
├── scripts/                 # Utility scripts
└── railway.json             # Railway deployment config
```

---

## 🔧 Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/proofmeet

# Authentication
JWT_SECRET=your-512-bit-secret-key-generate-with-openssl-rand-base64-64
ADMIN_SECRET_KEY=admin-secret-for-api-access

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Zoom API
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
ZOOM_WEBHOOK_SECRET=your-webhook-secret-token

# External Meeting Sync (Optional)
SCRAPERAPI_KEY=your-scraperapi-key-for-captcha-bypass

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Generate Secure Keys

```bash
# JWT Secret (512-bit)
openssl rand -base64 64

# Admin Secret Key
openssl rand -hex 32
```

---

## 🗄️ Database Setup

### Local Development

```bash
# Install PostgreSQL (if not installed)
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql

# Create database
createdb proofmeet

# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# (Optional) Seed test data
npx prisma db seed
```

### View Database

```bash
# Open Prisma Studio (GUI)
npx prisma studio
```

**Access at:** http://localhost:5555

---

## 🚀 Development

### Run Development Server

```bash
npm run dev
```

**Features:**
- Hot reload with `ts-node-dev`
- Automatic restart on file changes
- TypeScript compilation
- Source maps for debugging

### Build for Production

```bash
npm run build
npm start
```

### Run Scripts

```bash
# Clear all attendance data (CAUTION!)
npm run script:clear-attendance

# Update court card QR codes
npm run script:update-qr-codes

# Sync external meetings
npm run script:sync-meetings
```

---

## 📊 Database Migrations

### Create New Migration

```bash
# After changing schema.prisma
npx prisma migrate dev --name describe_your_changes
```

**Example:**
```bash
npx prisma migrate dev --name add_video_tracking_fields
```

### Reset Database (CAUTION - Deletes All Data!)

```bash
npx prisma migrate reset
```

### Deploy Migrations to Production

```bash
npx prisma migrate deploy
```

---

## 🧪 Testing

### Manual API Testing

**Health Check:**
```bash
curl http://localhost:5000/health
```

**Register User:**
```bash
curl -X POST http://localhost:5000/api/auth-v2/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "role": "PARTICIPANT",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth-v2/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

---

## 📦 Dependencies

### Core
- **express** - Web framework
- **typescript** - Type safety
- **prisma** - Database ORM
- **@prisma/client** - Database client

### Authentication
- **jsonwebtoken** - JWT tokens
- **bcrypt** - Password hashing

### Zoom Integration
- **axios** - HTTP requests
- **@zoom/meetingsdk** - Zoom SDK

### Security
- **helmet** - HTTP security headers
- **cors** - CORS middleware
- **express-rate-limit** - Rate limiting

### Utilities
- **winston** - Logging
- **dotenv** - Environment variables
- **qrcode** - QR code generation
- **pdf-lib** - PDF generation

---

## 🔐 API Authentication

### JWT Tokens

**Access Token:**
- Expires: 1 hour
- Used for all authenticated requests
- Header: `Authorization: Bearer <token>`

**Refresh Token:**
- Expires: 7 days
- Used to get new access token
- Endpoint: `POST /api/auth-v2/refresh`

### Admin Endpoints

Require `ADMIN_SECRET_KEY` in header:

```bash
curl -X POST http://localhost:5000/api/admin/sync-meetings \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET_KEY"
```

---

## 📡 Zoom Webhooks

### Setup

1. **Zoom App Marketplace:** https://marketplace.zoom.us
2. Create **Server-to-Server OAuth** app
3. Add **Event Subscriptions** webhook URL:
   ```
   https://your-backend.railway.app/api/zoom-webhooks
   ```
4. Subscribe to events:
   - `meeting.participant_joined`
   - `meeting.participant_left`
   - `meeting.ended`

### Test Webhooks Locally

```bash
# Use ngrok for local testing
ngrok http 5000

# Update Zoom webhook URL to ngrok URL
https://abc123.ngrok.io/api/zoom-webhooks
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Test connection
psql -d proofmeet -c "SELECT 1"
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000   # Mac/Linux
netstat -ano | findstr :5000   # Windows

# Kill process
kill -9 <PID>   # Mac/Linux
taskkill /PID <PID> /F   # Windows
```

### Prisma Client Not Generated

```bash
npx prisma generate
```

### Migration Errors

```bash
# Reset database and start fresh
npx prisma migrate reset

# Or fix migration manually
npx prisma migrate resolve --rolled-back "migration_name"
```

---

## 📊 Logging

**Log Files:** `backend/logs/`
- `combined.log` - All logs
- `error.log` - Errors only

**Log Levels:**
- `error` - Critical errors
- `warn` - Warnings
- `info` - General information
- `debug` - Debug information

**View Logs:**
```bash
tail -f logs/combined.log
```

---

## 🚀 Deployment

See main repository documentation:
- **[Production Deployment](../docs/DEPLOYMENT.md)** (to be created)
- **[Railway Setup](../README.md#deployment)**

### Railway Quick Deploy

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
git push origin main  # Auto-deploys via GitHub integration
```

---

## 🔧 Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| **Dev** | `npm run dev` | Start development server |
| **Build** | `npm run build` | Compile TypeScript |
| **Start** | `npm start` | Run production server |
| **Lint** | `npm run lint` | Check code quality |
| **Test** | `npm test` | Run tests |
| **Prisma Studio** | `npx prisma studio` | Open database GUI |
| **Migrate** | `npx prisma migrate dev` | Create/apply migrations |
| **Generate** | `npx prisma generate` | Generate Prisma Client |
| **Seed** | `npx prisma db seed` | Seed test data |

---

## 📞 Support

**Issues?**
- Check logs in `backend/logs/`
- Review environment variables
- Verify database connection
- Test with Postman/curl

**Contact:**
- Email: leondelange001@gmail.com
- GitHub Issues: https://github.com/Leondelange012/ProofMeet/issues
