# Deployment & Database Refresh Schedule

## Current Configuration

### 🔄 Automatic Updates

#### 1. **Backend (Railway) - Daily**
- **Frequency**: Once per day at **2:00 AM UTC** (9:00 PM EST / 6:00 PM PST)
- **Method**: GitHub Actions workflow (`daily-redeploy.yml`)
- **What Happens**:
  - Creates a commit to trigger Railway
  - Railway rebuilds backend
  - Runs `npx prisma migrate deploy` (applies new migrations)
  - Runs `npx prisma generate` (updates Prisma client)
  - Restarts server with latest code
- **Database**: PostgreSQL is persistent (not reset, just migrations applied)

#### 2. **Frontend (Vercel) - Instant**
- **Frequency**: Every time you push to `main` branch
- **Method**: Vercel GitHub integration
- **What Happens**:
  - Detects new commits automatically
  - Builds frontend (~2 minutes)
  - Deploys to production
  - No database (frontend is stateless)
- **Trigger**: Automatic on `git push`

---

### ⚡ Real-Time Updates

#### **Database (Railway PostgreSQL)**
- **Type**: Persistent database
- **Refresh**: Never auto-refreshes (data persists)
- **Updates**: Only when migrations run or you manually modify data
- **Connection**: Always live - changes reflect immediately

#### **API Server (Railway Backend)**
- **Restarts**: Only when code changes are deployed
- **Migrations**: Run automatically on startup
- **Prisma Client**: Regenerated on every deployment

---

### 📊 What Gets Refreshed When

| Component | Frequency | Trigger | What Refreshes |
|-----------|-----------|---------|----------------|
| **Backend Code** | Daily at 2 AM UTC | GitHub Actions | Application logic, routes, services |
| **Database Schema** | On deployment | Prisma migrations | Tables, columns, indexes |
| **Database Data** | Never (unless manual) | Your actions | Persistent - never reset |
| **Frontend** | On every push | Git push to main | UI, components, styling |
| **Prisma Client** | On every deployment | npm start | TypeScript types, queries |

---

## 🔧 Manual Refresh Options

### 1. **Immediate Backend Redeploy**
```bash
npm run redeploy
```
or go to Railway Dashboard → Deploy → Redeploy

### 2. **Force Database Schema Refresh**
```bash
npm run force-refresh-db
```
This checks if new tables exist and verifies schema.

### 3. **Update QR Codes for Existing Court Cards**
```bash
npm run update-qr-codes
```
or click "Update QR Codes" button in Court Rep dashboard.

### 4. **Fix Stale Meetings**
```bash
npm run fix-stale-meetings
```
or click "Fix Stale Meetings" button in Court Rep dashboard.

---

## 🕐 Current Schedule Times

### Daily Automated Redeploy
- **UTC**: 2:00 AM
- **EST (New York)**: 9:00 PM (previous day)
- **CST (Chicago)**: 8:00 PM (previous day)
- **MST (Denver)**: 7:00 PM (previous day)
- **PST (Los Angeles)**: 6:00 PM (previous day)

### Why 2 AM UTC?
- Low traffic time for most users
- Before business hours in Europe/Africa
- After business hours in Americas
- Minimal disruption

---

## 📱 How Frontend Updates Reflect

### Immediate (< 3 minutes)
- ✅ UI changes
- ✅ New components
- ✅ Styling updates
- ✅ Button additions
- ✅ Text changes

### After Backend Deploys (daily or manual)
- ✅ New API endpoints
- ✅ Database schema changes
- ✅ Business logic updates
- ✅ Validation rules

### Requires Page Refresh
- ✅ Changes to already-loaded data
- ✅ New API responses
- ✅ Updated court card formats
- ✅ QR code generation logic

---

## 🔍 Checking Deployment Status

### Railway (Backend)
1. Go to: https://railway.app
2. Click on `proofmeet-backend`
3. Check deployment status:
   - 🟢 **Active** = Running
   - 🟡 **Building** = Deploying
   - 🔴 **Failed** = Error

### Vercel (Frontend)
1. Go to: https://vercel.com/dashboard
2. Click on `proof-meet-frontend`
3. Check latest deployment:
   - ✅ **Ready** = Live
   - ⏳ **Building** = Deploying
   - ❌ **Error** = Failed

---

## 🎯 For Your Current QR Code Issue

### What Needs to Happen:
1. **Backend deploys** (happening now, ~2-3 min)
   - New migration runs
   - Adds `verificationUrl` and `qrCodeData` columns
   - New endpoint `/admin/update-qr-codes` available

2. **Frontend updates** (already happened)
   - "Update QR Codes" button visible
   - Calls new endpoint

3. **You click button** (manual action required)
   - Updates existing court cards
   - Populates QR code data

4. **Download new PDF** (manual action)
   - Contains actual QR code image
   - Shows verification URL

### Timeline:
- ✅ **0:00** - Code pushed to GitHub
- ✅ **0:30** - Vercel deploys frontend (automatic)
- ⏳ **Now** - Railway deploying backend (2-3 min)
- 🎯 **Next** - You click "Update QR Codes" button
- ✅ **Done** - Download court card with QR code

---

## 💡 Recommendations

### For Faster Iteration:
If you need more frequent updates during active development:
1. **Change daily schedule** to hourly:
   ```yaml
   # In .github/workflows/daily-redeploy.yml
   cron: '0 * * * *'  # Every hour instead of daily
   ```

2. **Add webhook** for instant deploys:
   - Railway → Settings → Generate Webhook
   - Add to GitHub Actions secrets
   - Deploy on every push

### For Production Stability:
Current setup is good:
- Daily updates are frequent enough
- Manual controls for urgent fixes
- Database persists (no data loss)

---

## 🚨 Important Notes

### Database Data
- **Never auto-resets** - Your data is safe
- **Migrations only add/modify** schema
- **No data loss** on deployments

### Deployment Windows
- **Backend**: 2-3 minutes downtime during deploy
- **Frontend**: Zero downtime (seamless switch)
- **Database**: No downtime

### Cache Considerations
Users may need to:
- Hard refresh browser (`Ctrl + Shift + R`)
- Clear cache for latest frontend
- Re-login after backend updates

---

## Current Status Summary

| Service | Update Frequency | Last Deployment | Next Scheduled |
|---------|-----------------|-----------------|----------------|
| Backend (Railway) | Daily 2 AM UTC | Just now (manual) | Tomorrow 2 AM UTC |
| Frontend (Vercel) | On every push | Just now (automatic) | Next push |
| Database (PostgreSQL) | Persistent | Always live | N/A |
| GitHub Actions | Daily 2 AM UTC | Tomorrow | Daily thereafter |

---

**Want to change the schedule?** Edit `.github/workflows/daily-redeploy.yml` and adjust the `cron` expression.

