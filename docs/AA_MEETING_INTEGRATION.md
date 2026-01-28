# AA/NA Meeting Integration Guide

## Overview

ProofMeet integrates with external recovery meeting directories to automatically sync meeting schedules. This allows participants to discover and join meetings from major AA/NA/SMART Recovery organizations.

---

## 📡 Current Integrations

### 1. **AA Intergroup (OIAA)**
- **Source:** https://aa-intergroup.org
- **Data Format:** JSON feed (Meeting Guide API spec)
- **Feed URL:** `https://data.aa-intergroup.org/6436f5a3f03fdecef8459055.json`
- **Update Frequency:** Syncs every 24 hours (automatic)
- **Meeting Types:** Online Zoom meetings only
- **Filter:** Only meetings updated in last 6 months

### 2. **Narcotics Anonymous (NA)**
- **Source:** https://virtual-na.org
- **Meetings:** 200+ online meetings
- **Integration:** Direct API

### 3. **SMART Recovery**
- **Source:** https://meetings.smartrecovery.org
- **Integration:** API integration

### 4. **In The Rooms**
- **Source:** https://www.intherooms.com
- **Integration:** Public schedule

---

## 🔧 How It Works

### Data Flow

```
External API → ScraperAPI (CAPTCHA bypass) → ProofMeet Backend → Database

Every 24 hours:
1. Fetch meeting data from external sources
2. Parse JSON/HTML into standardized format
3. Filter for:
   - Online Zoom meetings only
   - Active meetings (updated in last 6 months)
   - Valid Zoom URLs
4. Save to ExternalMeeting table
5. Participants can search and join
```

### Database Schema

```prisma
model ExternalMeeting {
  id                String         @id @default(uuid())
  externalId        String?        @unique
  
  // Meeting details
  name              String
  program           String         // 'AA', 'NA', 'SMART', etc.
  meetingType       String
  description       String?
  
  // Schedule
  dayOfWeek         String?        // 'Monday', 'Tuesday', etc.
  time              String?        // 'HH:MM' or 'HH:MM AM/PM'
  timezone          String         @default("PST")
  durationMinutes   Int?
  
  // Zoom details
  zoomUrl           String?
  zoomId            String?
  zoomPassword      String?
  
  // Metadata
  tags              String[]
  hasProofCapability Boolean       @default(true)
  lastSyncedAt      DateTime?
  
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
}
```

---

## 🚀 Setup Instructions

### Prerequisites
- ProofMeet backend deployed on Railway
- ScraperAPI account (free tier: 1,000 requests/month)

### Step 1: Get ScraperAPI Key

1. **Sign up:** https://www.scraperapi.com/signup
2. **Copy API key** from dashboard
3. **Free tier includes:**
   - 1,000 requests/month
   - Automatic CAPTCHA bypass
   - No credit card required

### Step 2: Add to Railway

1. Go to https://railway.app
2. Select your **ProofMeet Backend** service
3. Click **"Variables"** tab
4. Add new variable:
   - **Name:** `SCRAPERAPI_KEY`
   - **Value:** [Your API key]
5. Railway auto-redeploys (2-3 minutes)

### Step 3: Test the Sync

**Option A: Automatic Test Script**

```powershell
cd C:\Users\leond\OneDrive\Documents\ProofMeet
.\test-meeting-sync-simple.ps1
```

**Option B: Manual API Call**

```bash
curl -X POST https://proofmeet-backend-production.up.railway.app/api/admin/sync-meetings \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET_KEY"
```

**Expected Output:**
```json
{
  "success": true,
  "totalFetched": 250,
  "totalSaved": 200,
  "details": {
    "AA": "150 meetings",
    "NA": "50 meetings"
  }
}
```

---

## 🛠️ Technical Implementation

### Meeting Sync Service

**File:** `backend/src/services/meetingSyncService.ts`

#### Key Functions

**1. Build Proxy URL (CAPTCHA Bypass)**

