# 🚀 Deploy Database Fix - Step-by-Step Guide

## What This Fixes

Your users are being deleted because Railway resets the database on every deployment. This guide will fix that permanently.

---

## Changes Made

### ✅ 1. Fixed package.json Start Script

**File**: `backend/package.json`

**Before (DANGEROUS):**
```json
"start": "npx prisma generate && npx prisma db push --force-reset --accept-data-loss && node dist/index.js"
```

**After (SAFE):**
```json
"start": "npx prisma migrate deploy && npx prisma generate && node dist/index.js"
```

### ✅ 2. Created V2 Migration

**File**: `backend/prisma/migrations/20241012000001_v2_complete_schema/migration.sql`

This migration:
- Drops old V1 tables
- Creates new V2 schema (Court Rep/Participant system)
- Sets up all relationships, indexes, and constraints
- Preserves data structure for production

---

## Deployment Steps

### Step 1: Review Changes

```bash
# Check what files changed
git status
```

You should see:
- ✅ `backend/package.json` (modified)
- ✅ `backend/prisma/migrations/20241012000001_v2_complete_schema/migration.sql` (new)
- ✅ `DATABASE_RESET_ISSUE_FIXED.md` (new)
- ✅ `DEPLOY_DATABASE_FIX.md` (new)

### Step 2: Commit Changes

```powershell
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Fix: Prevent database reset on deployment

- Removed --force-reset from production start script
- Added proper V2 schema migration
- Data will now persist across deployments
- Moved destructive reset to start:testing script

Fixes database reset issue where users were deleted on every deploy."
```

### Step 3: Push to GitHub

```powershell
git push origin main
```

### Step 4: Monitor Railway Deployment

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select your ProofMeet backend project**
3. **Watch the deployment logs**

You should see:
```
✅ Building...
✅ Running migrations...
✅ Applying migration: 20241012000001_v2_complete_schema
✅ Migration applied successfully
✅ Generating Prisma Client...
✅ Starting server...
✅ Server running on port XXXX
```

### Step 5: Verify Fix

After deployment completes:

**Check 1: Health Endpoint**
```powershell
Invoke-WebRequest -Uri "https://proofmeet-backend-production.up.railway.app/health" | Select-Object -ExpandProperty Content
```

Should show:
```json
{
  "status": "OK",
  "version": "2.0.5",
  "database": "Connected",
  "userCount": 0
}
```

**Check 2: Create Test User**

Register a new user at:
https://proof-meet-frontend.vercel.app/register

**Check 3: Wait for Railway to Redeploy**

Trigger another deployment (push any small change) and verify the user still exists!

---

## ⚠️ Important Notes

### Data Loss Warning

**This migration drops all existing data!**

Why? Because the V1 and V2 schemas are completely different:
- V1: `isHost` field (boolean)
- V2: `userType` enum (COURT_REP | PARTICIPANT)

The schemas are incompatible, so we start fresh with V2.

**If you had important data in V1**, we would need to create a data migration script. But since the system has been resetting on every deployment anyway, there's no data to preserve.

### Future Deployments

After this fix, your database will:
- ✅ Keep all user accounts
- ✅ Keep all attendance records
- ✅ Keep all court cards
- ✅ Apply new migrations safely
- ✅ Never reset automatically

---

## Testing Locally (Optional)

If you want to test locally:

### Install PostgreSQL

```powershell
# Using Chocolatey
choco install postgresql

# OR download from:
# https://www.postgresql.org/download/windows/
```

### Setup Local Database

```powershell
# Create database
createdb proofmeet_v2

# Configure environment
cd backend
Copy-Item env.example .env

# Edit .env:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/proofmeet_v2
# JWT_SECRET=dev-secret-key
# BYPASS_EMAIL_VERIFICATION=true

# Run migrations
npx prisma migrate deploy

# Seed test data
npm run seed

# Start server
npm run dev
```

---

## Rollback Plan (Just in Case)

If something goes wrong:

### Option 1: Revert to Previous Deployment

In Railway Dashboard:
1. Go to Deployments tab
2. Find previous working deployment
3. Click "Redeploy"

### Option 2: Revert Git Changes

```powershell
git revert HEAD
git push origin main
```

### Option 3: Emergency Database Reset

⚠️ Only if absolutely necessary:

```powershell
# In Railway Dashboard, run this command:
npx prisma migrate reset --skip-seed
npx prisma migrate deploy
```

---

## Verification Checklist

After deployment, verify:

- [ ] Railway deployment succeeded
- [ ] No errors in Railway logs
- [ ] `/health` endpoint returns 200 OK
- [ ] Can register new user
- [ ] Can login with new user
- [ ] User persists after another deployment
- [ ] Frontend can connect to backend
- [ ] API requests work

---

## Success Criteria

✅ **Fix is successful when:**

1. You can create a user
2. Push a new deployment to Railway
3. User still exists in database
4. Login still works
5. No data loss

---

## Common Issues

### Issue: Migration fails with "table already exists"

**Solution**: Railway database might be in inconsistent state.

```powershell
# In Railway terminal/console:
npx prisma migrate resolve --applied 20241012000001_v2_complete_schema
npx prisma migrate deploy
```

### Issue: "Prisma Client not generated"

**Solution**: Generate client manually

```powershell
# In Railway terminal:
npx prisma generate
```

### Issue: Old schema conflicts with new migration

**Solution**: Reset database (development only!)

```powershell
# In Railway terminal (TESTING ONLY):
npx prisma migrate reset
npx prisma migrate deploy
npm run seed
```

---

## Next Steps After Fix

1. ✅ Deploy this fix
2. ✅ Verify data persists
3. ✅ Update Memory Bank to remove "Auto-reset" notes
4. ⏭️ Continue building features:
   - Meeting join/leave flow
   - Court card generation
   - Real AA API integration
   - Email notifications

---

## Support

If you encounter issues:

1. **Check Railway logs**: Look for error messages
2. **Check GitHub Actions**: Ensure build succeeds
3. **Check database**: Use Railway's database panel
4. **Check Prisma**: Run `npx prisma db pull` to see current schema

---

**Date**: October 12, 2025  
**Status**: Ready to deploy  
**Risk Level**: Low (database was already resetting)  
**Expected Downtime**: < 30 seconds  

---

## TL;DR - Quick Deploy

```powershell
# 1. Commit changes
git add .
git commit -m "Fix: Prevent database reset on deployment"

# 2. Push to trigger deployment
git push origin main

# 3. Wait for Railway deployment
# 4. Verify at /health endpoint
# 5. Create test user
# 6. Verify user persists after redeployment
```

**That's it!** 🎉

Your database will no longer reset on every deployment.

