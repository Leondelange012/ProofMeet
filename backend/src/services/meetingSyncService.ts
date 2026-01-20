/**
 * Meeting Sync Service
 * Automatically syncs recovery meetings from external sources
 * Runs daily to keep meeting directory up-to-date
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// OFFICIAL AA MEETING GUIDE API
// UPDATE: This API returns HTML redirects - temporarily disabled
// const AA_MEETING_GUIDE_API = 'https://aaMeetingGuide.org/api/v2/meetings';

// DIRECT AA INTERGROUP TSML APIs
// These are individual intergroup WordPress TSML APIs
// OIAA (Online Intergroup of Alcoholics Anonymous) is the largest online AA source
const AA_TSML_FEEDS = [
  { 
    name: 'OIAA (AA-Intergroup)', 
    url: 'https://aa-intergroup.org/wp-json/tsml/v1/meetings',
    perPage: 500,
    types: 'ONL' // Online meetings only
  },
  {
    name: 'NYC AA',
    url: 'https://meetings.nyintergroup.org/wp-json/tsml/v1/meetings',
    perPage: 100,
    types: 'ONL'
  },
];

// BMLT servers for NA (fallback to known working ones)
const BMLT_ROOT_SERVERS = [
  'https://bmlt.sezf.org/main_server',  // Main worldwide BMLT
  'https://tomato.bmltenabled.org/main_server',  // Another root
];

// ScraperAPI configuration for bypassing CAPTCHA protection on AA meeting sources
// Get API key from environment variable (set in Railway)
const SCRAPERAPI_KEY = process.env.SCRAPERAPI_KEY;

/**
 * Build proxy URL for external API calls
 * Uses ScraperAPI if key is available, otherwise falls back to corsproxy.io
 */
