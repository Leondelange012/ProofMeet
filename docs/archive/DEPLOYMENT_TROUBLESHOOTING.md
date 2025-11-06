# 🔧 Deployment Troubleshooting Guide

## Issue: Cannot Login on Vercel Deployment

### Status Check (Completed) ✅

**Backend Status:**
- URL: https://proofmeet-backend-production.up.railway.app
- Status: ✅ RUNNING
- Database: ✅ CONNECTED
- Users in DB: 3
- CORS: ✅ Configured (allows all origins)

**Frontend Status:**
- URL: https://proof-meet-frontend.vercel.app
- Issue: Environment variable may not be set

---

## Solution Steps

### 1. Configure Vercel Environment Variables

**Required Variable:**
```
VITE_API_BASE_URL=https://proofmeet-backend-production.up.railway.app/api
```

**Steps:**
1. Visit: https://vercel.com/dashboard
2. Select project: `proof-meet-frontend`
3. Go to: **Settings** → **Environment Variables**
4. Click: **Add New**
5. Enter:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://proofmeet-backend-production.up.railway.app/api`
   - Environments: Check all (Production, Preview, Development)
6. Click **Save**

### 2. Redeploy to Apply Changes

**Option A: Git Push (Recommended)**
```bash
git commit --allow-empty -m "chore: trigger redeploy with env vars"
git push origin main
```

**Option B: Manual Redeploy**
1. Go to **Deployments** tab
2. Click **...** on latest deployment
3. Click **Redeploy**
4. Uncheck "Use existing Build Cache"
5. Click **Redeploy**

---

## Debugging Steps

### Check Network Requests

1. Open https://proof-meet-frontend.vercel.app/login
2. Open Browser DevTools (F12)
3. Go to **Network** tab
4. Try to login
5. Check API requests:

**Expected:**
```
POST https://proofmeet-backend-production.up.railway.app/api/v2/auth/login
Status: 200 OK (if credentials correct)
Status: 401 Unauthorized (if credentials wrong)
```

**If you see localhost:**
```
POST http://localhost:5000/api/v2/auth/login
Status: Failed (ERR_CONNECTION_REFUSED)
```
→ Environment variable not set or frontend not rebuilt

### Check Console Errors

Look for errors like:
```
❌ Failed to fetch
❌ Network error
❌ CORS error
❌ 500 Internal Server Error
```

### Test Backend Directly

```bash
# Health check
curl https://proofmeet-backend-production.up.railway.app/health

# Test login (replace with real credentials)
curl -X POST https://proofmeet-backend-production.up.railway.app/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## Common Issues & Solutions

### Issue 1: "Failed to fetch" or "Network error"

**Cause:** Frontend can't reach backend  
**Solution:** Check `VITE_API_BASE_URL` is set correctly in Vercel

### Issue 2: CORS Error

**Cause:** CORS policy blocking requests  
**Solution:** Backend CORS is already configured to allow all origins. If you see this:
1. Check if backend is running: `curl backend-url/health`
2. Check CORS headers in response

### Issue 3: 401 Unauthorized

**Cause:** Wrong credentials  
**Solution:** This means backend IS working! Just use correct email/password

### Issue 4: 500 Internal Server Error

**Cause:** Backend error (database, etc.)  
**Solution:** Check backend logs in Railway dashboard

### Issue 5: Cannot find user / Invalid credentials

**Cause:** User doesn't exist or password is wrong  
**Solution:** 
- Register a new account
- OR reset password
- OR check database for existing users

---

## Verify Successful Deployment

After redeploying, verify:

1. ✅ Environment variable shows in Vercel Settings
2. ✅ New deployment completed successfully
3. ✅ Login page loads without console errors
4. ✅ Network requests go to Railway backend
5. ✅ Can successfully login with test account

---

## Test Accounts

If you need to create a test account:

1. Go to: https://proof-meet-frontend.vercel.app/register/participant
2. Register new account
3. Check email for verification (if enabled)
4. Login with new credentials

Or register as Court Rep:
1. Go to: https://proof-meet-frontend.vercel.app/register/court-rep
2. Register with approved court domain

---

## Current System Status

**Backend (Railway):**
- ✅ Running: https://proofmeet-backend-production.up.railway.app
- ✅ Database: PostgreSQL connected
- ✅ Users: 3 in database
- ✅ CORS: Configured
- ✅ Health: OK

**Frontend (Vercel):**
- ⚠️ Environment: Needs `VITE_API_BASE_URL` configured
- ⚠️ Deployment: May need rebuild after env var set

**Verification Portal:**
- ✅ Public routes: /verify/search and /verify/:id
- ✅ No authentication required
- ✅ Ready to use

---

## Quick Fix Command

Run this to trigger a redeploy:

```bash
cd /path/to/ProofMeet
git commit --allow-empty -m "chore: trigger Vercel redeploy"
git push origin main
```

Then wait 2-3 minutes for Vercel to rebuild and redeploy.

---

## Need Help?

1. Check Vercel build logs for errors
2. Check Railway logs for backend issues
3. Check browser console for frontend errors
4. Verify environment variables are set correctly

---

**Last Updated:** October 23, 2025  
**Backend Health:** ✅ OPERATIONAL  
**Frontend:** ⚠️ Needs Environment Variable Configuration

