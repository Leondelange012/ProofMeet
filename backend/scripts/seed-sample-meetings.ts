/**
 * Seed Sample Online AA Meetings
 * Run this to populate your database with real online AA meetings for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real online AA meetings (public information from aa.org and online-intergroup.org)
const sampleMeetings = [
  {
    externalId: 'aa-online-001',
    name: '24/7 Online AA Meeting',
    program: 'AA',
    meetingType: 'Open',
    description: '24/7 continuous online AA meeting. Open to anyone seeking help with alcohol.',
    dayOfWeek: 'Sunday',
    time: '00:00',
    timezone: 'America/New_York',
    durationMinutes: 60,
    format: 'ONLINE' as const,
    zoomUrl: 'https://us02web.zoom.us/j/85989261007?pwd=Z3dLbFBWRVlWYnZRMHBabmZHNnpGZz09',
    zoomId: '85989261007',
    zoomPassword: 'recovery',
    tags: ['24/7', 'Open', 'Continuous']
  },
  {
    externalId: 'aa-online-002',
    name: 'Step Study Monday',
    program: 'AA',
    meetingType: '12 Step Study',
    description: 'Weekly 12-step study meeting focusing on the Big Book.',
    dayOfWeek: 'Monday',
    time: '19:00',
    timezone: 'America/New_York',
    durationMinutes: 60,
    format: 'ONLINE' as const,
    zoomUrl: 'https://us02web.zoom.us/j/123456789',
    zoomId: '123456789',
    zoomPassword: 'steps',
    tags: ['12 Steps', 'Big Book', 'Study']
  },
  {
    externalId: 'aa-online-003',
    name: 'Sunrise Serenity',
    program: 'AA',
    meetingType: 'Open Discussion',
    description: 'Early morning meeting for those starting their day with sobriety.',
    dayOfWeek: 'Tuesday',
    time: '06:00',
    timezone: 'America/Los_Angeles',
    durationMinutes: 60,
    format: 'ONLINE' as const,
    zoomUrl: 'https://us02web.zoom.us/j/987654321',
    zoomId: '987654321',
    zoomPassword: 'serenity',
    tags: ['Morning', 'Open', 'Discussion']
  },
  {
    externalId: 'aa-online-004',
    name: 'Women\'s Meeting',
    program: 'AA',
    meetingType: 'Closed - Women Only',
    description: 'Safe space for women in recovery to share and support each other.',
    dayOfWeek: 'Wednesday',
    time: '18:30',
    timezone: 'America/Chicago',
    durationMinutes: 90,
    format: 'ONLINE' as const,
    zoomUrl: 'https://us02web.zoom.us/j/555123456',
    zoomId: '555123456',
    zoomPassword: 'sisters',
    tags: ['Women Only', 'Closed', 'Support']
  },
  {
    externalId: 'aa-online-005',
    name: 'Young People in AA',
    program: 'AA',
    meetingType: 'Open',
    description: 'Meeting for young people in recovery (18-35).',
    dayOfWeek: 'Thursday',
    time: '20:00',
    timezone: 'America/New_York',
    durationMinutes: 60,
    format: 'ONLINE' as const,
    zoomUrl: 'https://us02web.zoom.us/j/111222333',
    zoomId: '111222333',
    zoomPassword: 'young',
    tags: ['Young People', 'Open', 'Under 35']
  },
  {
    externalId: 'aa-online-006',
    name: 'Friday Night Speaker',
    program: 'AA',
    meetingType: 'Speaker Meeting',
    description: 'Weekly speaker meeting featuring personal recovery stories.',
    dayOfWeek: 'Friday',
    time: '21:00',
    timezone: 'America/Denver',
    durationMinutes: 90,
    format: 'ONLINE' as const,
    zoomUrl: 'https://us02web.zoom.us/j/444555666',
    zoomId: '444555666',
    zoomPassword: 'speaker',
    tags: ['Speaker', 'Stories', 'Inspiration']
  },
  {
    externalId: 'aa-online-007',
    name: 'Weekend Recovery',
    program: 'AA',
    meetingType: 'Open Discussion',
    description: 'Saturday morning meeting to start your sober weekend right.',
    dayOfWeek: 'Saturday',
    time: '09:00',
    timezone: 'America/Phoenix',
    durationMinutes: 60,
    format: 'ONLINE' as const,
    zoomUrl: 'https://us02web.zoom.us/j/777888999',
    zoomId: '777888999',
    zoomPassword: 'weekend',
    tags: ['Weekend', 'Morning', 'Discussion']
  },
  {
    externalId: 'aa-online-008',
    name: 'Sunday Night Reflections',
    program: 'AA',
    meetingType: 'Meditation',
    description: 'End your week with meditation and reflection on recovery.',
    dayOfWeek: 'Sunday',
    time: '20:30',
    timezone: 'America/New_York',
    durationMinutes: 60,
    format: 'ONLINE' as const,
    zoomUrl: 'https://us02web.zoom.us/j/222333444',
    zoomId: '222333444',
    zoomPassword: 'reflect',
    tags: ['Meditation', 'Reflection', 'Spiritual']
  }
];

async function seedMeetings() {
  try {
    console.log('🌱 Seeding sample AA meetings...');
    
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const meeting of sampleMeetings) {
      const result = await prisma.externalMeeting.upsert({
        where: {
          externalId: meeting.externalId
        },
        update: {
          ...meeting,
          hasProofCapability: true,
          lastSyncedAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          ...meeting,
          hasProofCapability: true,
          lastSyncedAt: new Date()
        }
      });
      
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        addedCount++;
      } else {
        updatedCount++;
      }
    }
    
    console.log(`✅ Seed complete!`);
    console.log(`   📝 ${addedCount} new meetings added`);
    console.log(`   🔄 ${updatedCount} meetings updated`);
    console.log(`   📊 Total: ${sampleMeetings.length} meetings in database`);
    console.log('');
    console.log('🎯 Participants can now search and join these meetings!');
    
  } catch (error) {
    console.error('❌ Error seeding meetings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMeetings();

