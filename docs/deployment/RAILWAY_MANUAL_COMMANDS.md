# 🚂 Railway Environment Variables - Manual Commands

## Quick Setup (Copy & Paste)

### Step 1: Login and Link

```powershell
# Navigate to backend directory
cd backend

# Login to Railway (opens browser)
railway login

# Link to your project
railway link
# Select: proofmeet-backend-production
```

---

### Step 2: Set Environment Variables

**Copy and paste these commands ONE AT A TIME:**

```powershell
# 1. JWT Secret (512-bit cryptographically secure)
railway variables --set JWT_SECRET="926741c47085fb528b9e215ff50a7932f2ecd905c7dc2b1afb4059e782acd24537a0cf9e52dcb9f1118bacaca6c7acac251a9213a3091027c3c0640f90e1f367"

# 2. JWT Expiration
railway variables --set JWT_EXPIRES_IN="24h"

# 3. Node Environment
railway variables --set NODE_ENV="production"

# 4. CORS Origin (your Vercel frontend URL)
railway variables --set CORS_ORIGIN="https://proof-meet-frontend.vercel.app"

# 5. Email Verification (false for production)
railway variables --set BYPASS_EMAIL_VERIFICATION="false"

# 6. Logging Level
railway variables --set LOG_LEVEL="info"

# 7. Bcrypt Rounds
railway variables --set BCRYPT_ROUNDS="12"

# 8. Rate Limiting - Time Window (15 minutes)
railway variables --set RATE_LIMIT_WINDOW_MS="900000"

# 9. Rate Limiting - Max Requests
railway variables --set RATE_LIMIT_MAX_REQUESTS="100"
```

---

### Step 3: Verify

```powershell
# List all environment variables
railway variables

# Check DATABASE_URL is auto-set
railway variables --name DATABASE_URL
```

---

### Step 4: Monitor Deployment

```powershell
# Watch deployment logs
railway logs --follow

# Check deployment status
railway status
```

---

### Step 5: Test

```powershell
# Test health endpoint (wait 2-3 minutes for deployment)
curl https://proofmeet-backend-production.up.railway.app/health

# Should return:
# {
#   "status": "OK",
#   "database": "Connected",
#   "version": "2.0.8",
#   ...
# }
```

---

## 🔍 Troubleshooting

### Issue: "Cannot login in non-interactive mode"
**Solution:** Run commands in a regular PowerShell window (not through automated script)

### Issue: "Project not found"
**Solution:**
```powershell
# Unlink and relink
railway unlink
railway link
# Select the correct project
```

### Issue: Variables not showing up
**Solution:**
```powershell
# Verify you're linked to the correct project
railway status

# Re-set a specific variable
railway variables --set KEY="value"
```

### Issue: Deployment fails after setting variables
**Solution:**
```powershell
# Check logs for errors
railway logs

# Verify DATABASE_URL is set (should be automatic)
railway variables --name DATABASE_URL

# Trigger manual redeploy
railway up
```

---

## 📊 Environment Variables Checklist

After running all commands, verify these are set:

- [ ] `JWT_SECRET` (512-bit secure random)
- [ ] `JWT_EXPIRES_IN` (24h)
- [ ] `NODE_ENV` (production)
- [ ] `CORS_ORIGIN` (Vercel URL)
- [ ] `BYPASS_EMAIL_VERIFICATION` (false)
- [ ] `LOG_LEVEL` (info)
- [ ] `BCRYPT_ROUNDS` (12)
- [ ] `RATE_LIMIT_WINDOW_MS` (900000)
- [ ] `RATE_LIMIT_MAX_REQUESTS` (100)
- [ ] `DATABASE_URL` (auto-set by Railway)
- [ ] `PORT` (auto-set by Railway)

---

## 🎯 Success Criteria

✅ All variables show up in `railway variables`  
✅ Deployment completes successfully  
✅ `/health` endpoint returns 200 OK  
✅ Database is connected  
✅ No errors in Railway logs  

---

## 🔐 Security Notes

**Your JWT Secret:**
```
926741c47085fb528b9e215ff50a7932f2ecd905c7dc2b1afb4059e782acd24537a0cf9e52dcb9f1118bacaca6c7acac251a9213a3091027c3c0640f90e1f367
```

- ✅ 512-bit entropy
- ✅ Cryptographically secure
- ✅ Never stored in version control
- ⚠️ Save this securely!

**Rotation Schedule:**
- JWT_SECRET: Every 90 days
- Review and update as needed

---

## 📞 Need Help?

**Railway Dashboard:** https://railway.app/dashboard  
**Railway Docs:** https://docs.railway.app  
**Railway Discord:** https://discord.gg/railway  

---

**Created:** October 15, 2025  
**Status:** Ready to execute  
**Time Required:** ~5 minutes  


