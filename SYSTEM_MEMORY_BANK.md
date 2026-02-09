# ProofMeet System Memory Bank

**Last Updated**: 2026-02-09  
**Purpose**: Critical system knowledge and architecture reference

---

## 🏗️ System Architecture Overview

### Deployment Model
- **Backend**: Runs on Railway/cloud hosting (NOT local files)
- **Frontend**: Separate deployment
- **Database**: PostgreSQL via Prisma
- **Changes Flow**: Local → GitHub → Railway auto-deploys → Production

**IMPORTANT**: Changes must be committed and pushed to GitHub to take effect in production!

---

## 📡 Meeting Sync System

### How It Actually Works

#### AA Meeting Source
- **Source**: aa-intergroup.org (Online Intergroup of AA - OIAA)
- **Data Format**: Direct JSON feed (NOT web scraping)
- **Endpoint**: `https://data.aa-intergroup.org/6436f5a3f03fdecef8459055.json`
- **Access Method**: **DIRECT HTTP GET** - No proxy, no authentication, no ScraperAPI needed
- **Data Volume**: ~8,423 meetings available (8.6 MB JSON)
- **Update Frequency**: Should sync daily

**Key Discovery (2026-02-09)**: The JSON feed is completely open and accessible. Previous assumptions about needing ScraperAPI were incorrect.

#### Sync Process
1. Direct HTTP GET to JSON feed
2. Parse 8,000+ meetings
3. Filter for:
   - Must have Zoom URL (`zoom.us/j/` or `zoom.us/s/`)
   - Must have valid extractable Zoom ID
   - Must be updated within last 12 months (active meetings only)
4. Save to `ExternalMeeting` table with `hasProofCapability: true`
5. Result: ~1,800-2,000 AA meetings synced

#### What Gets Filtered Out
- **5,400+** meetings not updated in 12+ months (inactive)
- **1,000+** meetings without Zoom links (in-person only)
- Meetings with malformed Zoom URLs

---

## 🗂️ File Structure & Responsibilities

### Core Services

#### `backend/src/services/meetingSyncService.ts`
- **Main sync logic** for all meeting sources (AA, NA, SMART)
- `syncAllMeetings()` - Orchestrates full sync
- `fetchAAMeetingGuideMeetings()` - AA-specific sync (direct JSON access)
- **Direct access** - no proxy needed for aa-intergroup.org
- Enhanced logging with metrics and auto-alerts

#### `backend/src/services/syncMonitoringService.ts` ⭐ NEW
- Health check system
- `checkSyncHealth()` - Returns HEALTHY/WARNING/CRITICAL status
- `getSyncStatistics()` - Detailed metrics
- `checkMeetingExists(zoomId)` - Check if specific meeting in DB

#### `backend/src/routes/admin.ts`
- Admin API endpoints
- `POST /api/admin/sync-meetings` - Trigger manual sync
- `GET /api/admin/sync-health` - Health status (returns 503 if CRITICAL)
- `GET /api/admin/sync-statistics` - Detailed stats
- `GET /api/admin/check-meeting/:zoomId` - Check specific meeting
- **Auth**: Requires `x-admin-secret` header

#### `backend/src/routes/participant.ts`
- Participant-facing endpoints
- `GET /api/participant/meetings/available` - Search meetings
  - Query params: `zoomId`, `program`, `format`, `day`, `limit`
  - Only returns meetings with `hasProofCapability: true`

### Scripts

#### `backend/scripts/sync-aa-intergroup.ts`
- **Standalone sync script** for AA meetings
- Uses same direct JSON access as main service
- Can be run manually: `npx ts-node scripts/sync-aa-intergroup.ts`
- **Status**: UPDATED 2026-02-09 to use direct access

#### `backend/scripts/diagnose-missing-meeting.ts` ⭐ NEW
- Diagnostic tool for troubleshooting missing meetings
- Checks both database and source data
- Shows filter reasons
- Usage: `npx ts-node scripts/diagnose-missing-meeting.ts 908141096`

#### `backend/scripts/add-meeting-interactive.ts` ⭐ NEW
- Manual meeting addition tool
- Interactive or command-line mode
- Usage: `npx ts-node scripts/add-meeting-interactive.ts [zoomId] [name] [program] [day] [time]`

