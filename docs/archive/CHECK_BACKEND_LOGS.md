# 🔍 How to Check Backend Logs on Railway

## The Issue

You're getting: **500 Internal Server Error** when trying to login

This means:
- ✅ Frontend is correctly configured
- ✅ Frontend is successfully connecting to backend
- ❌ Backend is crashing or has an error when processing login

---

## Check Railway Logs (Critical!)

### Steps:
1. Go to: https://railway.app/dashboard
2. Select your **ProofMeet backend** project
3. Click on the **Deployments** tab
4. Click on the latest deployment
5. Click on **View Logs**
6. Look for errors around the time you tried to login

### What to Look For:

**Common Errors:**

```bash
# Missing JWT_SECRET
Error: JWT_SECRET is not defined

# Database connection error
Error: P1001: Can't reach database server
Error: Invalid DATABASE_URL

# bcrypt error (password hashing)
Error: Invalid bcrypt hash

# Prisma schema mismatch
Error: Invalid `prisma.user.findUnique()` invocation
```

---

## Check Environment Variables in Railway

Your backend needs these environment variables:

### Required Variables:
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-here
FRONTEND_URL=https://proof-meet-frontend.vercel.app
```

### Optional but Recommended:
```
NODE_ENV=production
PORT=5000
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
```

### How to Check/Add:
1. Go to Railway dashboard
2. Select your backend project
3. Go to **Variables** tab
4. Verify all required variables exist
5. Add any missing ones
6. Click **Deploy** to restart with new variables

---

## Common Fixes

### Fix 1: Missing JWT_SECRET

If logs show JWT error:

**Add to Railway:**
```
JWT_SECRET=your-super-secret-key-change-this-in-production
```

### Fix 2: Database Migration Not Run

If logs show Prisma schema error:

**Run in Railway:**
```bash
npx prisma migrate deploy
```

Or add to railway.json build command:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma generate && npx prisma migrate deploy && npm run build"
  }
}
```

### Fix 3: bcrypt Version Mismatch

If logs show bcrypt error, the build might need rebuilding:

1. Go to Railway dashboard
2. Click **Redeploy** (force rebuild)

---

## Quick Test from Command Line

Test if the backend login endpoint is working:

```bash
# PowerShell
$body = @{
    email = "testpo@test.com"
    password = "your-password-here"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://proofmeet-backend-production.up.railway.app/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

```bash
# Or use curl (if installed)
curl -X POST https://proofmeet-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testpo@test.com","password":"test123"}'
```

**Expected Response:**

If working:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGc...",
    "user": {...}
  }
}
```

If wrong password:
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

If 500 error: Backend has an issue (check logs!)

---

## Likely Cause

Based on your setup, the most likely issues are:

1. **JWT_SECRET not set** in Railway (most common)
2. **Database migration not run** after recent schema changes
3. **bcrypt compilation issue** in Railway build

---

## Action Plan

### Immediate Steps:

1. ✅ **Check Railway Logs** (most important!)
   - Will show exact error

2. ✅ **Verify JWT_SECRET exists**
   - Go to Railway → Variables
   - Add if missing: `JWT_SECRET=your-secret-here`

3. ✅ **Redeploy if needed**
   - After adding variables
   - Or if build was incomplete

---

## Report Back

After checking Railway logs, tell me:
1. What error you see in the logs
2. What environment variables you have set
3. When was the last successful deployment

I'll help you fix the specific issue!