```typescript
function buildProxyUrl(targetUrl: string): string {
  if (SCRAPERAPI_KEY) {
    // Use ScraperAPI for CAPTCHA bypass
    return `https://api.scraperapi.com?api_key=${SCRAPERAPI_KEY}&url=${encodeURIComponent(targetUrl)}`;
  } else {
    // Fallback to free proxy (limited functionality)
    return `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  }
}
```

**2. Fetch AA Meetings**

```typescript
async function fetchAAMeetingGuideMeetings(): Promise<ExternalMeeting[]> {
  const jsonFeedUrl = 'https://data.aa-intergroup.org/6436f5a3f03fdecef8459055.json';
  const proxyUrl = buildProxyUrl(jsonFeedUrl);
  
  const response = await axios.get(proxyUrl, {
    timeout: 30000,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0...',
    },
  });
  
  const data = response.data;
  
  // Filter for active meetings (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  for (const meeting of data) {
    if (meeting.updated) {
      const updatedDate = new Date(meeting.updated);
      if (updatedDate < sixMonthsAgo) {
        continue; // Skip inactive meetings
      }
    }
    
    // Only include Zoom meetings
    if (meeting.conference_url && meeting.conference_url.includes('zoom.us')) {
      const zoomId = extractZoomId(meeting.conference_url);
      if (zoomId) {
        meetings.push({
          externalId: `aa-oiaa-${meeting.slug}`,
          name: meeting.name,
          program: 'AA',
          dayOfWeek: parseDayOfWeek(meeting.day),
          time: parseTime(meeting.time),
          timezone: meeting.timezone || 'America/New_York',
          zoomUrl: meeting.conference_url,
          zoomId: zoomId,
          zoomPassword: extractPasswordFromNotes(meeting.conference_url_notes),
        });
      }
    }
  }
  
  return meetings;
}
```

**3. Save to Database**

```typescript
async function saveMeetingsToDatabase(meetings: ExternalMeeting[]): Promise<void> {
  for (const meeting of meetings) {
    await prisma.externalMeeting.upsert({
      where: { externalId: meeting.externalId },
      update: {
        name: meeting.name,
        time: meeting.time,
        zoomUrl: meeting.zoomUrl,
        lastSyncedAt: new Date(),
      },
      create: meeting,
    });
  }
}
```

---

## 🔍 Troubleshooting

### Problem: 0 AA Meetings Synced

**Symptoms:**
```
✅ Total AA meetings fetched: 0
```

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| No ScraperAPI key | Add `SCRAPERAPI_KEY` to Railway |
| Free tier exhausted | Upgrade ScraperAPI plan or wait for reset |
| API endpoint changed | Check logs for error messages |
| CAPTCHA blocking | Verify ScraperAPI is being used (check logs) |

### Problem: Meetings Not Appearing in Frontend

**Check:**
1. **Database:** Are meetings in `ExternalMeeting` table?
   ```sql
   SELECT COUNT(*) FROM "ExternalMeeting" WHERE program = 'AA';
   ```

2. **hasProofCapability:** Are meetings marked as joinable?
   ```sql
   SELECT COUNT(*) FROM "ExternalMeeting" WHERE "hasProofCapability" = true;
   ```

3. **Frontend API:** Test the endpoint:
   ```bash
   curl https://proofmeet-backend-production.up.railway.app/api/participant/meetings/available?program=AA
   ```

### Problem: ScraperAPI Errors

**403 Forbidden:**
- Invalid API key
- Check Railway environment variables

**429 Too Many Requests:**
- Free tier limit reached (1,000/month)
- Wait for reset or upgrade plan

**Timeout:**
- Increase timeout in axios config
- Check ScraperAPI dashboard for issues

---

## 📊 Monitoring

### Check Sync Status

**View Railway Logs:**
```bash
railway logs --service backend
```

**Look for:**
```
🔍 Fetching AA meetings from aa-intergroup.org...
📡 Fetching AA JSON feed: https://data.aa-intergroup.org/...
📋 Got 100 meetings from OIAA JSON feed
✅ Total AA meetings fetched: 85
```

### Database Queries

**Count meetings by program:**
```sql
SELECT program, COUNT(*) 
FROM "ExternalMeeting" 
GROUP BY program;
```

**Recently synced meetings:**
```sql
SELECT name, program, "lastSyncedAt" 
FROM "ExternalMeeting" 
ORDER BY "lastSyncedAt" DESC 
LIMIT 10;
```

---

## 🔄 Sync Schedule

### Automatic Sync

Meetings sync automatically **every 24 hours** at midnight UTC.

**Cron job:** `backend/src/index.ts`
```typescript
// Daily sync at midnight UTC
cron.schedule('0 0 * * *', async () => {
  logger.info('🔄 Running scheduled meeting sync...');
  await syncAllMeetings();
});
```

### Manual Sync

**Trigger via API:**
```bash
POST /api/admin/sync-meetings
Header: Authorization: Bearer <ADMIN_SECRET_KEY>
```

**Trigger via script:**
```powershell
.\test-meeting-sync-simple.ps1
```

---

## 📝 Meeting Guide API Spec

ProofMeet follows the **Meeting Guide API specification** created by Code for Recovery:

**Reference:** https://github.com/code4recovery/spec

### Standard Fields

```json
{
  "name": "Meeting Name",
  "slug": "meeting-name",
  "day": 1,  // 0=Sunday, 1=Monday, etc.
  "time": "19:00",
  "timezone": "America/New_York",
  "types": ["O", "TC"],  // O=Open, TC=Tech
  "conference_url": "https://zoom.us/j/123456789",
  "conference_url_notes": "Password: abc123",
  "updated": "2026-01-28T10:00:00Z"
}
```

---

## 🚀 Adding New Sources

### Step 1: Find the API

Look for:
- JSON feeds following Meeting Guide spec
- WordPress sites with TSML plugin
- Public API endpoints

### Step 2: Create Fetch Function

```typescript
async function fetchNewSourceMeetings(): Promise<ExternalMeeting[]> {
  const url = 'https://newsource.org/api/meetings';
  const proxyUrl = buildProxyUrl(url);
  
  const response = await axios.get(proxyUrl);
  const data = response.data;
  
  return data.map(meeting => ({
    externalId: `newsource-${meeting.id}`,
    name: meeting.name,
    program: 'AA',  // or 'NA', 'SMART', etc.
    // ... map other fields
  }));
}
```

### Step 3: Add to Sync Service

```typescript
export async function syncAllMeetings() {
  const aaMeetings = await fetchAAMeetingGuideMeetings();
  const naMeetings = await fetchNAMeetings();
  const newSourceMeetings = await fetchNewSourceMeetings();  // NEW
  
  const allMeetings = [
    ...aaMeetings,
    ...naMeetings,
    ...newSourceMeetings,  // NEW
  ];
  
  await saveMeetingsToDatabase(allMeetings);
}
```

---

## 📞 Support

**Issues with meeting sync?**
- Check Railway logs first
- Verify ScraperAPI key is set
- Test with `test-meeting-sync-simple.ps1`
- Contact: leondelange001@gmail.com

**Want to add a new meeting source?**
- Open GitHub issue with API details
- We'll help integrate it!
