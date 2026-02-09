/**
 * Sync meetings from AA-Intergroup.org
 * UPDATED: Uses direct JSON feed access (no scraping needed)
 * This is the official Online Intergroup of AA (OIAA)
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface AAIntergroupMeeting {
  name: string;
  day: string;
  time: string;
  zoomId: string;
  zoomPassword?: string;
  type: string;
  description?: string;
}

async function fetchAAMeetings(): Promise<AAIntergroupMeeting[]> {
  try {
    console.log('🔍 Fetching meetings from aa-intergroup.org...');
    
    // Direct JSON feed - NO SCRAPING NEEDED!
    const jsonFeedUrl = 'https://data.aa-intergroup.org/6436f5a3f03fdecef8459055.json';
    const timestamp = Date.now();
    const targetUrl = `${jsonFeedUrl}?${timestamp}`;
    
    console.log('📡 Using direct JSON feed access (no proxy needed)');
    console.log(`📡 Fetching from: ${jsonFeedUrl}`);
    
    const response = await axios.get(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 30000
    });

    const data = response.data;
    
    if (!Array.isArray(data)) {
      console.log('⚠️  Response is not an array, got:', typeof data);
      return [];
    }
    
    console.log(`📋 Got ${data.length} meetings from OIAA JSON feed`);
    
    const meetings: AAIntergroupMeeting[] = [];
    
    // Filter for active meetings (last 12 months)
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
    
    let skippedInactive = 0;
    let skippedNoZoom = 0;
    
    for (const meeting of data) {
      // Only include meetings with Zoom links
      if (!meeting.conference_url || !meeting.conference_url.includes('zoom.us')) {
        skippedNoZoom++;
        continue;
      }
      
      // Extract Zoom ID (supports both /j/ and /s/ patterns)
      const zoomMatch = meeting.conference_url.match(/zoom\.us\/[js]\/(\d+)/);
      const zoomId = zoomMatch ? zoomMatch[1] : undefined;
      
      if (!zoomId) {
        skippedNoZoom++;
        continue;
      }
      
      // Skip meetings that haven't been updated in 12+ months
      if (meeting.updated) {
        try {
          const updatedDate = new Date(meeting.updated);
          if (updatedDate < twelveMonthsAgo) {
            skippedInactive++;
            continue;
          }
        } catch (error) {
          // If date parsing fails, keep the meeting
        }
      }
      
      meetings.push({
        name: meeting.name || 'AA Meeting',
        day: parseDayOfWeek(meeting.day) || 'Monday',
        time: parseTime(meeting.time) || '19:00',
        zoomId: zoomId,
        zoomPassword: extractPasswordFromNotes(meeting.conference_url_notes),
        type: Array.isArray(meeting.types) ? meeting.types.join(', ') : 'Open',
        description: meeting.notes || meeting.conference_url_notes || undefined
      });
    }
    
    console.log(`✅ Processed ${meetings.length} meetings`);
    console.log(`   📊 Skipped ${skippedInactive} inactive meetings (not updated in 12+ months)`);
    console.log(`   📊 Skipped ${skippedNoZoom} meetings without Zoom links`);
    
    return meetings;

  } catch (error: any) {
    console.error('❌ Error fetching AA meetings:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Status Text: ${error.response.statusText}`);
    }
    return [];
  }
}

/**
 * Extract password from conference notes
 */
function extractPasswordFromNotes(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  
  const passwordMatch = notes.match(/(?:password|passcode|pwd):\s*(\S+)/i);
  return passwordMatch ? passwordMatch[1] : undefined;
}

/**
 * Parse day of week from various formats
 */
function parseDayOfWeek(day: any): string | undefined {
  if (!day) return undefined;
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  if (typeof day === 'number' && day >= 0 && day <= 6) {
    return days[day];
  }
  
  if (typeof day === 'string') {
    const dayLower = day.toLowerCase();
    const foundDay = days.find(d => d.toLowerCase() === dayLower);
    if (foundDay) return foundDay;
    
    const abbrevs: Record<string, string> = {
      'sun': 'Sunday', 'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday',
      'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday'
    };
    return abbrevs[dayLower.substring(0, 3)] || undefined;
  }
  
  return undefined;
}

/**
 * Parse time from various formats
 */
function parseTime(time: any): string | undefined {
  if (!time) return undefined;
  
  if (typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time)) {
    return time;
  }
  
  const match = time.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toLowerCase();
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  return time;
}

async function saveMeetingsToDatabase(meetings: AAIntergroupMeeting[]): Promise<number> {
  let savedCount = 0;
  
  for (const meeting of meetings) {
    try {
      const zoomUrl = `https://zoom.us/j/${meeting.zoomId}`;
      
      await prisma.externalMeeting.upsert({
        where: {
          externalId: `aa-intergroup-${meeting.zoomId}`
        },
        update: {
          name: meeting.name,
          program: 'AA',
          meetingType: meeting.type,
          description: meeting.description,
          dayOfWeek: meeting.day,
          time: meeting.time,
          timezone: 'America/New_York', // OIAA is US-based
          durationMinutes: 60,
          format: 'ONLINE',
          zoomUrl,
          zoomId: meeting.zoomId,
          zoomPassword: meeting.zoomPassword,
          tags: meeting.type.split(',').map(t => t.trim()),
          hasProofCapability: true,
          lastSyncedAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          externalId: `aa-intergroup-${meeting.zoomId}`,
          name: meeting.name,
        program: 'AA',
        meetingType: meeting.type,
        description: meeting.description,
        dayOfWeek: meeting.day,
        time: meeting.time,
        timezone: 'America/New_York',
        durationMinutes: 60,
          format: 'ONLINE',
          zoomUrl,
          zoomId: meeting.zoomId,
          zoomPassword: meeting.zoomPassword,
          tags: meeting.type.split(',').map(t => t.trim()),
          hasProofCapability: true,
          lastSyncedAt: new Date()
        }
      });
      savedCount++;
    } catch (error: any) {
      console.error(`Failed to save meeting ${meeting.name}:`, error.message);
    }
  }
  
  return savedCount;
}

async function main() {
  try {
    console.log('🚀 Starting AA-Intergroup sync...\n');
    
    const meetings = await fetchAAMeetings();
    
    if (meetings.length === 0) {
      console.log('⚠️  No meetings found. The website structure may have changed.');
      return;
    }
    
    console.log(`\n💾 Saving ${meetings.length} meetings to database...`);
    const savedCount = await saveMeetingsToDatabase(meetings);
    
    console.log(`\n✅ Sync complete!`);
    console.log(`   📝 ${savedCount} meetings saved to database`);
    console.log(`\n🎯 Participants can now search for these meetings!`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

