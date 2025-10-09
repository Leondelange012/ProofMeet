# ProofMeet Environment Setup Guide
**Version 2.0 - Court Compliance System**

*Last Updated: October 7, 2024*

---

## 📋 Overview

This guide covers all environment variables and configuration needed for ProofMeet Version 2.0.

---

## 🔧 Required Services

### Core Services
- **PostgreSQL Database** (Railway, Supabase, or local)
- **Email Service** (SendGrid recommended, or AWS SES)
- **File Storage** (AWS S3, Cloudinary, or Railway volumes)
- **Zoom API** (for meeting integration)

### Optional Services
- **Redis** (for caching and rate limiting - future)
- **Sentry** (for error tracking)
- **LogTail** (for logging)

---

## 🗂️ Environment Files

### Backend (`/backend/.env`)

```bash
# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=development
PORT=5000
API_VERSION=2.0

# ============================================
# DATABASE (PostgreSQL)
# ============================================
DATABASE_URL=postgresql://username:password@host:5432/proofmeet_v2

# For Railway:
# DATABASE_URL=${{Railway.DATABASE_URL}}

# For local development:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/proofmeet_dev

# ============================================
# AUTHENTICATION & SECURITY
# ============================================

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=30d

# Password Hashing
BCRYPT_ROUNDS=12

# CORS Origins (comma-separated)
CORS_ORIGIN=http://localhost:3000,https://proof-meet-frontend.vercel.app
CORS_CREDENTIALS=true

# ============================================
# EMAIL SERVICE (SendGrid)
# ============================================

# SendGrid Configuration
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=noreply@proofmeet.com
SENDGRID_FROM_NAME=ProofMeet Court Compliance

# Email Templates (SendGrid Template IDs)
SENDGRID_TEMPLATE_VERIFICATION=d-verification-template-id
SENDGRID_TEMPLATE_WELCOME_COURT_REP=d-welcome-court-rep-template-id
SENDGRID_TEMPLATE_WELCOME_PARTICIPANT=d-welcome-participant-template-id
SENDGRID_TEMPLATE_DAILY_DIGEST=d-daily-digest-template-id
SENDGRID_TEMPLATE_ATTENDANCE_CONFIRMATION=d-attendance-confirmation-template-id

# Alternative: AWS SES
# AWS_SES_ACCESS_KEY_ID=your-aws-access-key
# AWS_SES_SECRET_ACCESS_KEY=your-aws-secret-key
# AWS_SES_REGION=us-east-1
# AWS_SES_FROM_EMAIL=noreply@proofmeet.com

# ============================================
# FILE STORAGE (AWS S3 or Cloudinary)
# ============================================

# AWS S3 (for Court Card PDFs)
AWS_S3_ACCESS_KEY_ID=your-aws-access-key
AWS_S3_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET_NAME=proofmeet-court-cards
AWS_S3_PUBLIC_URL=https://proofmeet-court-cards.s3.amazonaws.com

# Alternative: Cloudinary
# CLOUDINARY_CLOUD_NAME=your-cloud-name
# CLOUDINARY_API_KEY=your-api-key
# CLOUDINARY_API_SECRET=your-api-secret

# ============================================
# ZOOM API (for meeting integration)
# ============================================

# Zoom Server-to-Server OAuth
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret

# Zoom API Configuration
ZOOM_API_BASE_URL=https://api.zoom.us/v2
ZOOM_TOKEN_URL=https://zoom.us/oauth/token

# ============================================
# EXTERNAL MEETING APIS
# ============================================

# AA Intergroup (when available)
AA_INTERGROUP_API_URL=https://aa-intergroup.org/api
AA_INTERGROUP_API_KEY=your-api-key-if-required

# NA Meeting API (when available)
NA_MEETINGS_API_URL=https://na-api.example.com
NA_MEETINGS_API_KEY=your-api-key

# SMART Recovery API (when available)
SMART_RECOVERY_API_URL=https://smart-recovery-api.example.com
SMART_RECOVERY_API_KEY=your-api-key

# ============================================
# RATE LIMITING
# ============================================

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=10

# ============================================
# CRON JOBS
# ============================================

# Daily Digest Send Time (24-hour format)
DAILY_DIGEST_SEND_HOUR=20
DAILY_DIGEST_SEND_MINUTE=0
DAILY_DIGEST_TIMEZONE=America/Los_Angeles

# External Meetings Sync Interval (hours)
MEETINGS_SYNC_INTERVAL=6

# ============================================
# COURT CARD CONFIGURATION
# ============================================

# PDF Generation
PDF_GENERATOR=puppeteer
PDF_TEMPLATE_PATH=./templates/court-card-template.html

# Court Card Settings
COURT_CARD_RETENTION_DAYS=365
COURT_CARD_AUTO_SEND=true

# ============================================
# ATTENDANCE TRACKING
# ============================================

# Activity Ping Interval (seconds)
ACTIVITY_PING_INTERVAL=60

# Minimum attendance percentage for validity
MINIMUM_ATTENDANCE_PERCENT=90.0

# Idle timeout (minutes)
IDLE_TIMEOUT_MINUTES=5

# ============================================
# APPROVED COURT DOMAINS (Seed Data)
# ============================================

# Comma-separated list of pre-approved domains
APPROVED_COURT_DOMAINS=probation.ca.gov,courts.ca.gov,probation.texas.gov,courts.texas.gov,nycourts.gov

# ============================================
# LOGGING & MONITORING
# ============================================

# Log Level (error, warn, info, debug)
LOG_LEVEL=info

# Sentry (Error Tracking)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production

# LogTail (Log Management)
LOGTAIL_SOURCE_TOKEN=your-logtail-source-token

# ============================================
# ADMIN & SYSTEM
# ============================================

# Admin Secret for system operations
ADMIN_SECRET_KEY=your-admin-secret-key-change-this

# System Health Check Secret
HEALTH_CHECK_SECRET=your-health-check-secret

# Feature Flags
FEATURE_WEBCAM_TRACKING=false
FEATURE_REAL_EXTERNAL_APIS=false
FEATURE_DAILY_DIGESTS=true

# ============================================
# DEVELOPMENT & TESTING
# ============================================

# Enable debug logging
DEBUG=false

# Bypass email verification (dev only)
BYPASS_EMAIL_VERIFICATION=false

# Test mode
TEST_MODE=false

# Mock external APIs
MOCK_EXTERNAL_APIS=true
```

