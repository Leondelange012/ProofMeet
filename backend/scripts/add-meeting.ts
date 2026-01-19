/**
 * Quick Add Meeting
 * Easily add a meeting you found on aa-intergroup.org or elsewhere
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ✏️ EDIT THESE DETAILS for the meeting you want to add:
const newMeeting = {
  name: 'Turning It Over',  // Meeting name
  zoomId: '212359816',      // Zoom ID (no spaces)
  password: 'TIO2020',      // Zoom password
  day: 'Tuesday',           // Day of week
  time: '01:00',            // Time in 24-hour format (13:00 for 1pm)
  type: 'Open LGBTQA',      // Meeting type
  description: 'Open LGBTQA meeting',
  program: 'AA',            // AA, NA, SMART, etc.
};

async function addMeeting() {
  try {
    const zoomUrl = `https://zoom.us/j/${newMeeting.zoomId}`;
    
    const meeting = await prisma.externalMeeting.upsert({
      where: {
        externalId: `aa-manual-${newMeeting.zoomId}`
      },
      update: {
        name: newMeeting.name,
        program: newMeeting.program,
        meetingType: newMeeting.type,
        description: newMeeting.description,
        dayOfWeek: newMeeting.day,
        time: newMeeting.time,
        timezone: 'America/New_York',
        durationMinutes: 60,
        format: 'ONLINE',
        zoomUrl,
        zoomId: newMeeting.zoomId,
        zoomPassword: newMeeting.password,
        tags: newMeeting.type.split(' '),
        hasProofCapability: true,
        lastSyncedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        externalId: `aa-manual-${newMeeting.zoomId}`,
        name: newMeeting.name,
        program: newMeeting.program,
        meetingType: newMeeting.type,
        description: newMeeting.description,
        dayOfWeek: newMeeting.day,
        time: newMeeting.time,
        timezone: 'America/New_York',
        durationMinutes: 60,
        format: 'ONLINE',
        zoomUrl,
        zoomId: newMeeting.zoomId,
        zoomPassword: newMeeting.password,
        tags: newMeeting.type.split(' '),
        hasProofCapability: true,
        lastSyncedAt: new Date()
      }
    });
    
    console.log('✅ Meeting added successfully!');
    console.log(`   📝 Name: ${meeting.name}`);
    console.log(`   🆔 Zoom ID: ${meeting.zoomId}`);
    console.log(`   📅 ${meeting.dayOfWeek} at ${meeting.time}`);
    console.log('');
    console.log('🎯 Participants can now search for this meeting!');
    console.log(`   Search by: "${newMeeting.zoomId}" or "${newMeeting.name}"`);
    
  } catch (error) {
    console.error('❌ Error adding meeting:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMeeting();