### Helper Scripts (PowerShell)

#### `diagnose-meeting.ps1`
- Quick diagnostic wrapper
- Usage: `.\diagnose-meeting.ps1 908141096`

#### `check-meeting.ps1`
- Quick database check
- Usage: `.\check-meeting.ps1 908141096`

---

## 🔑 Key System Principles

### 1. Deployment Flow
```
Local Code Changes
    ↓
git commit + push
    ↓
GitHub Repository
    ↓
Railway Auto-Deploy (2-3 minutes)
    ↓
Production Backend
```

**Remember**: Local scripts test functionality, but production needs GitHub push!

### 2. Meeting Visibility Requirements

For a meeting to appear in participant search:
- ✅ Must be in `ExternalMeeting` table
- ✅ Must have `hasProofCapability: true`
- ✅ Must have valid `zoomId`
- ✅ Must match participant's search filters

### 3. Sync Health Thresholds

**HEALTHY**:
- Last sync < 30 hours ago
- Total meetings > 100
- AA meetings > 50

**WARNING**:
- Last sync 30-48 hours ago
- Total meetings 50-100
- AA meetings < 50

**CRITICAL**:
- Last sync > 48 hours ago
- Total meetings < 50
- AA meetings = 0
- No sync ever run

### 4. Common Issues & Solutions

#### Issue: "Meeting not found in search"
**Check**:
1. Is it in database? `GET /api/admin/check-meeting/:zoomId`
2. Does it have `hasProofCapability: true`?
3. Run diagnostic: `npx ts-node scripts/diagnose-missing-meeting.ts <ZOOM_ID>`

**Solutions**:
- If in source but not DB: Run sync
- If filtered out: Check if inactive (12+ months)
- If not in source: Add manually with `add-meeting-interactive.ts`

#### Issue: "Sync returns 0 meetings"
**Check**:
1. Can production server access internet?
2. Is JSON endpoint accessible: `curl https://data.aa-intergroup.org/6436f5a3f03fdecef8459055.json`
3. Check Railway logs for errors

**Solutions**:
- Verify Railway can make outbound HTTP requests
- Check for network/firewall issues
- Verify JSON endpoint still active

#### Issue: "Meeting in DB but not searchable"
**Fix**:
```sql
UPDATE "ExternalMeeting" 
SET "has_proof_capability" = true 
WHERE "zoomId" LIKE '%908141096%';
```

---

## 🚨 Monitoring Setup

### Health Check Endpoint
```bash
GET /api/admin/sync-health
Header: x-admin-secret: YOUR_SECRET
```

**Returns**:
- `200` = HEALTHY or WARNING
- `503` = CRITICAL (requires immediate attention)

### Recommended Monitoring
- **Frequency**: Every 30-60 minutes
- **Tools**: UptimeRobot, Railway health checks, or cron job
- **Alert On**: HTTP 503 status
- **Dashboard**: Show last sync time, total meetings, AA count

### Alert Triggers (Already in Code)
- Sync returns < 50 meetings → Log ERROR
- AA source returns 0 meetings → Log ERROR
- Last sync > 48 hours → Health returns CRITICAL

---

## 📊 Expected Metrics

### Normal Operation
- **Total Meetings**: 1,800-2,000
- **AA Meetings**: 1,700-1,900
- **Sync Duration**: 60-120 seconds
- **Sync Frequency**: Every 24 hours
- **Success Rate**: >95%

### After Fresh Sync
```
📋 Got 8423 meetings from OIAA JSON feed
✅ Processed 1894 meetings
   📊 Skipped 5436 inactive meetings
   📊 Skipped 1093 without Zoom links
💾 Saving 1894 meetings to database...
✅ Sync complete! 1894 meetings saved
⏱️  Duration: 109 seconds
```

---

## 🔧 Troubleshooting Commands

### Check Production Health
```bash
curl -H "x-admin-secret: YOUR_SECRET" \
  https://your-backend.railway.app/api/admin/sync-health
```

### Trigger Production Sync
```bash
curl -X POST -H "x-admin-secret: YOUR_SECRET" \
  https://your-backend.railway.app/api/admin/sync-meetings
```

