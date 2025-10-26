# 🔄 V1 to V2 Cleanup Plan

## Current Situation

Your ProofMeet application has **transitioned from V1 to V2**, but V1 code still exists as backup/reference.

**Status:**
- ✅ V2 is ACTIVE and in production (Railway + Vercel)
- ❌ V1 is DISABLED and not used anywhere
- ⚠️ V1 code is still in the repository (backup/v1-backup folders)

---

## V1 vs V2 Differences

### V1 (Phase 1 - October 2024)
- **User Model:** Simple `isHost` boolean
- **Roles:** Basic host/participant distinction
- **Features:** Meeting tracking, QR codes, basic attendance

### V2 (Current - October 2024)
- **User Model:** Complex `UserType` enum (COURT_REP | PARTICIPANT)
- **Roles:** Court Representatives and Participants with detailed profiles
- **Features:** Court compliance, court cards, compliance monitoring, email notifications
- **Schema:** Completely different (incompatible with V1)

**They are NOT compatible!** You cannot run V1 code with V2 schema.

---

## What's Currently Using V2

### Backend (All V2):
- ✅ `backend/src/routes/auth-v2.ts`
- ✅ `backend/src/routes/court-rep.ts`
- ✅ `backend/src/routes/participant.ts`
- ✅ `backend/src/routes/admin.ts`
- ✅ `backend/src/middleware/auth.ts` (V2 authentication)
- ✅ `backend/prisma/schema.prisma` (V2 schema)

### Frontend (All V2):
- ✅ `frontend/src/services/authService-v2.ts`
- ✅ `frontend/src/hooks/useAuthStore-v2.ts`
- ✅ All pages use V2 models (CourtRepDashboardPage, ParticipantDashboardPage, etc.)

### Database:
- ✅ V2 schema deployed
- ✅ V2 migrations applied
- ✅ 2 users in V2 format

---

## V1 Code (Unused - Safe to Delete)

### Backend V1 Code:
**Directory:** `backend/src/routes/v1-backup/`
- ❌ `v1-backup/attendance.ts` - 89 lines
- ❌ `v1-backup/auth.ts` - 150+ lines
- ❌ `v1-backup/compliance.ts` - 100+ lines
- ❌ `v1-backup/meetings.ts` - 200+ lines
- ❌ `v1-backup/qr.ts` - 75+ lines

**Status:** All V1 route imports are commented out in `index.ts`
```typescript
// V1 Routes - DISABLED
// import { authRoutes } from './routes/auth';
// import { meetingRoutes } from './routes/meetings';
// ...
```

### Frontend V1 Code:
- ❌ `frontend/src/services/authService.ts` (V1 auth service)
- ❌ `frontend/src/services/meetingService.ts` (V1 meeting service)
- ❌ `frontend/src/hooks/useAuthStore.ts` (V1 auth hook)

**Status:** Frontend uses V2 equivalents:
- Uses `authService-v2.ts` instead
- Uses `useAuthStore-v2.ts` instead

### Duplicate Schema:
- ❌ `backend/prisma/schema-v2.prisma` (duplicate of `schema.prisma`)

**Status:** You only need `schema.prisma`

---

## Cleanup Impact Assessment

### Files to Delete: 10 files

**Backend (6 files):**
1. `backend/src/routes/v1-backup/attendance.ts`
2. `backend/src/routes/v1-backup/auth.ts`
3. `backend/src/routes/v1-backup/compliance.ts`
4. `backend/src/routes/v1-backup/meetings.ts`
5. `backend/src/routes/v1-backup/qr.ts`
6. `backend/prisma/schema-v2.prisma` (duplicate)

**Frontend (3 files):**
7. `frontend/src/services/authService.ts`
8. `frontend/src/services/meetingService.ts`
9. `frontend/src/hooks/useAuthStore.ts`

**Backend Index Cleanup:**
10. Remove commented V1 imports from `backend/src/index.ts`

### Lines to Remove: ~800+ lines

---

## Functionality Check

### Will Anything Break?

**NO! Nothing will break because:**

1. **Backend:**
   - V1 routes are already commented out
   - V1 routes are not registered in Express
   - No code references V1 routes

2. **Frontend:**
   - App uses `authService-v2.ts`
   - App uses `useAuthStore-v2.ts`
   - No imports of V1 services

3. **Database:**
   - V2 schema is active
   - V1 schema would not work with current database

### What You'll Keep:

