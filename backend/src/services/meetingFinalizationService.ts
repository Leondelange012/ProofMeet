/**
 * Meeting Finalization Service
 * Automatically finalizes attendance records and generates court cards
 * after meeting windows have ended
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { generateCourtCard } from './courtCardService';
import { analyzeAttendanceEngagement } from './engagementDetection';
import { runFraudDetection, shouldAutoReject, needsManualReview } from './fraudDetection';
import { createAttendanceBlock } from './attendanceLedger';
import { queueDailyDigest } from './emailService';

const prisma = new PrismaClient();

/**
 * Finalize all meetings that have ended their scheduled window
 * but haven't been finalized yet (participants left early)
 */
export async function finalizePendingMeetings(): Promise<void> {
  try {
    const startTime = new Date();
    logger.info('========================================');
    logger.info('🔍 FINALIZATION CHECK STARTED');
    logger.info(`⏰ Current time: ${startTime.toISOString()}`);
    logger.info('========================================');

    // Find all COMPLETED attendance records without court cards from the last 24 hours
    // These are meetings where participants left early and we're waiting for the window to end
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    logger.info(`📅 Searching for meetings from: ${twentyFourHoursAgo.toISOString()}`);
    logger.info(`🔎 Query filters: status=COMPLETED, courtCard=null, meetingDate >= 24h ago`);
    
    const pendingRecords = await prisma.attendanceRecord.findMany({
      where: {
        status: 'COMPLETED',
        courtCard: null, // No court card generated yet
        meetingDate: {
          gte: twentyFourHoursAgo, // Only recent meetings
        },
      },
      include: {
        externalMeeting: true,
        courtCard: true,
      },
    });

    logger.info(`📊 Query returned: ${pendingRecords.length} records`);
    
    if (pendingRecords.length === 0) {
      logger.info('✅ No pending meetings to finalize');
      logger.info('========================================\n');
      return;
    }

    logger.info(`📋 Found ${pendingRecords.length} pending attendance records to check:`);
    pendingRecords.forEach((record, index) => {
      logger.info(`  ${index + 1}. ID: ${record.id}, Meeting: ${record.meetingName}, Date: ${record.meetingDate.toISOString()}, Status: ${record.status}`);
    });

    let finalizedCount = 0;
    const now = new Date();

    for (const record of pendingRecords) {
      try {
        logger.info('----------------------------------------');
        logger.info(`🔄 Processing record: ${record.id}`);
        logger.info(`   Meeting: ${record.meetingName}`);
        logger.info(`   Participant: ${record.participantId}`);
        logger.info(`   Join Time: ${record.joinTime.toISOString()}`);
        logger.info(`   Leave Time: ${record.leaveTime?.toISOString() || 'N/A'}`);
        
        // Calculate meeting end time
        const meetingStartTime = record.joinTime;
        const meetingDuration = record.externalMeeting?.durationMinutes || 60;
        const meetingEndTime = new Date(meetingStartTime.getTime() + meetingDuration * 60 * 1000);

        logger.info(`   Meeting Start: ${meetingStartTime.toISOString()}`);
        logger.info(`   Meeting Duration: ${meetingDuration} minutes`);
        logger.info(`   Meeting End: ${meetingEndTime.toISOString()}`);
        logger.info(`   Current Time: ${now.toISOString()}`);

        // Check if meeting window has ended
        const timeUntilEnd = meetingEndTime.getTime() - now.getTime();
        const hasEnded = now > meetingEndTime;
        
        logger.info(`   Time Until End: ${Math.floor(timeUntilEnd / 1000 / 60)} minutes`);
        logger.info(`   Has Ended: ${hasEnded}`);

        if (!hasEnded) {
          const minutesRemaining = Math.ceil(timeUntilEnd / (1000 * 60));
          logger.info(`   ⏳ SKIPPING - Meeting still active (${minutesRemaining} min remaining)`);
          continue;
        }

        logger.info(`   ✅ Meeting window has ended - proceeding with finalization`);

        // Run engagement analysis
        logger.info(`   📊 Running engagement analysis...`);
        const engagementAnalysis = await analyzeAttendanceEngagement(record.id, record);
        logger.info(`   📊 Engagement Score: ${engagementAnalysis.score}, Level: ${engagementAnalysis.level}`);

        // Update with engagement data
        logger.info(`   💾 Updating attendance record with engagement data...`);
        const updated = await prisma.attendanceRecord.update({
          where: { id: record.id },
          data: {
            // @ts-ignore
            metadata: {
              ...(record.metadata as any || {}),
              engagementScore: engagementAnalysis.score,
              engagementLevel: engagementAnalysis.level,
              engagementFlags: engagementAnalysis.flags,
              meetingStillActive: false, // Mark as no longer active
              finalizedAt: now.toISOString(),
              finalizedBy: 'AUTO_FINALIZATION',
            },
          },
          // @ts-ignore
          select: {
            id: true,
            participantId: true,
            externalMeetingId: true,
            meetingDate: true,
            joinTime: true,
            leaveTime: true,
            totalDurationMin: true,
            attendancePercent: true,
            status: true,
            metadata: true,
          },
        });

        // Run fraud detection
        logger.info(`   🔍 Running fraud detection...`);
        const fraudResult = await runFraudDetection(updated, { externalMeeting: record.externalMeeting });
        
        logger.info(`   🔍 Fraud detection complete:`, {
          riskScore: fraudResult.riskScore,
          recommendation: fraudResult.recommendation,
          violations: fraudResult.violations.length,
          reasons: fraudResult.reasons,
        });

        // Create immutable ledger block
        logger.info(`   🔐 Creating blockchain ledger block...`);
        try {
          // @ts-ignore
          const previousBlocks = await prisma.attendanceRecord.findMany({
            where: {
              participantId: record.participantId,
              status: 'COMPLETED',
              id: { not: record.id },
            },
            orderBy: { meetingDate: 'desc' },
            take: 1,
            // @ts-ignore
            select: { metadata: true },
          });
          
          const previousHash = (previousBlocks[0] as any)?.metadata?.['blockHash'] || '0';
          const ledgerBlock = createAttendanceBlock(updated, previousHash);
          
          // Store block hash in metadata
          await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
              // @ts-ignore
              metadata: Object.assign(
                {},
                (updated as any).metadata || {},
                {
                  blockHash: ledgerBlock.hash,
                  blockSignature: ledgerBlock.signature,
                  fraudRiskScore: fraudResult.riskScore,
                  fraudRecommendation: fraudResult.recommendation,
                }
              ),
            },
          });
          
          logger.info(`   🔐 Ledger block created successfully`);
        } catch (error: any) {
          logger.error(`   ❌ Failed to create ledger block: ${error.message}`);
        }

        // Generate court card (if not auto-rejected)
        logger.info(`   📄 Checking if court card should be generated...`);
        let courtCard = record.courtCard;
        
        if (shouldAutoReject(fraudResult)) {
          // Auto-reject fraudulent attendance
          logger.info(`   ❌ AUTO-REJECTING due to fraud detection`);
          await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
              isValid: false,
              // @ts-ignore
              metadata: Object.assign(
                {},
                (updated as any).metadata || {},
                {
                  rejectionReason: fraudResult.reasons.join('; '),
                  autoRejected: true,
                }
              ),
            },
          });
          
          logger.warn(`   ❌ Attendance ${record.id} auto-rejected due to fraud detection`);
        } else {
          // Generate court card if it doesn't exist
          logger.info(`   📄 Proceeding with court card generation...`);
          if (!courtCard) {
            try {
              logger.info(`   📄 Calling generateCourtCard()...`);
              courtCard = await generateCourtCard(record.id);
              logger.info(`   ✅ Court Card generated successfully: ${courtCard.cardNumber}`);
              
              // Queue daily digest for Court Rep
              if (record.courtRepId) {
                logger.info(`   📧 Queuing daily digest for Court Rep ${record.courtRepId}...`);
                await queueDailyDigest(record.courtRepId, [record.id]);
                logger.info(`   📧 Daily digest queued successfully`);
              }
            } catch (error: any) {
              logger.error(`   ❌ Failed to generate Court Card: ${error.message}`);
              logger.error(`   ❌ Error stack: ${error.stack}`);
              throw error; // Re-throw to catch in outer block
            }
          } else {
            logger.info(`   ℹ️ Court card already exists: ${courtCard.cardNumber}`);
          }
        }

        finalizedCount++;
        logger.info(`   ✅ Successfully finalized attendance record ${record.id}`);

      } catch (error: any) {
        logger.error(`   ❌ EXCEPTION while finalizing record ${record.id}:`);
        logger.error(`   ❌ Error message: ${error.message}`);
        logger.error(`   ❌ Error stack: ${error.stack}`);
      }
    }

    logger.info('========================================');
    logger.info(`📊 FINALIZATION SUMMARY:`);
    logger.info(`   Total records found: ${pendingRecords.length}`);
    logger.info(`   Successfully finalized: ${finalizedCount}`);
    logger.info(`   Failed: ${pendingRecords.length - finalizedCount}`);
    logger.info('========================================\n');

  } catch (error: any) {
    logger.error('========================================');
    logger.error('❌ CRITICAL ERROR in finalizePendingMeetings:');
    logger.error(`   Message: ${error.message}`);
    logger.error(`   Stack: ${error.stack}`);
    logger.error('========================================\n');
    throw error;
  }
}

/**
 * Start the finalization scheduler
 * Runs every 5 minutes to check for meetings that need finalization
 */
export function startMeetingFinalizationScheduler(): void {
  logger.info('========================================');
  logger.info('🚀 STARTING MEETING FINALIZATION SCHEDULER');
  logger.info('   Interval: Every 5 minutes');
  logger.info('   First run: Immediately');
  logger.info('========================================\n');
  
  // Run immediately on startup
  logger.info('⏱️  Running initial finalization check...');
  finalizePendingMeetings().catch(err => {
    logger.error('❌ Initial finalization check failed:', err);
  });
  
  // Then run every 5 minutes
  const intervalId = setInterval(() => {
    logger.info('⏱️  Running scheduled finalization check (every 5 min)...');
    finalizePendingMeetings().catch(err => {
      logger.error('❌ Scheduled finalization check failed:', err);
    });
  }, 5 * 60 * 1000); // 5 minutes
  
  logger.info(`✅ Scheduler started successfully (Interval ID: ${intervalId})\n`);
}

