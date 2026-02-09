# Field Testing Quick Start Guide
**Updated**: February 9, 2026  
**Time Required**: 30 minutes for full test

---

## 🎯 What to Test

ProofMeet now has **TWO ways** participants can attend meetings:

1. **Search & Join Real AA/NA Meetings** ✨ NEW (1,800+ meetings available)
2. **Join Court Rep Created Test Meetings** (Original feature)

---

## ✅ Test 1: External Meeting Search (NEW - 15 min)

### As Participant:

**Step 1: Find Meetings**
1. Login at: https://your-frontend.vercel.app
2. Click **"Find Meetings"** or **"Available Meetings"**
3. ✅ **Should see**: 100+ meetings listed

**Step 2: Search**
4. Try filtering:
   - Program: "AA" → Should show 100+ AA meetings
   - Day: "Monday" → Should show Monday meetings only
   - Zoom ID: Type any meeting ID → Should search

**Step 3: Join**
5. Click **"Join"** on any meeting
6. ✅ **Should see**: Join confirmation + Zoom URL
7. Click the Zoom URL to launch meeting
8. Attend for 50+ minutes (camera on!)

**Step 4: Complete**
9. Leave Zoom meeting
10. Click **"Leave Meeting"** in ProofMeet
11. Wait 2-3 minutes
12. Click **"Sync Latest Data"**
13. ✅ **Should see**: Meeting in your history

**Step 5: Court Card**
14. Sign your court card
15. Download PDF
16. ✅ **Should see**: Complete court card with all info

---

## ✅ Test 2: Court Rep Test Meeting (20 min)

### As Court Rep:

**Step 1: Create**
1. Login as Court Rep
2. Click **"Create Test Meeting"**
3. Fill in details, check "This is a test meeting"
4. Click Create
5. ✅ **Should see**: Zoom link + password
6. Copy and share with participant

### As Participant:

**Step 2: Attend**
7. Join Zoom link from Court Rep
8. Stay 50+ minutes (camera on!)
9. Host ends meeting
10. ✅ **Should see**: Attendance tracked

**Step 3: Complete**
11. Click "Sync Latest Data"
12. Sign court card
13. Request host signature (email sent to host)
14. ✅ **Should see**: Participant signature saved

### As Host (via Email):

**Step 4: Sign**
15. Check email for "Signature Request"
16. Click "Sign Court Card" link
17. Review details
18. Click "Confirm and Sign"
19. ✅ **Should see**: Success message

### As Participant:

**Step 5: Download**
20. Sync data
21. Download court card PDF
22. Scan QR code with phone
23. ✅ **Should see**: Complete card with both signatures

---

## 🚨 What to Report

### ✅ Report SUCCESS if:
- Can find 100+ external meetings
- Search/filter works
- Join button appears
- Attendance tracked correctly
- Court cards generated
- Signatures work
- Downloads succeed

### ❌ Report ISSUES if:
- No meetings showing (or < 10)
- Search returns nothing
- Join button missing
- Duration way off (> 5 min difference)
- Court card not generated
- Signatures fail
- Downloads broken
- QR code doesn't scan

---

## 🔍 Quick Checks (Admin)

### Is Meeting Sync Working?

```bash
# Check health (replace YOUR_SECRET)
curl -H "x-admin-secret: YOUR_SECRET" \
  https://your-backend.railway.app/api/admin/sync-health
```

**Should return:**
```json
{
  "status": "HEALTHY",
  "totalMeetings": 1800+,
  "AA": 1700+
}
```

### Is Specific Meeting Available?

```bash
curl -H "x-admin-secret: YOUR_SECRET" \
  https://your-backend.railway.app/api/admin/check-meeting/908141096
```

---

## 📋 Simple Checklist

**External Meeting Search:**
- [ ] Login works
- [ ] Find Meetings page loads
- [ ] See 100+ meetings
- [ ] Can filter by program
- [ ] Can search by Zoom ID
- [ ] Join button works
- [ ] Attendance tracked
- [ ] Court card generated

**Test Meeting Flow:**
- [ ] Court Rep can create meeting
- [ ] Zoom link works
- [ ] Participant can join
- [ ] Attendance tracked
- [ ] Participant can sign
- [ ] Host receives email
- [ ] Host can sign via link
- [ ] Court card downloads

**System Health:**
- [ ] Meeting count 1,000+
- [ ] Last sync < 24 hours
- [ ] Health status: HEALTHY
- [ ] No errors in logs

---

## 🆘 Troubleshooting

### No Meetings Showing
1. Check health: `GET /api/admin/sync-health`
2. Check Railway logs for sync errors
3. Manually trigger sync: `POST /api/admin/sync-meetings`

### Specific Meeting Missing
1. Use diagnostic: `.\diagnose-meeting.ps1 <ZOOM_ID>`
2. Check if in source data
3. Add manually if needed: `npx ts-node scripts/add-meeting-interactive.ts`

### Attendance Not Tracking
1. Verify Zoom integration working
2. Check participant has camera on
3. Verify meeting has `hasProofCapability: true`

---

**Ready to test!** Start with Test 1 (external meetings) since that's the new feature, then do Test 2 (test meetings) to verify the full flow still works.

**Questions?** Check:
- Full details: `docs/FIELD_READY_SYSTEM_SUMMARY.md`
- Technical info: `SYSTEM_MEMORY_BANK.md`
- Sync details: `MEETING_SYNC_GUARANTEE.md`