---

### Frontend (`/frontend/.env`)

```bash
# ============================================
# API CONFIGURATION
# ============================================

# Backend API URL
VITE_API_BASE_URL=http://localhost:5000/api

# For production (Vercel):
# VITE_API_BASE_URL=https://proofmeet-backend-production.up.railway.app/api

# ============================================
# APPLICATION CONFIGURATION
# ============================================

# App Name and Version
VITE_APP_NAME=ProofMeet
VITE_APP_VERSION=2.0.0
VITE_APP_ENVIRONMENT=development

# ============================================
# AUTHENTICATION
# ============================================

# Token storage key
VITE_AUTH_STORAGE_KEY=proofmeet-auth

# Session timeout (milliseconds)
VITE_SESSION_TIMEOUT=604800000

# ============================================
# FEATURES
# ============================================

# Enable/disable features
VITE_FEATURE_WEBCAM_TRACKING=false
VITE_FEATURE_ACTIVITY_TRACKING=true
VITE_FEATURE_REAL_TIME_UPDATES=true

# ============================================
# ACTIVITY TRACKING
# ============================================

# Activity ping interval (milliseconds)
VITE_ACTIVITY_PING_INTERVAL=60000

# Idle detection timeout (milliseconds)
VITE_IDLE_TIMEOUT=300000

# ============================================
# UI CONFIGURATION
# ============================================

# Theme
VITE_THEME_PRIMARY_COLOR=#1976d2
VITE_THEME_SECONDARY_COLOR=#dc004e

# Pagination
VITE_DEFAULT_PAGE_SIZE=20
VITE_MAX_PAGE_SIZE=100

# ============================================
# MEETING CONFIGURATION
# ============================================

# Auto-refresh meetings (minutes)
VITE_MEETINGS_REFRESH_INTERVAL=30

# ============================================
# ERROR TRACKING
# ============================================

# Sentry (Frontend)
VITE_SENTRY_DSN=https://your-frontend-sentry-dsn@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production

# ============================================
# ANALYTICS (Optional)
# ============================================

# Google Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# ============================================
# DEVELOPMENT
# ============================================

# Enable dev tools
VITE_ENABLE_DEV_TOOLS=true

# Mock data mode
VITE_MOCK_DATA_MODE=false
```

