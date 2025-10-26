# How to Manually Redeploy Backend

## Quick Answer

**Directory**: Project root (`C:\Users\leond\ProofMeet`)

**Command**: 
```bash
npm run redeploy
```

---

## Step-by-Step for Windows

### Option 1: Simple Command (Recommended)
```powershell
# Make sure you're in the project root
cd C:\Users\leond\ProofMeet

# Run the redeploy command
npm run redeploy
```

### Option 2: Manual Git Push (If npm fails)
```powershell
# Make sure you're in the project root
cd C:\Users\leond\ProofMeet

# Create a trigger file
Get-Date > .railway-deploy-trigger

# Add, commit, and push
git add .railway-deploy-trigger
git commit -m "Manual redeploy trigger"
git push origin main
```

### Option 3: Railway Dashboard (No Terminal Needed)
1. Go to: https://railway.app
2. Click on `proofmeet-backend`
3. Go to "Deployments" tab
4. Click three dots menu (⋮) on latest deployment
5. Click "Redeploy"

---

## Current Directory Check

To verify you're in the right directory:

```powershell
# Check current directory
pwd

# You should see:
# Path
# ----
# C:\Users\leond\ProofMeet

# If not, navigate there:
cd C:\Users\leond\ProofMeet
```

---

## What the Redeploy Command Does

1. Creates a file called `.railway-deploy-trigger` with current timestamp
2. Commits it to Git with message "Trigger Railway redeploy"
3. Pushes to GitHub
4. Railway detects the push and automatically:
   - Rebuilds backend
   - Runs migrations (`npx prisma migrate deploy`)
   - Regenerates Prisma client (`npx prisma generate`)
   - Restarts server

---

## Troubleshooting

### "npm: command not found"
You need to install Node.js. But you can use **Option 3** (Railway Dashboard) instead.

### "bash: command not found" (Windows)
This is normal on Windows. Use **Option 2** (PowerShell commands) instead.

### Script fails on Windows
The `trigger-redeploy.sh` is a bash script that won't work natively on Windows.
Use **Option 2** or **Option 3**.

### Git push fails
- Make sure you've committed all changes first: `git status`
- Check you have push access to the repo
- Try **Option 3** (Railway Dashboard) instead

---

## Alternative: Windows PowerShell Script

If you want a native Windows version, create `trigger-redeploy.ps1`:

```powershell
# trigger-redeploy.ps1
Write-Host "🚀 Triggering Railway redeployment..." -ForegroundColor Cyan
Write-Host "This will force rebuild and restart the backend service"

# Make a dummy change to trigger redeploy
Get-Date | Out-File -FilePath ".railway-deploy-trigger" -Encoding utf8
git add .railway-deploy-trigger
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Trigger Railway redeploy - $timestamp"
git push origin main

Write-Host "✅ Push complete. Railway will automatically detect and redeploy." -ForegroundColor Green
Write-Host "Monitor deployment at: https://railway.app"
```

Then run:
```powershell
.\trigger-redeploy.ps1
```

---

## For Your Current QR Code Issue

You **don't need to redeploy** right now! The deployment is already in progress from your recent `git push`.

**Instead, wait for current deployment to finish, then:**
1. Login to Court Rep dashboard
2. Click **"Update QR Codes"** button
3. Download court card again

---

## When to Use Manual Redeploy

✅ **Use it when:**
- You need immediate update (can't wait for 2 AM UTC)
- Backend is stuck or crashed
- Environment variables changed
- Database connection issues
- Want to apply hotfix immediately

❌ **Don't need it when:**
- You just pushed code (auto-deploys)
- Frontend-only changes (Vercel auto-deploys)
- QR codes missing (use "Update QR Codes" button instead)
- Data refresh (database is always live)

---

## Summary for Your Specific Case

**Current Status:**
- ✅ Code already pushed
- ⏳ Railway is deploying (started ~10 min ago)
- 🎯 Wait for deployment to finish
- 🔵 Then click "Update QR Codes" button

**Check deployment status:**
https://railway.app → proofmeet-backend → Deployments

**When it shows "Active" (green):**
You're ready to test! No manual redeploy needed.

