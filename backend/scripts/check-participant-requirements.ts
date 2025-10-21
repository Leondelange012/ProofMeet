/**
 * Check and create meeting requirements for a participant
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkParticipantRequirements() {
  try {
    const participantEmail = 'leondelange001@gmail.com';

    // Find the participant
    const participant = await prisma.user.findUnique({
      where: { email: participantEmail },
      include: {
        courtRep: true,
        requirements: true,
      },
    });

    if (!participant) {
      console.log(`❌ Participant ${participantEmail} not found`);
      return;
    }

    console.log(`\n✅ Found participant: ${participant.firstName} ${participant.lastName}`);
    console.log(`   Email: ${participant.email}`);
    console.log(`   Case Number: ${participant.caseNumber}`);
    console.log(`   Court Rep: ${participant.courtRep?.email || 'None'}`);
    console.log(`   Existing Requirements: ${participant.requirements.length}`);

    // Check requirements
    if (participant.requirements.length === 0) {
      console.log(`\n⚠️  No meeting requirements found. Creating default requirements...`);

      if (!participant.courtRepId) {
        console.log(`❌ Cannot create requirements - no Court Rep assigned to this participant`);
        return;
      }

      const newRequirement = await prisma.meetingRequirement.create({
        data: {
          participantId: participant.id,
          courtRepId: participant.courtRepId,
          createdById: participant.courtRepId, // Court rep creates it
          meetingsPerWeek: 1, // Default to 1 meeting per week
          meetingsPerMonth: 4,
          requiredPrograms: ['AA'], // Default to AA
          minimumDurationMinutes: 60,
          minimumAttendancePercent: 80,
          isActive: true,
        },
      });

      console.log(`✅ Created meeting requirement:`);
      console.log(`   Meetings Per Week: ${newRequirement.meetingsPerWeek}`);
      console.log(`   Required Programs: ${newRequirement.requiredPrograms.join(', ')}`);
      console.log(`   Minimum Attendance: ${newRequirement.minimumAttendancePercent}%`);
    } else {
      const activeReq = participant.requirements.find(r => r.isActive);
      if (activeReq) {
        console.log(`\n✅ Active requirement found:`);
        console.log(`   Meetings Per Week: ${activeReq.meetingsPerWeek}`);
        console.log(`   Required Programs: ${activeReq.requiredPrograms.join(', ')}`);
        console.log(`   Minimum Attendance: ${activeReq.minimumAttendancePercent}%`);
      } else {
        console.log(`\n⚠️  No ACTIVE requirements found. Activating first requirement...`);
        await prisma.meetingRequirement.update({
          where: { id: participant.requirements[0].id },
          data: { isActive: true },
        });
        console.log(`✅ Activated requirement`);
      }
    }

    console.log(`\n✅ Done!`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkParticipantRequirements();