---

## 🔄 Environment-Specific Configurations

### Local Development

**Backend `.env.local`:**
```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/proofmeet_dev
JWT_SECRET=dev-secret-key-not-for-production
CORS_ORIGIN=http://localhost:3000
BYPASS_EMAIL_VERIFICATION=true
MOCK_EXTERNAL_APIS=true
DEBUG=true
```

**Frontend `.env.local`:**
```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_ENVIRONMENT=development
VITE_MOCK_DATA_MODE=true
VITE_ENABLE_DEV_TOOLS=true
```

---

### Staging/Testing

**Backend `.env.staging`:**
```bash
NODE_ENV=staging
PORT=5000
DATABASE_URL=${{Railway.DATABASE_URL}}
JWT_SECRET=${{Railway.JWT_SECRET}}
CORS_ORIGIN=https://staging-proof-meet.vercel.app
BYPASS_EMAIL_VERIFICATION=false
MOCK_EXTERNAL_APIS=true
SENDGRID_API_KEY=${{Railway.SENDGRID_API_KEY}}
```

**Frontend `.env.staging`:**
```bash
VITE_API_BASE_URL=https://staging-proofmeet-backend.up.railway.app/api
VITE_APP_ENVIRONMENT=staging
VITE_MOCK_DATA_MODE=false
```

---

### Production

**Backend `.env.production`:**
```bash
NODE_ENV=production
PORT=${{Railway.PORT}}
DATABASE_URL=${{Railway.DATABASE_URL}}
JWT_SECRET=${{Railway.JWT_SECRET}}
JWT_REFRESH_SECRET=${{Railway.JWT_REFRESH_SECRET}}
CORS_ORIGIN=https://proof-meet-frontend.vercel.app
SENDGRID_API_KEY=${{Railway.SENDGRID_API_KEY}}
AWS_S3_ACCESS_KEY_ID=${{Railway.AWS_S3_ACCESS_KEY_ID}}
AWS_S3_SECRET_ACCESS_KEY=${{Railway.AWS_S3_SECRET_ACCESS_KEY}}
ZOOM_CLIENT_ID=${{Railway.ZOOM_CLIENT_ID}}
ZOOM_CLIENT_SECRET=${{Railway.ZOOM_CLIENT_SECRET}}
SENTRY_DSN=${{Railway.SENTRY_DSN}}
ADMIN_SECRET_KEY=${{Railway.ADMIN_SECRET_KEY}}
BYPASS_EMAIL_VERIFICATION=false
MOCK_EXTERNAL_APIS=false
DEBUG=false
```

**Frontend `.env.production`:**
```bash
VITE_API_BASE_URL=https://proofmeet-backend-production.up.railway.app/api
VITE_APP_ENVIRONMENT=production
VITE_FEATURE_WEBCAM_TRACKING=true
VITE_SENTRY_DSN=https://your-frontend-sentry-dsn@sentry.io/project-id
```

---

## 🔐 Secrets Management

### Railway (Backend)

