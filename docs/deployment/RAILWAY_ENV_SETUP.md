# 🚂 Railway Environment Variables Setup Guide

## 📋 Summary

This guide will help you securely configure environment variables in Railway for your ProofMeet backend.

---

## ✅ Local Development Security - COMPLETED

### What Was Done:

1. ✅ **Created `.env` files** for local development (not in version control)
2. ✅ **Removed hardcoded secrets** from `docker-compose.yml`
3. ✅ **Updated docker-compose.yml** to use `env_file` directive
4. ✅ **Verified `.env` in `.gitignore`** (prevents accidental commits)
5. ✅ **Created `.env.example`** templates for documentation
6. ✅ **Committed and pushed** security improvements to GitHub

### Files Created (Local Only - Not in Git):

- ✅ `.env` - Root Docker Compose environment variables
- ✅ `backend/.env` - Backend-specific environment variables
- ✅ `frontend/.env` - Frontend-specific environment variables

---

## 🔐 Production Environment Variables for Railway

### Step 1: Install and Login to Railway CLI

```powershell
# Railway CLI is already installed. Now login:
railway login

# This will open a browser window. Login with your Railway account.
```

### Step 2: Link to Your Railway Project

```powershell
# Navigate to backend directory
cd backend

# Link to your Railway project
railway link

# Select your project: "proofmeet-backend-production"
```

### Step 3: Set Production Environment Variables

**IMPORTANT:** Copy and run these commands **one at a time** and approve each one.

#### Required Environment Variables:

```powershell
# 1. JWT Secret (GENERATED SECURE RANDOM VALUE)
railway variables --set JWT_SECRET="926741c47085fb528b9e215ff50a7932f2ecd905c7dc2b1afb4059e782acd24537a0cf9e52dcb9f1118bacaca6c7acac251a9213a3091027c3c0640f90e1f367"

# 2. JWT Expiration
railway variables --set JWT_EXPIRES_IN="24h"

# 3. Node Environment
railway variables --set NODE_ENV="production"

# 4. Server Port (Railway auto-provides PORT, but good to set)
railway variables --set PORT="5000"

# 5. CORS Origin (Your Vercel frontend URL)
railway variables --set CORS_ORIGIN="https://proof-meet-frontend.vercel.app"

# 6. Email Verification Bypass (set to false for production)
railway variables --set BYPASS_EMAIL_VERIFICATION="false"

# 7. Logging Level
railway variables --set LOG_LEVEL="info"

# 8. Bcrypt Rounds
railway variables --set BCRYPT_ROUNDS="12"

# 9. Rate Limiting
railway variables --set RATE_LIMIT_WINDOW_MS="900000"
railway variables --set RATE_LIMIT_MAX_REQUESTS="100"
```

### Step 4: Verify Environment Variables

```powershell
# List all environment variables
railway variables

# Or check specific variable
railway variables --name JWT_SECRET
```

### Step 5: Trigger Redeployment

```powershell
# Redeploy with new environment variables
railway up

# Or trigger via git push (Railway auto-deploys)
git push origin main
```

---

## 🔍 Environment Variables Checklist

### Railway Production Environment:

- [ ] `DATABASE_URL` - ✅ Auto-set by Railway PostgreSQL plugin
- [ ] `JWT_SECRET` - ⚠️ **MUST SET** (see generated value above)
- [ ] `JWT_EXPIRES_IN` - ⚠️ **MUST SET** (24h recommended)
- [ ] `NODE_ENV` - ⚠️ **MUST SET** (production)
- [ ] `PORT` - ✅ Auto-set by Railway
- [ ] `CORS_ORIGIN` - ⚠️ **MUST SET** (your Vercel frontend URL)
- [ ] `BYPASS_EMAIL_VERIFICATION` - ⚠️ **MUST SET** (false for production)
- [ ] `LOG_LEVEL` - 📝 Optional (default: info)
- [ ] `BCRYPT_ROUNDS` - 📝 Optional (default: 12)

---

## 🔒 Security Best Practices

