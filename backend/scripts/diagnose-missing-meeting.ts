/**
 * Diagnostic tool to find why specific meetings aren't syncing
 * Usage: npx ts-node scripts/diagnose-missing-meeting.ts 908141096
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const SCRAPERAPI_KEY = process.env.SCRAPERAPI_KEY;
const AA_JSON_FEED = 'https://data.aa-intergroup.org/6436f5a3f03fdecef8459055.json';

function buildProxyUrl(targetUrl: string): string {
  // Direct access works for aa-intergroup.org JSON feed
  if (targetUrl.includes('data.aa-intergroup.org')) {
    console.log('   Using direct access (no proxy needed)');
    return targetUrl;
  }
  
  if (SCRAPERAPI_KEY) {
    return `https://api.scraperapi.com?api_key=${SCRAPERAPI_KEY}&url=${encodeURIComponent(targetUrl)}`;
  } else {
    return `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  }
}

async function diagnoseMeeting(zoomId: string) {
  console.log('🔍 Diagnostic Report for Meeting ID:', zoomId);
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Check if meeting exists in database
  console.log('📊 Step 1: Checking local database...');
  const dbMeetings = await prisma.externalMeeting.findMany({
    where: {
      zoomId: {
        contains: zoomId
      }
    }
  });

  if (dbMeetings.length > 0) {
    console.log(`✅ Found ${dbMeetings.length} meeting(s) in database:`);
    dbMeetings.forEach((meeting, index) => {
      console.log(`\n   Meeting ${index + 1}:`);
      console.log(`   - ID: ${meeting.id}`);
      console.log(`   - Name: ${meeting.name}`);
      console.log(`   - Program: ${meeting.program}`);
      console.log(`   - Zoom ID: ${meeting.zoomId}`);
      console.log(`   - Zoom URL: ${meeting.zoomUrl}`);
      console.log(`   - hasProofCapability: ${meeting.hasProofCapability}`);
      console.log(`   - Day: ${meeting.dayOfWeek || 'N/A'}`);
      console.log(`   - Time: ${meeting.time || 'N/A'}`);
      console.log(`   - Last Synced: ${meeting.lastSyncedAt?.toISOString() || 'Never'}`);
      console.log(`   - Created: ${meeting.createdAt.toISOString()}`);
      console.log(`   - Updated: ${meeting.updatedAt.toISOString()}`);
    });
  } else {
    console.log('❌ Meeting NOT FOUND in database');
  }

  console.log('');
  console.log('📡 Step 2: Checking source data (aa-intergroup.org)...');
  
  try {
    const timestamp = Date.now();
    const targetUrl = `${AA_JSON_FEED}?${timestamp}`;
    const proxyUrl = buildProxyUrl(targetUrl);
    
    console.log(`   Fetching from: ${AA_JSON_FEED}`);
    console.log(`   Using proxy: ${SCRAPERAPI_KEY ? 'ScraperAPI' : 'corsproxy.io'}`);
    
    const response = await axios.get(proxyUrl, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!Array.isArray(response.data)) {
      console.log('   ⚠️  Response is not an array');
      return;
    }

    console.log(`   📋 Total meetings in source: ${response.data.length}`);
    
    // Search for the meeting
    const matchingMeetings = response.data.filter((meeting: any) => {
      const meetingZoomId = meeting.conference_url?.match(/zoom\.us\/[js]\/(\d+)/)?.[1];
      return meetingZoomId === zoomId || meetingZoomId?.includes(zoomId) || zoomId.includes(meetingZoomId || '');
    });

    if (matchingMeetings.length > 0) {
      console.log(`\n   ✅ Found ${matchingMeetings.length} matching meeting(s) in source data:`);
      
      matchingMeetings.forEach((meeting: any, index: number) => {
        console.log(`\n   Meeting ${index + 1}:`);
        console.log(`   - Name: ${meeting.name || 'N/A'}`);
        console.log(`   - Slug: ${meeting.slug || 'N/A'}`);
        console.log(`   - Day: ${meeting.day || 'N/A'}`);
        console.log(`   - Time: ${meeting.time || 'N/A'}`);
        console.log(`   - Timezone: ${meeting.timezone || 'N/A'}`);
        console.log(`   - Conference URL: ${meeting.conference_url || 'N/A'}`);
        
        const meetingZoomId = meeting.conference_url?.match(/zoom\.us\/[js]\/(\d+)/)?.[1];
        console.log(`   - Extracted Zoom ID: ${meetingZoomId || 'NONE'}`);
        
        console.log(`   - Conference Notes: ${meeting.conference_url_notes || 'N/A'}`);
        console.log(`   - Types: ${Array.isArray(meeting.types) ? meeting.types.join(', ') : 'N/A'}`);
        console.log(`   - Updated: ${meeting.updated || 'N/A'}`);
        
        // Check filters
        console.log('\n   🔍 Filter Analysis:');
        
        // Filter 1: Has Zoom URL?
        const hasZoomUrl = meeting.conference_url && meeting.conference_url.includes('zoom.us');
        console.log(`   - Has Zoom URL: ${hasZoomUrl ? '✅ YES' : '❌ NO'}`);
        
        // Filter 2: Valid Zoom ID?
        const hasValidZoomId = !!meetingZoomId;
        console.log(`   - Valid Zoom ID: ${hasValidZoomId ? '✅ YES' : '❌ NO'}`);
        
        // Filter 3: Updated recently?
        if (meeting.updated) {
          try {
            const updatedDate = new Date(meeting.updated);
            const now = new Date();
            const twelveMonthsAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
            const isRecent = updatedDate >= twelveMonthsAgo;
            const monthsAgo = Math.floor((now.getTime() - updatedDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
            console.log(`   - Updated recently (<12 months): ${isRecent ? '✅ YES' : '❌ NO'} (${monthsAgo} months ago)`);
          } catch (error) {
            console.log(`   - Updated recently: ⚠️  Could not parse date: ${meeting.updated}`);
          }
        } else {
          console.log(`   - Updated recently: ⚠️  No update timestamp in source`);
        }
        
        // Final verdict
        console.log('\n   📋 Sync Eligibility:');
        if (!hasZoomUrl) {
          console.log(`   ❌ EXCLUDED: No Zoom URL found`);
        } else if (!hasValidZoomId) {
          console.log(`   ❌ EXCLUDED: Could not extract valid Zoom ID from URL`);
        } else if (meeting.updated) {
          try {
            const updatedDate = new Date(meeting.updated);
            const twelveMonthsAgo = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000));
            if (updatedDate < twelveMonthsAgo) {
              console.log(`   ❌ EXCLUDED: Meeting hasn't been updated in 12+ months (likely inactive)`);
            } else {
              console.log(`   ✅ SHOULD BE SYNCED`);
            }
          } catch (error) {
            console.log(`   ⚠️  UNCERTAIN: Could not determine if meeting should sync (date parse error)`);
          }
        } else {
          console.log(`   ⚠️  UNCERTAIN: No update timestamp to check staleness`);
        }
      });
    } else {
      console.log(`\n   ❌ Meeting NOT FOUND in source data`);
      console.log(`\n   💡 Possible reasons:`);
      console.log(`   1. Meeting was removed from aa-intergroup.org`);
      console.log(`   2. Meeting ID is from a different source (not OIAA)`);
      console.log(`   3. Meeting exists but Zoom ID doesn't match exactly`);
    }

  } catch (error: any) {
    console.log(`   ❌ Error fetching source data: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Status Text: ${error.response.statusText}`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('💡 RECOMMENDATIONS:');
  console.log('='.repeat(60));
  
  if (dbMeetings.length === 0) {
    console.log(`
1. Meeting is not in database. To add it manually:
   npx ts-node scripts/add-meeting.ts

2. Run a fresh sync to get latest meetings:
   npx ts-node scripts/sync-aa-intergroup.ts

3. Check if meeting exists in source with broader search:
   - Search aa-intergroup.org website manually
   - Verify the Zoom ID is correct

4. If meeting is from another AA group (not OIAA):
   - Manually add using add-meeting.ts script
   - The meeting will be immediately available to participants
`);
  } else {
    if (!dbMeetings[0].hasProofCapability) {
      console.log(`
⚠️  Meeting exists but hasProofCapability is FALSE
   This means it won't show up in participant searches!
   
   To fix, run this SQL:
   UPDATE "ExternalMeeting" 
   SET "has_proof_capability" = true 
   WHERE "zoomId" LIKE '%${zoomId}%';
`);
    } else {
      console.log(`
✅ Meeting exists in database with correct settings
   It should be visible in participant search!
   
   Try searching at:
   GET /api/participant/meetings/available?zoomId=${zoomId}
`);
    }
  }
}

async function main() {
  const zoomId = process.argv[2];
  
  if (!zoomId) {
    console.log('Usage: npx ts-node scripts/diagnose-missing-meeting.ts <ZOOM_ID>');
    console.log('Example: npx ts-node scripts/diagnose-missing-meeting.ts 908141096');
    process.exit(1);
  }

  try {
    await diagnoseMeeting(zoomId);
  } catch (error: any) {
    console.error('❌ Diagnostic failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
