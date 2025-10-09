# ProofMeet V2.0 - Deployment Guide
**Railway (Backend) + Vercel (Frontend)**

*Last Updated: October 7, 2024*

---

## 🚀 Quick Deploy (Same as Before!)

### Backend to Railway

```bash
cd backend
git add .
git commit -m "ProofMeet V2.0 - Court Compliance System"
git push railway main
```

**Railway will automatically:**
1. Run `npm install` (triggers `postinstall` → `npx prisma generate`)
2. Run `npm run build` (compiles TypeScript to dist/)
3. Run `npx prisma migrate deploy` (updates database schema)
4. Run `node dist/index.js` (starts V2.0 server)

---

### Frontend to Vercel

```bash
cd frontend
git add .
git commit -m "ProofMeet V2.0 - Frontend updates"
git push vercel main
```

**Vercel will automatically:**
1. Run `npm install`
2. Run `npm run build` (Vite build)
3. Deploy static files

---

## ⚙️ Environment Variables (Railway)

### Required Variables

Set these in Railway dashboard:

```bash
# Database (auto-provided by Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Authentication
JWT_SECRET=<generate-random-secret-32-chars>
JWT_REFRESH_SECRET=<generate-another-random-secret>
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=https://proof-meet-frontend.vercel.app,https://www.proofmeet.com
CORS_CREDENTIALS=true

# Frontend URL
FRONTEND_URL=https://proof-meet-frontend.vercel.app

# Email (if using SendGrid)
SENDGRID_API_KEY=<your-sendgrid-api-key>
SENDGRID_FROM_EMAIL=noreply@proofmeet.com

# Email Bypass (set to false in production!)
BYPASS_EMAIL_VERIFICATION=true

# Environment
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Zoom API
ZOOM_ACCOUNT_ID=<your-zoom-account-id>
ZOOM_CLIENT_ID=<your-zoom-client-id>
ZOOM_CLIENT_SECRET=<your-zoom-client-secret>
```

---

## ⚙️ Environment Variables (Vercel)

### Frontend Variables

Set these in Vercel dashboard:

```bash
# API URL (your Railway backend)
VITE_API_BASE_URL=https://proofmeet-backend-production.up.railway.app/api

# Environment
VITE_APP_ENVIRONMENT=production
VITE_APP_VERSION=2.0.0

# Features
VITE_FEATURE_WEBCAM_TRACKING=false
VITE_FEATURE_ACTIVITY_TRACKING=true

# Activity Tracking
VITE_ACTIVITY_PING_INTERVAL=60000
```

---

## 🔄 Deployment Workflow

### First Time Deployment (V2.0)

#### Step 1: Deploy Backend First
```bash
cd backend

# Make sure everything builds locally
npm install
npx prisma generate
npm run build

# Push to Railway
git add .
git commit -m "Deploy ProofMeet V2.0"
git push railway main
```

#### Step 2: Run Database Migration
Railway will automatically run `npx prisma migrate deploy` on startup.

**Or manually trigger:**
```bash
# In Railway dashboard, run this command:
npx prisma migrate deploy
```

#### Step 3: Seed Approved Court Domains
```bash
# In Railway dashboard, run:
npm run seed
```

#### Step 4: Verify Backend
```bash
curl https://proofmeet-backend-production.up.railway.app/health

# Should return:
# {"status":"OK","timestamp":"...","version":"2.0.0","system":"Court Compliance"}
```

#### Step 5: Deploy Frontend
```bash
cd frontend

# Update API URL in code or environment
# Make sure VITE_API_BASE_URL points to Railway backend

git add .
git commit -m "Deploy ProofMeet V2.0 Frontend"
git push vercel main
```

---

## 🔧 What Railway Does Automatically

### Build Process:
1. ✅ Installs dependencies (`npm install`)
2. ✅ Runs postinstall hook (`npx prisma generate`)
3. ✅ Runs build command (`npm run build`)
4. ✅ Compiles TypeScript to `dist/`

