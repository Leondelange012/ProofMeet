# 🚨 DATABASE RESET ISSUE - FIXED

## Problem Summary

**Users were being deleted from the database every time Railway redeployed the backend.**

## Root Cause

The `backend/package.json` start script contained database-destructive commands:

```json
"start": "npx prisma generate && npx prisma db push --force-reset --accept-data-loss && node dist/index.js"
```

The flags `--force-reset` and `--accept-data-loss` **wipe the entire database** on every deployment, including:
- ✅ User accounts
- ✅ Attendance records
- ✅ Court cards
- ✅ All data

### Why Was This Added?

This was intentionally added during testing to ensure a clean slate on each deployment. The Memory Bank even documented it:

> ✅ Auto-reset database on deployment (testing mode)

However, **this should NEVER be in production!**

---

## The Fix

### ✅ **FIXED: Updated Start Script**

**Before (DANGEROUS):**
```json
"start": "npx prisma generate && npx prisma db push --force-reset --accept-data-loss && node dist/index.js"
```

**After (SAFE):**
```json
"start": "npx prisma migrate deploy && npx prisma generate && node dist/index.js"
```

Changes:
- ❌ Removed `--force-reset` flag
- ❌ Removed `--accept-data-loss` flag
- ✅ Changed `db push` to `migrate deploy`
- ✅ Added `start:testing` script for intentional resets

---

## What Happens Now?

### Before Fix:
1. Push code to Railway
2. Railway runs `npm start`
3. Database gets **wiped clean** 💀
4. All users lost
5. Fresh seed data loaded

### After Fix:
1. Push code to Railway
2. Railway runs `npm start`
3. Database **migrations applied safely** ✅
4. Existing data **preserved** ✅
5. Schema updated without data loss

---

## Critical Issue: Missing V2 Migration

Your database currently has:
- ✅ **Migration folder**: `backend/prisma/migrations/20240921000001_init/`
- ❌ **Problem**: This migration is for the **OLD V1 schema**
- ❌ **Current schema**: Your `schema.prisma` is **V2.0** (completely different)

### Schema Mismatch:

**V1 Schema (in migration):**
```sql
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    ...
)
```

**V2 Schema (current):**
```sql
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "user_type" UserType NOT NULL,
    "court_domain" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    ...
)
```

**They're completely different!** 😱

---

## Solution: Create V2 Migration

### Option 1: Create Proper Migration (RECOMMENDED)

```bash
cd backend

# Create a new migration from current schema
npx prisma migrate dev --name v2_court_compliance_schema

# This will:
# 1. Compare schema.prisma with current database
# 2. Generate SQL migration for changes
# 3. Apply migration to database
# 4. Update Prisma Client
```

### Option 2: Reset Database with V2 Schema (TESTING ONLY)

⚠️ **WARNING: This deletes all data!**

```bash
cd backend

# Reset database and create fresh V2 schema
npx prisma migrate reset

# Seed with test data
npm run seed
```

---

## Deployment Steps

### Step 1: Commit the Fix

```bash
git add backend/package.json
git commit -m "Fix: Remove database reset from production start script

- Changed 'start' script to use 'prisma migrate deploy'
- Moved destructive reset to 'start:testing' script
- Prevents data loss on every deployment"
```

### Step 2: Create V2 Migration

```bash
cd backend
npx prisma migrate dev --name v2_complete_schema
git add prisma/migrations
git commit -m "Add V2.0 schema migration"
```

### Step 3: Deploy to Railway

```bash
git push origin main
```

Railway will now:
1. Build the backend
2. Run `npm start`
3. Execute `prisma migrate deploy` (safe!)
4. Apply any new migrations
5. Start the server
6. **Keep all existing data** ✅

---

## For Local Development

### Setup Local Database

```bash
# Install PostgreSQL (if not installed)
# Windows: choco install postgresql
# Mac: brew install postgresql

# Create database
createdb proofmeet_v2

# Update .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/proofmeet_v2

# Run migrations
cd backend
npx prisma migrate deploy

# Seed test data
npm run seed
```

---

## Testing Scripts

### Safe Testing (Preserves Data)

```json
"start": "npx prisma migrate deploy && npx prisma generate && node dist/index.js"
```

### Testing with Reset (Wipes Data)

```json
"start:testing": "npx prisma generate && npx prisma db push --force-reset --accept-data-loss && node dist/index.js"
```

**Use `start:testing` ONLY in development/testing environments!**

---

## Verification Checklist

### Before Next Deployment:

- [x] ✅ `package.json` start script fixed
- [ ] ⏳ Create V2 migration (`npx prisma migrate dev`)
- [ ] ⏳ Test migration locally
- [ ] ⏳ Commit and push changes
- [ ] ⏳ Verify Railway deployment succeeds
- [ ] ⏳ Verify existing users still exist in database
- [ ] ⏳ Update Memory Bank to remove "Auto-reset" note

### After Deployment:

- [ ] Check Railway logs for migration success
- [ ] Verify user count: `GET /health` endpoint
- [ ] Test login with existing accounts
- [ ] Create a new test user
- [ ] Verify new user persists after redeployment

---

## Railway Environment Check

### Current Railway Config

**File**: `backend/railway.json`
```json
{
  "deploy": {
    "startCommand": "npm start"
  }
}
```

✅ This is correct! It will now use the fixed start script.

---

## Prevention: Never Do This Again

### ❌ NEVER in Production:

```bash
--force-reset
--accept-data-loss
prisma db push --force
prisma migrate reset
prisma db seed (unless intentional)
```

### ✅ ALWAYS in Production:

```bash
prisma migrate deploy   # Safe: applies pending migrations
prisma generate         # Safe: updates client
prisma migrate status   # Safe: check migration state
```

---

## Summary

### What Was Broken:
- ❌ Every deployment wiped the database
- ❌ All user accounts deleted
- ❌ All data lost

### What's Fixed:
- ✅ Removed `--force-reset` from start script
- ✅ Changed to safe `migrate deploy` approach
- ✅ Data will persist across deployments

### What's Still Needed:
- ⏳ Create proper V2 migration
- ⏳ Deploy to Railway
- ⏳ Verify data persistence

---

## Next Steps

1. **Create migration:**
   ```bash
   cd backend
   npx prisma migrate dev --name v2_complete_schema
   ```

2. **Test locally:**
   ```bash
   npm run dev
   # Verify database works
   ```

3. **Deploy:**
   ```bash
   git add .
   git commit -m "Add V2 migration and fix production database reset"
   git push origin main
   ```

4. **Monitor Railway:**
   - Watch deployment logs
   - Check for migration success
   - Verify /health endpoint shows user count

---

**Date Fixed**: October 12, 2025  
**Issue Duration**: Since V2.0 deployment (October 11, 2025)  
**Impact**: All user data was being wiped on every deployment  
**Status**: ✅ FIXED - Ready for deployment

---

## Related Documentation

- `MEMORY_BANK.md` - Update to remove "Auto-reset" notes
- `backend/QUICK_START.md` - Local development setup
- `ENVIRONMENT_SETUP.md` - Environment configuration
- `docs/API_DOCUMENTATION.md` - API reference