function buildProxyUrl(targetUrl: string): string {
  if (SCRAPERAPI_KEY) {
    // ScraperAPI format: https://api.scraperapi.com?api_key=YOUR_KEY&url=TARGET_URL
    return `https://api.scraperapi.com?api_key=${SCRAPERAPI_KEY}&url=${encodeURIComponent(targetUrl)}`;
  } else {
    // Fallback to free CORS proxy (may be blocked by CAPTCHA)
    return `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  }
}

interface ExternalMeeting {
  externalId: string;
  name: string;
  program: string;
  meetingType: string;
  description?: string;
  dayOfWeek?: string;
  time?: string;
  timezone: string;
  durationMinutes?: number;
  format: 'ONLINE' | 'IN_PERSON' | 'HYBRID';
  zoomUrl?: string;
  zoomId?: string;
  zoomPassword?: string;
  location?: string;
  address?: string;
  tags: string[];
}

/**
 * Fetch online meetings from In The Rooms
 * PUBLIC - Schedule is publicly visible
 */
async function fetchInTheRoomsMeetings(): Promise<ExternalMeeting[]> {
  try {
    logger.info('🔍 Fetching online meetings from In The Rooms...');
    
    // In The Rooms has a public schedule page
    // Note: This may require HTML parsing if they don't have a JSON API
    // For now, returning empty array - can be enhanced with web scraping
    
    logger.info('ℹ️  In The Rooms sync not yet implemented (requires web scraping)');
    return [];
    
    // Future implementation would parse their schedule page
    // or reverse-engineer their mobile app API
  } catch (error: any) {
    logger.error('❌ Error fetching In The Rooms meetings:', error.message);
    return [];
  }
}

/**
 * Fetch AA meetings from direct TSML feeds
 * These are WordPress sites running the TSML plugin
 * 
 * API Docs: https://github.com/code4recovery/spec
 */
async function fetchAAMeetingGuideMeetings(): Promise<ExternalMeeting[]> {
  try {
    logger.info('🔍 Fetching AA meetings from TSML intergroup feeds...');
    
    const meetings: ExternalMeeting[] = [];
    const seenZoomIds = new Set<string>();
    
    // ============================================================
    // LOOP THROUGH AA TSML FEEDS
    // ============================================================
    for (const feed of AA_TSML_FEEDS) {
      try {
        logger.info(`   📡 Fetching from: ${feed.name}`);
        
        // Use ScraperAPI or CORS proxy to bypass CAPTCHA protection
        const proxiedUrl = buildProxyUrl(feed.url);
        
        if (SCRAPERAPI_KEY) {
          logger.info(`   🔐 Using ScraperAPI to bypass CAPTCHA protection`);
        } else {
          logger.warn(`   ⚠️  No ScraperAPI key - using free proxy (may fail due to CAPTCHA)`);
        }
        
        const response = await axios.get(proxiedUrl, {
          params: {
            per_page: feed.perPage,
            types: feed.types || 'ONL', // Online meetings
          },
          timeout: 30000,
          headers: {
            'User-Agent': 'ProofMeet/1.0 (Court Compliance System)',
            'Accept': 'application/json',
          },
        });

      if (response.status === 200 || response.status === 202) {
        // Handle both array and object responses
        let meetingsData = response.data;
        
        // If data is wrapped in an object, try to extract the array
        if (!Array.isArray(meetingsData)) {
          logger.info(`   📦 Response is not an array, checking for nested data...`);
          logger.info(`   🔍 Response keys: ${Object.keys(meetingsData || {}).join(', ')}`);
          
          // Common patterns: { meetings: [...] }, { data: [...] }, { results: [...] }
          if (meetingsData?.meetings) meetingsData = meetingsData.meetings;
          else if (meetingsData?.data) meetingsData = meetingsData.data;
          else if (meetingsData?.results) meetingsData = meetingsData.results;
        }
        
        if (Array.isArray(meetingsData)) {
          logger.info(`   📋 Received ${meetingsData.length} meetings from ${feed.name}`);
          
          let addedFromFeed = 0;
          for (const meeting of meetingsData) {
            // Check if meeting is online (has conference_url or conference_url_notes)
            const conferenceUrl = meeting.conference_url || meeting.conference_url_notes || meeting.conference_phone;
            
            // Only include online meetings with Zoom links
            if (conferenceUrl && typeof conferenceUrl === 'string' && conferenceUrl.toLowerCase().includes('zoom')) {
              const zoomId = extractZoomId(conferenceUrl);
              
              if (zoomId && !seenZoomIds.has(zoomId)) {
                seenZoomIds.add(zoomId);
                addedFromFeed++;
                
                meetings.push({
                  externalId: `aa-${feed.name.toLowerCase().replace(/\s+/g, '-')}-${meeting.slug || meeting.id || zoomId}`,
                  name: meeting.name || meeting.post_title || `AA Meeting (${feed.name})`,
                  program: 'AA',
                  meetingType: formatMeetingTypes(meeting.types),
                  description: meeting.notes || meeting.location_notes || undefined,
                  dayOfWeek: parseDayOfWeek(meeting.day),
                  time: parseTime(meeting.time),
                  timezone: meeting.timezone || 'America/New_York',
                  durationMinutes: 60,
                  format: 'ONLINE',
                  zoomUrl: conferenceUrl,
                  zoomId: zoomId,
                  zoomPassword: meeting.conference_phone || meeting.conference_phone_notes || undefined,
                  tags: parseTags(meeting.types)
                });
              }
            }
          }
          
          logger.info(`   ✅ ${feed.name}: Added ${addedFromFeed} unique Zoom meetings`);
        } else {
          logger.warn(`   ⚠️  ${feed.name}: Could not find meetings array in response`);
          logger.warn(`   📄 Response type: ${typeof meetingsData}, Sample: ${JSON.stringify(meetingsData).substring(0, 200)}`);
        }
      } else {
        logger.warn(`   ⚠️  ${feed.name}: Unexpected response status ${response.status}`);
      }
      } catch (error: any) {
        logger.error(`❌ ${feed.name} API error:`, error.message);
      }
    }

    logger.info(`✅ Total AA meetings fetched: ${meetings.length} (from all TSML feeds)`);
    return meetings;
  } catch (error: any) {
    logger.error('❌ Error in AA meeting fetch:', error.message);
    return [];
  }
}

/**
 * Format meeting types from various formats
 */
function formatMeetingTypes(types: any): string {
  if (!types) return 'Open';
  
  if (Array.isArray(types)) {
    return types.join(', ') || 'Open';
  }
  
  if (typeof types === 'string') {
    return types;
  }
  
  return 'Open';
}

/**
 * Parse tags from meeting types
 */
function parseTags(types: any): string[] {
  if (!types) return [];
  
  if (Array.isArray(types)) {
    return types.filter(t => typeof t === 'string');
  }
  
  if (typeof types === 'string') {
    return types.split(',').map(t => t.trim()).filter(Boolean);
  }
  
  return [];
}

/**
 * Parse day of week from various formats
 */
function parseDayOfWeek(day: any): string | undefined {
  if (!day) return undefined;
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // If it's a number (0-6)
  if (typeof day === 'number' && day >= 0 && day <= 6) {
    return days[day];
  }
  
  // If it's a string
  if (typeof day === 'string') {
    // Check if it's already a full day name
    const dayLower = day.toLowerCase();
    const foundDay = days.find(d => d.toLowerCase() === dayLower);
    if (foundDay) return foundDay;
    
    // Try to match abbreviated names
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
  
  // If it's already in HH:MM format
  if (typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time)) {
    return time;
  }
  
  // If it's in 12-hour format (e.g., "7:00 PM")
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

/**
 * Helper: Convert day number (0-6) to day name
 */
function convertDayNumber(day: number | string): string | undefined {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  if (typeof day === 'number' && day >= 0 && day <= 6) {
    return days[day];
  }
  
  if (typeof day === 'string') {
    // If already a day name, return it
    if (days.includes(day)) return day;
    
    // Try to parse as number
    const dayNum = parseInt(day);
    if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
      return days[dayNum];
    }
  }
  
  return undefined;
}

/**
 * Fetch NA meetings
 * Note: NA doesn't have a simple public API, but data is available via:
 * - BMLT (Basic Meeting List Toolbox) - used by many NA regions
 * - Regional NA websites (each region has their own)
 */
async function fetchNAMeetings(): Promise<ExternalMeeting[]> {
  try {
    logger.info('🔍 Fetching NA meetings from BMLT servers...');
    
    const meetings: ExternalMeeting[] = [];
    const seenZoomIds = new Set<string>();
    
    for (const serverUrl of BMLT_ROOT_SERVERS) {
      try {
        logger.info(`   📡 Querying ${serverUrl}...`);
        
        // BMLT API endpoint for getting virtual meetings
        const apiUrl = `${serverUrl}/client_interface/json/?switcher=GetSearchResults&formats=VM`;
        
        const response = await axios.get(apiUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'ProofMeet/1.0',
            'Accept': 'application/json',
          },
        });

        if (response.status === 200 && Array.isArray(response.data)) {
          logger.info(`   📋 Got ${response.data.length} meetings from this server`);
          
          for (const meeting of response.data) {
            // Look for virtual meeting link
            const virtualLink = meeting.virtual_meeting_link || 
                               meeting.virtual_meeting_additional_info ||
                               meeting.comments;
            
            if (virtualLink && typeof virtualLink === 'string' && virtualLink.includes('zoom.us')) {
              const zoomId = extractZoomId(virtualLink);
              
              if (zoomId && !seenZoomIds.has(zoomId)) {
                seenZoomIds.add(zoomId);
                
                meetings.push({
                  externalId: `na-bmlt-${meeting.id_bigint || zoomId}`,
                  name: meeting.meeting_name || 'NA Meeting',
                  program: 'NA',
                  meetingType: meeting.formats || 'Open',
                  description: meeting.comments || undefined,
                  dayOfWeek: parseBMLTDayOfWeek(meeting.weekday_tinyint),
                  time: meeting.start_time || undefined,
                  timezone: meeting.time_zone || 'America/New_York',
                  durationMinutes: parseBMLTDuration(meeting.duration_time),
                  format: 'ONLINE',
                  zoomUrl: virtualLink,
                  zoomId: zoomId,
                  zoomPassword: meeting.virtual_meeting_additional_info || undefined,
                  tags: meeting.formats ? meeting.formats.split(',').map((f: string) => f.trim()) : []
                });
              }
            }
          }
          
          logger.info(`   ✅ Added ${meetings.length} unique NA meetings from this server`);
        }
      } catch (error: any) {
        logger.warn(`   ⚠️  ${serverUrl}: ${error.message}`);
      }
    }

    logger.info(`✅ Total NA meetings fetched: ${meetings.length}`);
    return meetings;
  } catch (error: any) {
    logger.error('❌ Error fetching NA meetings:', error.message);
    return [];
  }
}

/**
 * Parse BMLT weekday number to day name
 */
function parseBMLTDayOfWeek(dayNum: number): string | undefined {
  if (!dayNum) return undefined;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum - 1]; // BMLT uses 1-7, not 0-6
}

/**
 * Parse duration from BMLT format (HH:MM:SS)
 */
function parseBMLTDuration(duration: string): number {
  if (!duration) return 60;
  const parts = duration.split(':');
  if (parts.length >= 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 60;
}

/**
 * Fetch SMART Recovery meetings
 * SMART Recovery has a public meeting locator that can be scraped
 */
async function fetchSMARTMeetings(): Promise<ExternalMeeting[]> {
  try {
    logger.info('🔍 Fetching SMART Recovery meetings...');
    
    // SMART Recovery website has a meeting finder
    // Can scrape from: https://meetings.smartrecovery.org/meetings/
    // Or check if they have an API for their mobile app
    
    logger.info('ℹ️  SMART Recovery sync not yet implemented (requires scraping)');
    return [];
  } catch (error: any) {
    logger.error('❌ Error fetching SMART Recovery meetings:', error.message);
    return [];
  }
}

/**
 * Helper: Extract Zoom meeting ID from URL
 */
function extractZoomId(url: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/zoom\.us\/j\/(\d+)/);
  return match ? match[1] : undefined;
}

/**
 * Save meetings to database
 */
async function saveMeetingsToDatabase(meetings: ExternalMeeting[]): Promise<number> {
  let savedCount = 0;
  
  for (const meeting of meetings) {
    try {
      await prisma.externalMeeting.upsert({
        where: {
          externalId: meeting.externalId
        },
        update: {
          name: meeting.name,
          program: meeting.program,
          meetingType: meeting.meetingType,
          description: meeting.description,
          dayOfWeek: meeting.dayOfWeek,
          time: meeting.time,
          timezone: meeting.timezone,
          durationMinutes: meeting.durationMinutes,
          format: meeting.format,
          zoomUrl: meeting.zoomUrl,
          zoomId: meeting.zoomId,
          zoomPassword: meeting.zoomPassword,
          location: meeting.location,
          address: meeting.address,
          tags: meeting.tags,
          hasProofCapability: true,
          lastSyncedAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          id: undefined, // Let Prisma generate
          externalId: meeting.externalId,
          name: meeting.name,
          program: meeting.program,
          meetingType: meeting.meetingType,
          description: meeting.description,
          dayOfWeek: meeting.dayOfWeek,
          time: meeting.time,
          timezone: meeting.timezone,
          durationMinutes: meeting.durationMinutes,
          format: meeting.format,
          zoomUrl: meeting.zoomUrl,
          zoomId: meeting.zoomId,
          zoomPassword: meeting.zoomPassword,
          location: meeting.location,
          address: meeting.address,
          tags: meeting.tags,
          hasProofCapability: true,
          lastSyncedAt: new Date()
        }
      });
      savedCount++;
    } catch (error: any) {
      logger.error(`Failed to save meeting ${meeting.externalId}:`, {
        error: error.message,
        code: error.code,
        meta: error.meta
      });
    }
  }
  
  return savedCount;
}

/**
 * Clean up old meetings that haven't been synced recently
 */
async function cleanupOldMeetings(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await prisma.externalMeeting.deleteMany({
      where: {
        lastSyncedAt: {
          lt: thirtyDaysAgo
        },
        // Don't delete meetings without external IDs (manually created)
        externalId: {
          not: null
        }
      }
    });
    
    logger.info(`🧹 Cleaned up ${result.count} old meetings`);
    return result.count;
  } catch (error: any) {
    logger.error('Error cleaning up old meetings:', error.message);
    return 0;
  }
}

/**
 * Main sync function - fetches from all sources and updates database
 */
export async function syncAllMeetings(): Promise<{
  success: boolean;
  totalFetched: number;
  totalSaved: number;
  totalCleaned: number;
  sources: {
    aa: number;
    na: number;
    smart: number;
    inTheRooms: number;
  };
  errors?: string[];
}> {
  const errors: string[] = [];
  
  try {
    logger.info('🔄 ========================================');
    logger.info('🔄 Starting daily meeting sync...');
    logger.info('🔄 ========================================');
    
    // Fetch from all sources in parallel
    logger.info('📡 Fetching from external sources...');
    const [aaMeetings, naMeetings, smartMeetings, itrMeetings] = await Promise.all([
      fetchAAMeetingGuideMeetings().catch(err => {
        errors.push(`AA fetch failed: ${err.message}`);
        logger.error('❌ AA fetch error:', err);
        return [];
      }),
      fetchNAMeetings().catch(err => {
        errors.push(`NA fetch failed: ${err.message}`);
        logger.error('❌ NA fetch error:', err);
        return [];
      }),
      fetchSMARTMeetings().catch(err => {
        errors.push(`SMART fetch failed: ${err.message}`);
        logger.error('❌ SMART fetch error:', err);
        return [];
      }),
      fetchInTheRoomsMeetings().catch(err => {
        errors.push(`ITR fetch failed: ${err.message}`);
        logger.error('❌ ITR fetch error:', err);
        return [];
      })
    ]);
    
    // Log results from each source
    logger.info('📊 Fetch results by source:');
    logger.info(`   AA: ${aaMeetings.length} meetings`);
    logger.info(`   NA: ${naMeetings.length} meetings`);
    logger.info(`   SMART: ${smartMeetings.length} meetings`);
    logger.info(`   In The Rooms: ${itrMeetings.length} meetings`);
    
    // Combine all meetings
    const allMeetings = [
      ...aaMeetings,
      ...naMeetings,
      ...smartMeetings,
      ...itrMeetings
    ];
    
    logger.info(`📊 Total meetings fetched: ${allMeetings.length}`);
    
    if (allMeetings.length === 0) {
      logger.warn('⚠️  No meetings fetched from any source!');
      if (errors.length > 0) {
        logger.error('Errors encountered:', errors);
      }
    }
    
    // Save to database
    logger.info('💾 Saving meetings to database...');
    const savedCount = await saveMeetingsToDatabase(allMeetings);
    logger.info(`   ✅ Saved ${savedCount} meetings`);
    
    // Clean up old meetings
    logger.info('🧹 Cleaning up old meetings...');
    const cleanedCount = await cleanupOldMeetings();
    logger.info(`   ✅ Cleaned up ${cleanedCount} old meetings`);
    
    logger.info('🔄 ========================================');
    logger.info(`✅ Meeting sync complete: ${savedCount} saved, ${cleanedCount} cleaned`);
    logger.info('🔄 ========================================');
    
    return {
      success: true,
      totalFetched: allMeetings.length,
      totalSaved: savedCount,
      totalCleaned: cleanedCount,
      sources: {
        aa: aaMeetings.length,
        na: naMeetings.length,
        smart: smartMeetings.length,
        inTheRooms: itrMeetings.length
      },
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error: any) {
    logger.error('❌ Meeting sync failed with critical error:', error);
    errors.push(`Critical error: ${error.message}`);
    return {
      success: false,
      totalFetched: 0,
      totalSaved: 0,
      totalCleaned: 0,
      sources: {
        aa: 0,
        na: 0,
        smart: 0,
        inTheRooms: 0
      },
      errors
    };
  }
}

/**
 * Test function to verify API connectivity
 */
export async function testMeetingAPIs(): Promise<void> {
  logger.info('🧪 Testing meeting API connections...');
  
  // Test OIAA (aa-intergroup.org)
  try {
    const oiaaUrl = buildProxyUrl('https://aa-intergroup.org/wp-json/tsml/v1/meetings');
    const oiaaTest = await axios.get(oiaaUrl, {
      params: { per_page: 1 },
      timeout: 10000,
      headers: {
        'User-Agent': 'ProofMeet/1.0 (Court Compliance System)',
        'Accept': 'application/json'
      }
    });
    logger.info(`✅ OIAA TSML API: Status ${oiaaTest.status}`);
  } catch (error: any) {
    logger.error(`❌ OIAA TSML API: ${error.message}`);
  }
  
  // Test NYC AA Intergroup
  try {
    const nycUrl = buildProxyUrl('https://meetings.nyintergroup.org/meetings.json');
    const nycTest = await axios.get(nycUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'ProofMeet/1.0 (Court Compliance System)',
        'Accept': 'application/json'
      }
    });
    logger.info(`✅ NYC AA Intergroup: Status ${nycTest.status}`);
  } catch (error: any) {
    logger.error(`❌ NYC AA Intergroup: ${error.message}`);
  }
  
  logger.info('ℹ️  Other APIs (NA, SMART, In The Rooms) not yet implemented');
}

