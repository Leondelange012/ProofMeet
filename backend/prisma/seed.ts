import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed Approved Court Domains
  console.log('📧 Seeding approved court domains...');
  
  const courtDomains = [
    // California
    { domain: 'probation.ca.gov', state: 'California', organization: 'California Probation Department' },
    { domain: 'courts.ca.gov', state: 'California', organization: 'California Courts' },
    { domain: 'lacounty.gov', state: 'California', organization: 'Los Angeles County' },
    { domain: 'sfgov.org', state: 'California', organization: 'San Francisco County' },
    
    // Texas
    { domain: 'probation.texas.gov', state: 'Texas', organization: 'Texas Probation Department' },
    { domain: 'courts.texas.gov', state: 'Texas', organization: 'Texas Courts' },
    { domain: 'harriscountytx.gov', state: 'Texas', organization: 'Harris County, Texas' },
    { domain: 'dallascounty.org', state: 'Texas', organization: 'Dallas County, Texas' },
    
    // New York
    { domain: 'nycourts.gov', state: 'New York', organization: 'New York State Courts' },
    { domain: 'probation.ny.gov', state: 'New York', organization: 'New York Probation' },
    
    // Test/Development
    { domain: 'test.proofmeet.com', state: 'Test', organization: 'ProofMeet Test Environment' },
  ];

  for (const domain of courtDomains) {
    await prisma.approvedCourtDomain.upsert({
      where: { domain: domain.domain },
      update: {},
      create: domain,
    });
  }

  console.log(`✅ Seeded ${courtDomains.length} approved court domains`);

  // Seed Sample External Meetings (from mock data)
  console.log('📅 Seeding sample external meetings...');
  
  const sampleMeetings = [
    {
      externalId: 'aa-001',
      name: 'Morning Reflections',
      program: 'AA',
      meetingType: 'Big Book Study',
      description: 'Start your week with reflection and study.',
      dayOfWeek: 'Monday',
      time: '07:00',
      timezone: 'PST',
      durationMinutes: 60,
      format: 'ONLINE',
      zoomUrl: 'https://zoom.us/j/123456789',
      zoomId: '123456789',
      zoomPassword: 'recovery',
      tags: ['Beginner Friendly', 'Meditation'],
      hasProofCapability: true,
    },
    {
      externalId: 'na-001',
      name: 'Clean and Serene',
      program: 'NA',
      meetingType: 'Basic Text Study',
      description: 'NA Basic Text study meeting.',
      dayOfWeek: 'Tuesday',
      time: '19:00',
      timezone: 'PST',
      durationMinutes: 60,
      format: 'HYBRID',
      zoomUrl: 'https://zoom.us/j/987654321',
      location: 'Community Center',
      address: '123 Main St, Downtown',
      tags: ['Basic Text', 'Study'],
      hasProofCapability: true,
    },
    {
      externalId: 'smart-001',
      name: 'SMART Tools Workshop',
      program: 'SMART',
      meetingType: '4-Point Program',
      description: 'Learn and practice SMART Recovery tools.',
      dayOfWeek: 'Wednesday',
      time: '18:00',
      timezone: 'PST',
      durationMinutes: 90,
      format: 'ONLINE',
      zoomUrl: 'https://zoom.us/j/456789123',
      tags: ['Tools', 'Workshop', 'CBT'],
      hasProofCapability: true,
    },
  ];

  for (const meeting of sampleMeetings) {
    await prisma.externalMeeting.upsert({
      where: { externalId: meeting.externalId },
      update: {},
      create: meeting as any,
    });
  }

  console.log(`✅ Seeded ${sampleMeetings.length} sample external meetings`);

  // Create test Court Representative
  if (process.env.NODE_ENV === 'development') {
    console.log('👮 Creating test Court Representative...');
    
    const bcrypt = require('bcryptjs');
    const testPassword = await bcrypt.hash('Test123!', 12);

    const courtRep = await prisma.user.upsert({
      where: { email: 'test.officer@probation.ca.gov' },
      update: {},
      create: {
        email: 'test.officer@probation.ca.gov',
        passwordHash: testPassword,
        userType: 'COURT_REP',
        firstName: 'Test',
        lastName: 'Officer',
        courtDomain: 'probation.ca.gov',
        courtName: 'Los Angeles County Probation',
        badgeNumber: 'TEST-12345',
        isEmailVerified: true,
        isActive: true,
      },
    });

    console.log(`✅ Created test Court Rep: ${courtRep.email}`);

    // Create test Participant
    console.log('👤 Creating test Participant...');
    
    const participant = await prisma.user.upsert({
      where: { email: 'test.participant@example.com' },
      update: {},
      create: {
        email: 'test.participant@example.com',
        passwordHash: testPassword,
        userType: 'PARTICIPANT',
        firstName: 'Test',
        lastName: 'Participant',
        caseNumber: '2024-TEST-001',
        courtRepId: courtRep.id,
        phoneNumber: '+1-555-123-4567',
        isEmailVerified: true,
        isActive: true,
      },
    });

    console.log(`✅ Created test Participant: ${participant.email}`);

    // Create sample meeting requirement
    console.log('📋 Creating sample meeting requirement...');
    
    await prisma.meetingRequirement.create({
      data: {
        participantId: participant.id,
        courtRepId: courtRep.id,
        createdById: courtRep.id,
        meetingsPerWeek: 3,
        requiredPrograms: ['AA', 'NA'],
        minimumDurationMinutes: 60,
        minimumAttendancePercent: 90.00,
      },
    });

    console.log('✅ Created sample meeting requirement');
  }

  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('Test Accounts:');
  console.log('  Court Rep: test.officer@probation.ca.gov / Test123!');
  console.log('  Participant: test.participant@example.com / Test123!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