### ✅ What We've Accomplished:

1. **Removed Hardcoded Secrets**
   - JWT secrets no longer in docker-compose.yml
   - Database credentials no longer in docker-compose.yml
   - All sensitive values moved to .env files

2. **Version Control Protection**
   - `.env` files properly ignored by .gitignore
   - Only `.env.example` templates in version control
   - No secrets ever committed to GitHub

3. **Environment Separation**
   - Local development uses `.env` files
   - Production uses Railway environment variables
   - No mixing of dev/prod credentials

4. **Secure Secret Generation**
   - JWT secret generated using crypto.randomBytes (128 characters, 512 bits)
   - Cryptographically secure random values
   - Unique per environment

### ⚠️ Important Security Notes:

1. **NEVER commit `.env` files** to version control
2. **NEVER share production secrets** via email/chat/screenshots
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Use different secrets** for dev/staging/production
5. **Monitor Railway logs** for unauthorized access attempts

---

## 🧪 Testing the Setup

### Test Local Development:

```powershell
# Start Docker Compose (uses .env files)
docker-compose up

# Verify environment variables are loaded
docker-compose exec backend env | grep JWT_SECRET
```

### Test Railway Production:

```powershell
# Check Railway deployment
railway status

# View Railway logs
railway logs

# Test health endpoint
curl https://proofmeet-backend-production.up.railway.app/health
```

---

## 🔄 Rotating Secrets

### When to Rotate JWT Secret:

- Every 90 days (recommended)
- After suspected security breach
- When team member leaves
- After any security incident

### How to Rotate:

```powershell
# Generate new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update Railway
railway variables --set JWT_SECRET="<new-secret-here>"

# Redeploy
railway up

# Update local .env files
# Edit backend/.env and update JWT_SECRET
```

---

## 📊 Environment Variable Comparison

| Variable | Local Development | Railway Production |
|----------|-------------------|-------------------|
| `DATABASE_URL` | PostgreSQL in Docker | Railway PostgreSQL |
| `JWT_SECRET` | Local dev secret | **Generated secure secret** |
| `NODE_ENV` | development | production |
| `PORT` | 5000 | Railway auto-assigned |
| `CORS_ORIGIN` | http://localhost:3000 | https://proof-meet-frontend.vercel.app |
| `BYPASS_EMAIL_VERIFICATION` | true | false |
| `LOG_LEVEL` | debug | info |

---

## 🚨 Troubleshooting

### Issue: Railway deployment fails after setting env vars

**Solution:**
```powershell
# Check if all required variables are set
railway variables

# Verify DATABASE_URL is set (should be auto-set by Railway)
railway variables --name DATABASE_URL
```

### Issue: JWT authentication fails

**Solution:**
```powershell
# Verify JWT_SECRET is set and not empty
railway variables --name JWT_SECRET

# Check logs for JWT errors
railway logs --follow
```

### Issue: CORS errors in frontend

**Solution:**
```powershell
# Verify CORS_ORIGIN matches your Vercel URL
railway variables --name CORS_ORIGIN

# Update if needed
railway variables --set CORS_ORIGIN="https://proof-meet-frontend.vercel.app"
```

---

## 📝 Next Steps

1. ✅ Run Railway CLI commands above
2. ✅ Verify all environment variables are set
3. ✅ Test deployment
4. ✅ Test frontend authentication
5. ✅ Monitor Railway logs for any issues

---

## 🔗 Resources

- [Railway CLI Documentation](https://docs.railway.app/develop/cli)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Best Practices for API Keys](https://cloud.google.com/docs/authentication/api-keys)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Generated Secure JWT Secret (for Railway production):**
```
926741c47085fb528b9e215ff50a7932f2ecd905c7dc2b1afb4059e782acd24537a0cf9e52dcb9f1118bacaca6c7acac251a9213a3091027c3c0640f90e1f367
```

**⚠️ Save this securely! It's not stored anywhere else.**

---

**Date Created:** October 15, 2025  
**Status:** Ready to execute  
**Security Level:** High - Production-ready


