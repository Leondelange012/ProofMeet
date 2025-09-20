# ProofMeet Testing Setup Guide

## Step 1: Environment Setup

### Backend Environment (.env)
Create `backend/.env` file with the following content:

```bash
# Database
DATABASE_URL="postgresql://proofmeet:proofmeet_password@localhost:5432/proofmeet"

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET="proofmeet-super-secret-jwt-key-for-testing-only"
JWT_EXPIRES_IN="24h"

# Zoom Integration (Test credentials)
ZOOM_API_KEY="test-zoom-api-key"
ZOOM_API_SECRET="test-zoom-api-secret"
ZOOM_WEBHOOK_SECRET="test-zoom-webhook-secret"

# Court System Integration (Test endpoints)
COURT_API_ENDPOINT="http://localhost:5000/api/test"
COURT_API_KEY="test-court-api-key"

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH="./uploads"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL="info"
LOG_FILE_PATH="./logs/app.log"

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN="http://localhost:3000"

# QR Code
QR_CODE_SIZE=256
QR_CODE_ERROR_CORRECTION_LEVEL="M"
```

### Frontend Environment (.env)
Create `frontend/.env` file with:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

## Step 2: Manual Commands to Run

1. Copy environment files:
```bash
copy backend\env.example backend\.env
copy frontend\.env.example frontend\.env
```

2. Start services:
```bash
docker-compose up -d
```

3. Check services:
```bash
docker-compose ps
```

4. View logs:
```bash
docker-compose logs -f
```