```bash
# Set secrets via Railway CLI
railway variables set JWT_SECRET="your-secret-here"
railway variables set SENDGRID_API_KEY="SG.your-key"
railway variables set DATABASE_URL="postgresql://..."
```

### Vercel (Frontend)

```bash
# Set environment variables via Vercel CLI
vercel env add VITE_API_BASE_URL production
vercel env add VITE_SENTRY_DSN production
```

---

## 📦 Third-Party Service Setup

### SendGrid Email Setup

1. **Create Account**: https://sendgrid.com/
2. **Generate API Key**: Settings → API Keys → Create API Key
3. **Verify Sender**: Settings → Sender Authentication
4. **Create Templates**:
   - Email Verification
   - Welcome Emails (Court Rep & Participant)
   - Daily Digest
   - Attendance Confirmation

**Template IDs** go into:
```bash
SENDGRID_TEMPLATE_VERIFICATION=d-xxxxx
SENDGRID_TEMPLATE_DAILY_DIGEST=d-xxxxx
```

---

### AWS S3 Setup (Court Card PDFs)

1. **Create S3 Bucket**: `proofmeet-court-cards`
2. **Set Bucket Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::proofmeet-court-cards/*"
    }
  ]
}
```
3. **Create IAM User** with S3 access
4. **Add credentials** to environment variables

---

### Zoom API Setup

1. **Create Zoom App**: https://marketplace.zoom.us/develop/create
2. **Choose**: Server-to-Server OAuth
3. **Get Credentials**:
   - Account ID
   - Client ID
   - Client Secret
4. **Add Scopes**: `meeting:write`, `meeting:read`

---

## ✅ Environment Validation

### Backend Validation Script

Create `backend/scripts/validate-env.js`:

```javascript
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SENDGRID_API_KEY',
  'CORS_ORIGIN',
];

function validateEnvironment() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
}

validateEnvironment();
```

Run before starting server:
```bash
node scripts/validate-env.js && npm start
```

---

## 🧪 Testing Environment

Create `.env.test`:

```bash
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/proofmeet_test
JWT_SECRET=test-secret
BYPASS_EMAIL_VERIFICATION=true
MOCK_EXTERNAL_APIS=true
SENDGRID_API_KEY=test-key
TEST_MODE=true
```

---

## 📝 Environment Checklist

### Before Deployment

- [ ] All secrets rotated from development values
- [ ] Database connection string verified
- [ ] Email service configured and tested
- [ ] File storage accessible
- [ ] Zoom API credentials valid
- [ ] CORS origins correct for production
- [ ] Feature flags set appropriately
- [ ] Logging configured
- [ ] Error tracking enabled
- [ ] Secrets stored securely (Railway/Vercel)

### Security Checklist

- [ ] No secrets committed to git
- [ ] `.env` files in `.gitignore`
- [ ] Strong JWT secrets (32+ characters)
- [ ] HTTPS only in production
- [ ] Rate limiting enabled
- [ ] CORS restricted to known origins
- [ ] Admin endpoints protected
- [ ] Database credentials rotated regularly

---

## 🔄 Migration from Phase 1

### Update Existing Environment Variables

```bash
# Rename old variables
OLD: VITE_API_URL → NEW: VITE_API_BASE_URL

# Add new required variables
+ JWT_REFRESH_SECRET
+ SENDGRID_API_KEY
+ AWS_S3_BUCKET_NAME
+ DAILY_DIGEST_SEND_HOUR
+ APPROVED_COURT_DOMAINS
```

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# Check URL format
# Should be: postgresql://user:password@host:port/database
```

### Email Not Sending
```bash
# Test SendGrid API key
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json"
```

### CORS Errors
```bash
# Verify CORS_ORIGIN matches frontend URL exactly
# Include protocol and port if not default (80/443)
CORS_ORIGIN=https://proof-meet-frontend.vercel.app
```

---

*Environment Setup Guide maintained by ProofMeet Development Team*