### Check Specific Meeting
```bash
curl -H "x-admin-secret: YOUR_SECRET" \
  https://your-backend.railway.app/api/admin/check-meeting/908141096
```

### Local Testing
```bash
cd backend
npx ts-node scripts/sync-aa-intergroup.ts
npx ts-node scripts/diagnose-missing-meeting.ts 908141096
```

### Database Queries
```sql
-- Meeting count by program
SELECT program, COUNT(*) 
FROM "ExternalMeeting" 
GROUP BY program;

-- Recently synced
SELECT name, "lastSyncedAt" 
FROM "ExternalMeeting" 
ORDER BY "lastSyncedAt" DESC 
LIMIT 10;

-- Find specific meeting
SELECT * FROM "ExternalMeeting" 
WHERE "zoomId" LIKE '%908141096%';
```

---

## 🎯 Development Workflow

### Making Changes to Sync Logic

1. **Edit locally**: Modify `meetingSyncService.ts` or related files
2. **Test locally**: 
   ```bash
   cd backend
   npx ts-node scripts/sync-aa-intergroup.ts
   ```
3. **Verify results**: Check logs, count meetings
4. **Commit**: 
   ```bash
   git add backend/src/services/meetingSyncService.ts
   git commit -m "Description of changes"
   ```
5. **Push**: `git push origin main`
6. **Monitor**: Watch Railway deployment logs
7. **Test production**: Trigger sync via admin API
8. **Verify**: Check health endpoint

### Adding New Meeting Source

1. Create fetch function in `meetingSyncService.ts`
2. Add to `syncAllMeetings()` parallel fetch
3. Map to `ExternalMeeting` interface
4. Set `hasProofCapability: true`
5. Test locally
6. Push and deploy

---

## 📚 Important References

### External APIs
- **AA Meetings**: https://data.aa-intergroup.org/6436f5a3f03fdecef8459055.json
- **Meeting Guide Spec**: https://github.com/code4recovery/spec

### Internal Docs
- **Complete Fix Guide**: `MEETING_SYNC_FIXED.md`
- **User Summary**: `SUMMARY_FOR_USER.md`
- **Quick Reference**: `SYNC_QUICK_REFERENCE.md`
- **Investigation**: `MEETING_SYNC_INVESTIGATION.md`

### Database Schema
```prisma
model ExternalMeeting {
  id                String    @id @default(uuid())
  externalId        String?   @unique
  name              String
  program           String    // 'AA', 'NA', 'SMART'
  zoomUrl           String?
  zoomId            String?
  zoomPassword      String?
  hasProofCapability Boolean  @default(true)
  lastSyncedAt      DateTime?
  // ... other fields
}
```

---

## 🚫 Common Mistakes to Avoid

1. ❌ **Testing locally and expecting production to work** → Must push to GitHub!
2. ❌ **Assuming ScraperAPI is needed** → Direct access works fine
3. ❌ **Not checking hasProofCapability** → Meetings won't appear in search
4. ❌ **Ignoring inactive filter** → 12+ month old meetings are intentionally excluded
5. ❌ **Running old sync script** → Use updated version with direct access
6. ❌ **Not monitoring health endpoint** → Silent failures possible without monitoring

---

## 💡 Key Learnings (2026-02-09)

1. **Direct access works**: aa-intergroup.org JSON feed is completely open, no proxy/auth needed
2. **ScraperAPI was unnecessary**: Previous documentation was incorrect
3. **Monitoring is critical**: Sync can fail silently without health checks
4. **Local testing != production**: Always push to GitHub for production changes
5. **Filters are important**: 5,400+ inactive meetings intentionally excluded
6. **Diagnostic tools help**: Built tools to troubleshoot missing meetings quickly

---

## 🔄 Maintenance Checklist

### Daily
- [ ] Check sync health status (automated via monitoring)
- [ ] Verify last sync completed within 24 hours

### Weekly
- [ ] Review sync logs for errors
- [ ] Check meeting count trends
- [ ] Verify sync duration is reasonable

### Monthly
- [ ] Review filtered meeting statistics
- [ ] Consider adjusting 12-month threshold if needed
- [ ] Clean up old documentation files
- [ ] Update this memory bank with new learnings

---

**Next Update**: When significant changes are made to sync logic or architecture