### Startup Process:
1. ✅ Runs migrations (`npx prisma migrate deploy`)
2. ✅ Generates Prisma Client (if not already done)
3. ✅ Starts server (`node dist/index.js`)

### No Manual Intervention Needed! 🎉

---

## 🐛 Troubleshooting Railway Deployment

### Build Fails: "Cannot find module"
**Cause:** Missing dependency  
**Fix:** Make sure it's in `dependencies` (not `devDependencies`)

### Build Fails: "Prisma Client not generated"
**Cause:** Prisma generate didn't run  
**Fix:** Check that `postinstall` script exists in package.json

### Runtime Error: "Database connection failed"
**Cause:** DATABASE_URL not set  
**Fix:** Railway should auto-provide this. Check environment variables.

### Runtime Error: "Module not found in dist/"
**Cause:** TypeScript didn't compile  
**Fix:** Check build logs, ensure `npm run build` succeeded

### Migration Fails
**Cause:** Schema conflicts  
**Fix:** Review migration files, may need to reset database

---

## 📊 Deployment Checklist

### Before Deploying to Production:

- [ ] All TypeScript errors resolved locally
- [ ] `npm run build` succeeds locally
- [ ] All tests passing
- [ ] Environment variables configured in Railway
- [ ] Database backup created (if migrating from Phase 1)
- [ ] CORS_ORIGIN includes production frontend URL
- [ ] BYPASS_EMAIL_VERIFICATION set to `false`
- [ ] JWT secrets are strong and unique
- [ ] SendGrid configured (if using email)
- [ ] Zoom API credentials set

### After Deployment:

- [ ] Health check returns `version: "2.0.0"`
- [ ] Can register Court Rep
- [ ] Can register Participant
- [ ] Can login
- [ ] Dashboard endpoints respond
- [ ] Frontend connects successfully

---

## 🔄 Rolling Back (If Needed)

### Option 1: Revert to Phase 1
```bash
# Checkout old code
git checkout phase1-tag

# Push to Railway
git push railway main --force

# Railway will automatically:
# - Rebuild with old code
# - Old schema still in database (migrations are additive)
```

### Option 2: Keep Both Versions
- Deploy V2.0 to new Railway project
- Keep Phase 1 running on old Railway project
- Gradually migrate users

---

## 📈 Monitoring After Deployment

### Check Health
```bash
curl https://proofmeet-backend-production.up.railway.app/health
```

### View Logs (Railway)
```bash
railway logs
```

### Check Database (Railway)
```bash
railway run npx prisma studio
```

### Test Registration
```bash
curl -X POST https://proofmeet-backend-production.up.railway.app/api/auth/register/court-rep \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.proofmeet.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "Officer"
  }'
```

---

## 🎯 Production URLs

**After Deployment:**

- **Backend API**: https://proofmeet-backend-production.up.railway.app
- **Frontend**: https://proof-meet-frontend.vercel.app
- **Health Check**: https://proofmeet-backend-production.up.railway.app/health

---

## 💡 Railway Pro Tips

### View Build Logs
```bash
railway logs --build
```

### Run Commands in Production
```bash
railway run npx prisma migrate deploy
railway run npm run seed
```

### Connect to Database
```bash
railway connect
```

---

## ✅ Deployment Verification

After deployment, test these endpoints:

```bash
# 1. Health check
curl https://proofmeet-backend-production.up.railway.app/health

# 2. Register Court Rep
curl -X POST https://proofmeet-backend-production.up.railway.app/api/auth/register/court-rep \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.proofmeet.com","password":"Test123!","firstName":"Test","lastName":"Officer"}'

# 3. Login
curl -X POST https://proofmeet-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.proofmeet.com","password":"Test123!"}'
```

---

## 🎉 You're All Set!

The deployment process is **exactly the same** as before:
- ✅ Push to Railway → Auto-deploy
- ✅ Push to Vercel → Auto-deploy
- ✅ No manual steps required
- ✅ Migrations run automatically
- ✅ Prisma Client generates automatically

**Just push and go!** 🚀

---

*Deployment Guide for ProofMeet V2.0*  
*Compatible with Railway + Vercel*

