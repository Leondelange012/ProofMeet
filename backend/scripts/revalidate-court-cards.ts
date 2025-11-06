/**
 * Retroactive Court Card Validation Script
 * 
 * This script revalidates all existing Court Cards to ensure they meet
 * the 80% attendance threshold. Any cards marked as PASSED with < 80%
 * attendance will be corrected to FAILED.
 * 
 * Run with: npx tsx backend/scripts/revalidate-court-cards.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Violation {
  type: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
}

async function revalidateCourtCards() {
  console.log('🔍 Starting Court Card revalidation...\n');

  // Get all Court Cards
  const courtCards = await prisma.courtCard.findMany({
    include: {
      attendanceRecord: {
        include: {
          externalMeeting: {
            select: {
              durationMinutes: true,
            },
          },
        },
      },
    },
  });

  console.log(`📊 Found ${courtCards.length} Court Cards to validate\n`);

  let updatedCount = 0;
  let alreadyCorrectCount = 0;

  for (const card of courtCards) {
    const totalDurationMin = card.totalDurationMin;
    const meetingDurationMin = card.meetingDurationMin;
    const activeDurationMin = card.activeDurationMin;
    const idleDurationMin = (card as any).idleDurationMin || 0;
    
    // Calculate percentages
    const activePercent = totalDurationMin > 0 ? (activeDurationMin / totalDurationMin) * 100 : 0;
    const idlePercent = totalDurationMin > 0 ? (idleDurationMin / totalDurationMin) * 100 : 0;
    const meetingAttendancePercent = meetingDurationMin > 0 ? (totalDurationMin / meetingDurationMin) * 100 : 0;
    
    const violations: Violation[] = [];
    
    // Rule 1: Must be active for at least 80% of time attended
    if (activePercent < 80) {
      violations.push({
        type: 'LOW_ACTIVE_TIME',
        message: `Only ${activePercent.toFixed(1)}% active during meeting (required 80%). Active: ${activeDurationMin} min, Total: ${totalDurationMin} min.`,
        severity: 'CRITICAL',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Rule 2: Idle time must not exceed 20%
    if (idlePercent > 20) {
      violations.push({
        type: 'EXCESSIVE_IDLE_TIME',
        message: `Idle for ${idleDurationMin} minutes (${idlePercent.toFixed(1)}% of attendance). Maximum allowed: 20%.`,
        severity: 'CRITICAL',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Rule 3: Must attend at least 80% of scheduled meeting duration
    if (meetingAttendancePercent < 80) {
      violations.push({
        type: 'INSUFFICIENT_ATTENDANCE',
        message: `Attended ${totalDurationMin} minutes of ${meetingDurationMin} minute meeting (${meetingAttendancePercent.toFixed(1)}%). Required: 80%.`,
        severity: 'CRITICAL',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Determine correct validation status
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    const correctStatus = criticalViolations.length > 0 ? 'FAILED' : 'PASSED';
    const currentStatus = (card as any).validationStatus || 'PASSED';
    
    // Check if status needs updating
    if (currentStatus !== correctStatus) {
      console.log(`❌ INCORRECT: ${card.cardNumber}`);
      console.log(`   Current: ${currentStatus} | Correct: ${correctStatus}`);
      console.log(`   Attendance: ${meetingAttendancePercent.toFixed(1)}% (${totalDurationMin}/${meetingDurationMin} min)`);
      console.log(`   Active: ${activePercent.toFixed(1)}% | Idle: ${idlePercent.toFixed(1)}%`);
      console.log(`   Critical Violations: ${criticalViolations.length}`);
      
      // Update the Court Card
      await prisma.courtCard.update({
        where: { id: card.id },
        data: {
          validationStatus: correctStatus as any,
          violations: violations as any,
        },
      });
      
      // Update the attendance record isValid flag
      await prisma.attendanceRecord.update({
        where: { id: card.attendanceRecordId },
        data: {
          isValid: correctStatus === 'PASSED',
        },
      });
      
      console.log(`   ✅ Updated to: ${correctStatus}\n`);
      updatedCount++;
    } else {
      alreadyCorrectCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 REVALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Court Cards: ${courtCards.length}`);
  console.log(`Already Correct: ${alreadyCorrectCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log('='.repeat(60));

  if (updatedCount > 0) {
    console.log('\n⚠️  IMPORTANT: Corrected Court Cards have been updated.');
    console.log('   Participants will now see accurate compliance status.');
  } else {
    console.log('\n✅ All Court Cards are correctly validated!');
  }
}

// Run the script
revalidateCourtCards()
  .catch((error) => {
    console.error('❌ Error during revalidation:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

