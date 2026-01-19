/**
 * Sync meetings from AA-Intergroup.org
 * This is the official Online Intergroup of AA (OIAA)
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

async function scrapeAAIntergroup(): Promise<AAIntergroupMeeting[]> {
  try {
    console.log('🔍 Fetching meetings from aa-intergroup.org...');
    
    const response = await axios.get('https://aa-intergroup.org/meetings/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const meetings: AAIntergroupMeeting[] = [];

    // Parse the meeting cards
    $('.meeting-card, .meeting').each((index, element) => {
      try {
        const $el = $(element);
        
        // Extract meeting name
        const name = $el.find('h3, .meeting-name').first().text().trim();
        
        // Extract day and time
        const timeText = $el.text();
        const dayMatch = timeText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
        const timeMatch = timeText.match(/(\d{1,2}:\d{2}\s*(am|pm))/i);
        
        // Extract Zoom ID - look for patterns like "ID: 212 359 816" or just the numbers
        const zoomIdMatch = timeText.match(/ID:\s*(\d{3}\s*\d{3}\s*\d{3,4})/i) || 
                           timeText.match(/(\d{3}\s*\d{3}\s*\d{3,4})/);
        
        // Extract password
        const passwordMatch = timeText.match(/(?:PW|Password|Passcode):\s*(\w+)/i);
        
        // Extract meeting type
        const type = $el.find('.badge, .tag').map((i, el) => $(el).text().trim()).get().join(', ') || 'Open';
        
        if (name && zoomIdMatch) {
          const zoomId = zoomIdMatch[1].replace(/\s/g, ''); // Remove spaces
          
          meetings.push({
            name,
            day: dayMatch ? dayMatch[1] : 'Tuesday',
            time: timeMatch ? timeMatch[1] : '1:00 pm',
            zoomId,
            zoomPassword: passwordMatch ? passwordMatch[1] : undefined,
            type,
            description: $el.find('.description, p').first().text().trim() || undefined
          });
        }
      } catch (err) {
        // Skip problematic meetings
      }
    });

    console.log(`✅ Found ${meetings.length} meetings on aa-intergroup.org`);
    return meetings;
    
  } catch (error: any) {
    console.error('❌ Error scraping AA Intergroup:', error.message);
    return [];
  }
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
          time: convertTo24Hour(meeting.time),
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
          time: convertTo24Hour(meeting.time),
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

function convertTo24Hour(time: string): string {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return time;
  
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[3].toLowerCase();
  
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

async function main() {
  try {
    console.log('🚀 Starting AA-Intergroup sync...\n');
    
    const meetings = await scrapeAAIntergroup();
    
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

