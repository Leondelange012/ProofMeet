/**
 * Add a meeting interactively to the database
 * Usage: npx ts-node scripts/add-meeting-interactive.ts [zoomId] [name] [program] [day] [time]
 * 
 * Interactive mode: npx ts-node scripts/add-meeting-interactive.ts
 * Quick mode: npx ts-node scripts/add-meeting-interactive.ts 908141096 "AA Morning Meeting" AA Monday 08:00
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question: string, defaultValue?: string): Promise<string> {
  const promptText = defaultValue 
    ? `${question} (default: ${defaultValue}): `
    : `${question}: `;
    
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function addMeetingInteractive() {
  console.log('🎯 Add Meeting to ProofMeet (Interactive Mode)\n');
  
  const zoomId = await prompt('Zoom ID (numbers only, e.g., 88113069602)');
  if (!zoomId) {
    throw new Error('Zoom ID is required');
  }
  
  const name = await prompt('Meeting name', 'AA Meeting');
  const program = await prompt('Program (AA/NA/SMART)', 'AA');
  const day = await prompt('Day of week (e.g., Monday)', 'Monday');
  const time = await prompt('Time in 24h format (e.g., 19:00)', '19:00');
  const password = await prompt('Zoom password (optional, press Enter to skip)');
  const type = await prompt('Meeting type', 'Open Discussion');
  
  return {
    zoomId,
    name,
    program: program.toUpperCase(),
    day,
    time,
    password: password || undefined,
    type
  };
}

async function addMeetingFromArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    return null; // Fall back to interactive
  }
  
  return {
    zoomId: args[0],
    name: args[1] || 'AA Meeting',
    program: (args[2] || 'AA').toUpperCase(),
    day: args[3] || 'Monday',
    time: args[4] || '19:00',
    password: args[5] || undefined,
    type: args[6] || 'Open Discussion'
  };
}

async function saveMeeting(meetingData: any) {
  const newMeeting = {
    externalId: `manual-${meetingData.program.toLowerCase()}-${meetingData.zoomId}`,
    name: meetingData.name,
    program: meetingData.program,
    meetingType: meetingData.type,
    dayOfWeek: meetingData.day,
    time: meetingData.time,
    timezone: 'America/New_York',
    durationMinutes: 60,
    format: 'ONLINE' as const,
    zoomUrl: `https://zoom.us/j/${meetingData.zoomId}`,
    zoomId: meetingData.zoomId,
    zoomPassword: meetingData.password,
    tags: meetingData.type.split(' '),
    hasProofCapability: true,
  };
  
  console.log('\n📝 Creating meeting with these details:');
  console.log(`   Name: ${newMeeting.name}`);
  console.log(`   Program: ${newMeeting.program}`);
  console.log(`   Zoom ID: ${newMeeting.zoomId}`);
  console.log(`   Zoom URL: ${newMeeting.zoomUrl}`);
  console.log(`   Day/Time: ${newMeeting.dayOfWeek} at ${newMeeting.time}`);
  console.log(`   Password: ${newMeeting.zoomPassword || 'None'}`);
  console.log(`   Type: ${newMeeting.meetingType}`);
  
  const meeting = await prisma.externalMeeting.upsert({
    where: { externalId: newMeeting.externalId },
    update: {
      ...newMeeting,
      lastSyncedAt: new Date(),
      updatedAt: new Date()
    },
    create: {
      ...newMeeting,
      lastSyncedAt: new Date()
    }
  });
  
  console.log('\n✅ Meeting saved successfully!');
  console.log(`   Database ID: ${meeting.id}`);
  console.log(`   External ID: ${meeting.externalId}`);
  console.log(`   hasProofCapability: ${meeting.hasProofCapability}`);
  console.log('\n🎉 Participants can now search for and join this meeting!');
  console.log(`   Search by Zoom ID: /api/participant/meetings/available?zoomId=${meeting.zoomId}`);
  console.log(`   Search by Program: /api/participant/meetings/available?program=${meeting.program}`);
  
  return meeting;
}

async function main() {
  try {
    let meetingData;
    
    // Check if running in quick mode (arguments provided)
    if (process.argv.length > 2) {
      meetingData = await addMeetingFromArgs();
      if (!meetingData) {
        // Fall back to interactive mode
        meetingData = await addMeetingInteractive();
      } else {
        console.log('🚀 Quick Mode: Adding meeting from command line arguments\n');
      }
    } else {
      // Interactive mode
      meetingData = await addMeetingInteractive();
    }
    
    await saveMeeting(meetingData);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