**All V2 Functionality:**
- ✅ Court Rep registration and dashboard
- ✅ Participant registration and dashboard
- ✅ JWT authentication (V2)
- ✅ Meeting attendance tracking
- ✅ Court card generation
- ✅ Compliance monitoring
- ✅ Email notifications
- ✅ Admin features

**Nothing is lost!**

---

## Benefits of Cleanup

1. **Clearer Codebase**
   - No confusion about which version to use
   - Cleaner directory structure
   - Easier for new developers

2. **Reduced Maintenance**
   - Don't maintain dead code
   - No risk of accidentally using V1

3. **Smaller Repository**
   - ~800 lines removed
   - Faster clones
   - Less confusion

4. **Better Security**
   - Remove old, unmaintained code
   - Reduce attack surface

---

## Cleanup Steps

### Step 1: Remove V1 Backend Code
```bash
# Remove V1 routes directory
rm -rf backend/src/routes/v1-backup/

# Remove duplicate schema
rm backend/prisma/schema-v2.prisma
```

### Step 2: Remove V1 Frontend Code
```bash
# Remove V1 services
rm frontend/src/services/authService.ts
rm frontend/src/services/meetingService.ts

# Remove V1 hook
rm frontend/src/hooks/useAuthStore.ts
```

### Step 3: Clean Up Backend Index
Edit `backend/src/index.ts`:
- Remove commented V1 import lines (17-22)
- Remove commented V1 route registration lines (91-102)

### Step 4: Verify
```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build

# Both should build successfully
```

### Step 5: Commit
```bash
git add -A
git commit -m "Cleanup: Remove unused V1 code

- Removed backend/src/routes/v1-backup/ directory (5 files)
- Removed frontend V1 services (authService.ts, meetingService.ts)
- Removed frontend V1 hook (useAuthStore.ts)
- Removed duplicate schema-v2.prisma
- Cleaned up commented V1 imports in index.ts

V2 is the only active version now. No functionality lost.
All V2 features remain:
- Court Rep/Participant system
- Authentication and authorization
- Meeting attendance
- Court card generation
- Compliance monitoring

FILES REMOVED: 10
LINES REMOVED: ~800+"

git push origin main
```

---

## Repositories

### Current Setup:
**Main Repo:** https://github.com/Leondelange012/ProofMeet.git
- ✅ Monorepo (backend + frontend)
- ✅ Deployed to Railway (backend) + Vercel (frontend)
- ✅ Clean, working setup

### Question About ProofMeet-backend:
If you have a separate `ProofMeet-backend` repository:
- ⚠️ It's likely OLD/UNUSED
- ⚠️ The monorepo approach is better
- ⚠️ Consider archiving it if it exists

**Monorepo Benefits:**
- ✅ Single source of truth
- ✅ Easier to keep frontend/backend in sync
- ✅ Simpler deployment
- ✅ Better for full-stack development

---

## Safety Notes

### Before Cleanup:
1. ✅ Everything is committed to Git
2. ✅ Can always recover files from Git history
3. ✅ V1 code hasn't been used in weeks
4. ✅ V2 is fully operational in production

### After Cleanup:
- Repository will be cleaner
- Only V2 code remains
- No functionality lost
- Easier to maintain

---

## Questions to Answer

1. **Do you have a separate ProofMeet-backend repository?**
   - If yes: Is it being used? (Likely NO)
   - If yes: Should we archive it?

2. **Do you want to proceed with V1 cleanup?**
   - Removes ~800 lines of unused code
   - Makes codebase cleaner
   - No functionality lost

3. **Should we rename V2 files?**
   - `authService-v2.ts` → `authService.ts` (since V1 is gone)
   - `useAuthStore-v2.ts` → `useAuthStore.ts`
   - Makes naming cleaner (no need for "-v2" suffix)

---

## Recommendation

**YES, clean up V1 code!**

**Reasons:**
1. ✅ V1 is not used anywhere
2. ✅ V2 is fully operational
3. ✅ Schema is incompatible (can't run V1 anyway)
4. ✅ Makes codebase cleaner
5. ✅ Easy to recover if needed (Git history)
6. ✅ Reduces confusion

**Risk Level:** 🟢 **VERY LOW**
- V1 code is already disabled
- V2 is working perfectly
- Everything is in Git

---

**Status:** Ready to execute  
**Impact:** Positive (cleaner code)  
**Risk:** Very Low  
**Recommendation:** Proceed with cleanup


