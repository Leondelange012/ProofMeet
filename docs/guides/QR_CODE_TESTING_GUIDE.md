# QR Code Testing Guide

## Step 1: Wait for Deployment (2-3 minutes)
Railway is automatically deploying your changes right now.

**Check deployment status:**
- Go to https://railway.app
- Look for "proofmeet-backend" deployment
- Wait for status to show "Active" with green checkmark

## Step 2: Verify Migration Ran

**Check Railway logs:**
```
Railway Dashboard → proofmeet-backend → Logs
```

**Look for:**
```
✔ Generated Prisma Client
Database "railway" is up to date!
```

## Step 3: Test QR Code Generation

### Option A: Generate New Court Card

1. **Login as Court Rep:**
   - Go to: https://proof-meet-frontend.vercel.app/login
   - Login with your court rep account

2. **Create a Test Meeting:**
   - Dashboard → "Create Test Meeting"
   - Duration: 10 minutes
   - Click "Create Meeting"

3. **Have Participant Join:**
   - Login as participant
   - Join the test meeting
   - Wait 10 minutes (or click "Leave Meeting" manually)

4. **Generate Court Card:**
   - As Court Rep, go to participant's details
   - Click "Download Court Card"
   - **Check PDF for QR code image**

### Option B: Regenerate Existing Court Cards

1. **Login as Court Rep:**
   - https://proof-meet-frontend.vercel.app/login

2. **Click "Generate Court Cards" Button:**
   - This will regenerate all missing court cards with QR codes

3. **Download Court Card:**
   - Go to any participant's profile
   - Click "Download Court Card"
   - **Check PDF for QR code image**

## Step 4: Verify QR Code Contents

**What to Look For in the PDF:**

✅ **QR Code Section Should Show:**
```
📱 Instant Verification

Card Number: CC-2025-XXXXX-XXX
Verification URL: https://proof-meet-frontend.vercel.app/verify/[uuid]
Security Hash: [long hash string]

[QR CODE IMAGE HERE] ← Should be an actual scannable image, not placeholder
```

✅ **Scan the QR Code:**
- Use your phone's camera
- Should open verification URL
- Should show court card details

## Step 5: Verify Database

**Run this to check if data is stored:**
```bash
npm run force-refresh-db
```

**Or check manually:**
- Railway Dashboard → Database → Query
```sql
SELECT 
  card_number, 
  verification_url, 
  LEFT(qr_code_data, 50) as qr_preview
FROM court_cards 
ORDER BY generated_at DESC 
LIMIT 5;
```

**Expected Result:**
- `card_number`: CC-2025-XXXXX-XXX
- `verification_url`: https://proof-meet-frontend.vercel.app/verify/...
- `qr_code_data`: https://proof-meet-frontend.vercel.app/verify/...

## Troubleshooting

### Problem: QR Code Still Shows Placeholder

**Cause:** Migration didn't run or Prisma client not regenerated

**Fix:**
```bash
# Force migration and regeneration
railway run npx prisma migrate deploy
railway run npx prisma generate
railway run pm2 restart all
```

### Problem: "Property 'qrCodeData' does not exist"

**Cause:** TypeScript using old Prisma types

**Fix:**
```bash
cd backend
npx prisma generate
# Then restart TypeScript server in IDE
```

### Problem: Existing Court Cards Don't Have QR Codes

**Cause:** Old court cards were created before the update

**Fix:**
1. Login as Court Rep
2. Click "Generate Court Cards" button
3. This will regenerate all court cards with QR codes

### Problem: QR Code Data is Empty/Null

**Cause:** Court card created but update failed

**Fix - Delete and Regenerate:**
```sql
-- In Railway Database Query
DELETE FROM court_cards WHERE qr_code_data IS NULL;
```

Then click "Generate Court Cards" in dashboard.

## Expected Results

✅ **Court Card PDF Should Include:**
1. **QR Code Image** - Scannable square barcode
2. **Verification URL** - Full link below QR code
3. **Card Number** - Unique CC-YYYY-XXXXX-XXX format
4. **Security Hash** - SHA-256 hash string

✅ **Scanning QR Code Should:**
1. Open verification page in browser
2. Show participant details
3. Display meeting information
4. Show validation status (PASSED/FAILED)

✅ **Database Should Have:**
1. `verification_url` populated
2. `qr_code_data` populated (same as verification_url)
3. Both fields match court card ID

## Quick Verification Checklist

- [ ] Railway deployment completed successfully
- [ ] Migration ran (check logs for "Database is up to date")
- [ ] Generated new court card
- [ ] QR code image appears in PDF (not placeholder text)
- [ ] QR code scans successfully with phone
- [ ] Verification URL opens and shows court card
- [ ] Card number matches between PDF and website

## If Everything Works ✓

You should see:
1. **Actual QR code image** in the PDF (scannable square)
2. **Verification URL** below the QR code
3. **Card Number** at the top
4. **Scanning works** - Opens verification page

## If Still Not Working

1. Check Railway logs for errors
2. Run `npm run force-refresh-db`
3. Try manual migration: `railway run npx prisma migrate deploy`
4. Delete old court cards and regenerate
5. Check that `FRONTEND_URL` environment variable is set in Railway

---

**Need Help?**
- Check Railway logs: https://railway.app
- Review database: Railway → Database → Query
- Force redeploy: `npm run redeploy`

