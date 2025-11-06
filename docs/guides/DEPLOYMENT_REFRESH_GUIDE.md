# Deployment & Data Refresh Guide

## Issue: Attendance Not Updating on Page Refresh

This happens when:
1. Railway deployment hasn't completed after database migration
2. Prisma client needs regeneration
3. Frontend is caching old data
4. Backend connection pool needs refresh

## Solutions

### 1. Manual On-Demand Redeployment

#### Option A: Railway Dashboard
1. Go to https://railway.app
2. Select your project → `proofmeet-backend`
3. Click **"Deploy"** → **"Redeploy"**
4. Wait 2-3 minutes for completion

#### Option B: Git Push Method
```bash
npm run redeploy
```
This will:
- Create a timestamp file
- Commit and push to trigger Railway
- Automatically start redeployment

#### Option C: Railway CLI (Fastest)
```bash
# Install Railway CLI (one-time)
npm install -g @railway/cli

# Login
railway login

# Trigger redeploy
railway up --detach
```

### 2. Automatic Daily Redeployment

**GitHub Actions workflow is set up to redeploy daily at 2 AM UTC.**

Location: `.github/workflows/daily-redeploy.yml`

#### To trigger manually:
1. Go to GitHub → Actions tab
2. Select "Daily Railway Redeploy"
3. Click "Run workflow"

### 3. Force Database Refresh (When Data Seems Stale)

On your backend (Railway):

```bash
npm run force-refresh-db
```

This will:
- Disconnect and reconnect to database
- Verify all tables exist
- Check for new photo verification tables
- Test database connectivity

### 4. Frontend Cache Clearing

#### For Vercel:
1. Go to Vercel dashboard
2. Select deployment
3. Click **"Redeploy"** → Check **"Use existing build cache"** = OFF

#### For Local Testing:
```bash
# Clear browser cache
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Or use incognito/private mode
```

### 5. Ensure Migrations Run on Deploy

Your `package.json` start script should have:
```json
"start": "npx prisma migrate deploy && npx prisma generate && node --trace-warnings dist/index.js"
```

**Verify in Railway logs** that you see:
```
✔ Generated Prisma Client
Prisma schema loaded from prisma/schema.prisma
```

## Common Issues & Fixes

### Issue 1: "Property 'participantIDPhoto' does not exist"

**Cause:** Prisma client not regenerated after migration

**Fix:**
```bash
cd backend
npx prisma generate
# Then redeploy
```

### Issue 2: Attendance Shows Old Data

**Cause:** Frontend caching or backend connection pool

**Fix:**
```bash
# Backend: Force refresh
npm run force-refresh-db

# Frontend: Hard refresh
Ctrl+Shift+R

# Or redeploy both
npm run redeploy  # Backend
# Vercel will auto-redeploy frontend on push
```

### Issue 3: Migration Not Running on Railway

**Check Railway logs for:**
```
Error: P1001: Can't reach database server
```

**Fix:** Ensure `DATABASE_URL` environment variable is set in Railway

### Issue 4: Tables Missing After Migration

**Manually run migration on Railway:**

1. Railway Dashboard → proofmeet-backend
2. Open Shell/Terminal
3. Run:
```bash
npx prisma migrate deploy
npx prisma generate
pm2 restart all
```

## Monitoring Deployment Status

### Railway:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Watch logs
railway logs
```

### Vercel:
```bash
# Install Vercel CLI
npm install -g vercel

# Watch logs
vercel logs proofmeet-frontend
```

## Automated Health Checks

### Backend Health Endpoint:
```
GET https://proofmeet-backend-production.up.railway.app/health
```

Should return:
```json
{
  "status": "OK",
  "database": "Connected",
  "userCount": 123,
  "version": "2.0.9"
}
```

### Check New Tables Exist:
```bash
curl https://proofmeet-backend-production.up.railway.app/health
```

Look for `userCount` - if it returns a number, database is connected.

## Best Practices

1. **After Schema Changes:**
   - Always run `npx prisma generate` locally
   - Commit the migration files
   - Push to trigger automatic deployment
   - Wait 3-5 minutes for Railway to complete

2. **Daily Automated Redeploy:**
   - Ensures Prisma client stays fresh
   - Clears connection pools
   - Runs any pending migrations

3. **Manual Redeploy When Needed:**
   - After adding new tables
   - When data seems stale
   - After environment variable changes

4. **Monitor Logs:**
   - Check Railway logs after every deploy
   - Look for "Generated Prisma Client"
   - Verify "No pending migrations"

## Quick Reference Commands

```bash
# Force backend redeploy
npm run redeploy

# Check database connection
npm run force-refresh-db

# Fix stale meetings
npm run fix-stale-meetings

# Generate Prisma client locally
cd backend && npx prisma generate

# Railway CLI redeploy
railway up --detach

# View Railway logs
railway logs
```

## Environment Variables Checklist

Ensure these are set in Railway:

- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `JWT_SECRET` - Authentication secret
- ✅ `FRONTEND_URL` - Vercel frontend URL
- ✅ `ZOOM_ACCOUNT_ID` - Zoom credentials
- ✅ `ZOOM_CLIENT_ID` - Zoom credentials
- ✅ `ZOOM_CLIENT_SECRET` - Zoom credentials

## Support

If data still isn't refreshing after trying these steps:

1. Check Railway logs for errors
2. Verify database connection in `/health` endpoint
3. Try manual migration: `railway run npx prisma migrate deploy`
4. Contact support with Railway deployment logs

---

**Last Updated:** October 24, 2025

