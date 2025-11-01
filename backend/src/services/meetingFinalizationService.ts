/**
 * Meeting Finalization Service
 * Automatically finalizes attendance records and generates court cards
 * after meeting windows have ended
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { generateCourtCard } from './courtCardService';
import { analyzeAttendanceEngagement } from './engagementAnalysis';
import { runFraudDetection, shouldAutoReject, needsManualReview } from './fraudDetection';
import { createAttendanceBlock } from './cryptoService';
import { queueDailyDigest } from './emailService';

const prisma = new PrismaClient();

/**
 * Finalize all meetings that have ended their scheduled window
 * but haven't been finalized yet (participants left early)
 */
export async function finalizePendingMeetings(): Promise<void> {
  try {
    logger.info('🔍 Checking for meetings to finalize...');

    // Find all COMPLETED attendance records that are still in "temporary leave" state
    const pendingRecords = await prisma.attendanceRecord.findMany({
      where: {
        status: 'COMPLETED',
        // @ts-ignore - metadata field
        metadata: {
          path: ['meetingStillActive'],
          equals: true,
        },
      },
      include: {
        externalMeeting: true,
        courtCard: true,
      },
    });

    if (pendingRecords.length === 0) {
      logger.info('✅ No pending meetings to finalize');
      return;
    }

    logger.info(`📋 Found ${pendingRecords.length} pending attendance records to check`);

    let finalizedCount = 0;
    const now = new Date();

    for (const record of pendingRecords) {
      try {
        // Calculate meeting end time
        const meetingStartTime = record.joinTime;
        const meetingDuration = record.externalMeeting?.durationMinutes || 60;
        const meetingEndTime = new Date(meetingStartTime.getTime() + meetingDuration * 60 * 1000);

        // Check if meeting window has ended
        if (now <= meetingEndTime) {
          const minutesRemaining = Math.ceil((meetingEndTime.getTime() - now.getTime()) / (1000 * 60));
          logger.info(`⏳ Meeting ${record.externalMeetingId} still active (${minutesRemaining} min remaining)`);
          continue;
        }

        logger.info(`🔄 Finalizing attendance record ${record.id} for meeting ${record.meetingName}`);

        // Run engagement analysis
        const engagementAnalysis = await analyzeAttendanceEngagement(record.id, record);

        // Update with engagement data
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
        const fraudResult = await runFraudDetection(updated, { externalMeeting: record.externalMeeting });
        
        logger.info(`Fraud detection complete for ${record.id}:`, {
          riskScore: fraudResult.riskScore,
          recommendation: fraudResult.recommendation,
        });

        // Create immutable ledger block
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
          
          logger.info(`Immutable ledger block created for ${record.id}`);
        } catch (error: any) {
          logger.error(`Failed to create ledger block: ${error.message}`);
        }

        // Generate court card (if not auto-rejected)
        let courtCard = record.courtCard;
        
        if (shouldAutoReject(fraudResult)) {
          // Auto-reject fraudulent attendance
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
          
          logger.warn(`Attendance ${record.id} auto-rejected due to fraud detection`);
        } else {
          // Generate court card if it doesn't exist
          if (!courtCard) {
            try {
              courtCard = await generateCourtCard(record.id);
              logger.info(`Court Card generated: ${courtCard.cardNumber}`);
              
              // Queue daily digest for Court Rep
              if (record.courtRepId) {
                await queueDailyDigest(record.courtRepId, [record.id]);
                logger.info(`Queued daily digest for Court Rep ${record.courtRepId}`);
              }
            } catch (error: any) {
              logger.error(`Failed to generate Court Card: ${error.message}`);
            }
          }
        }

        finalizedCount++;
        logger.info(`✅ Successfully finalized attendance record ${record.id}`);

      } catch (error: any) {
        logger.error(`Failed to finalize record ${record.id}:`, error);
      }
    }

    logger.info(`✅ Finalized ${finalizedCount} of ${pendingRecords.length} pending meetings`);

  } catch (error: any) {
    logger.error('Error in finalizePendingMeetings:', error);
    throw error;
  }
}

/**
 * Start the finalization scheduler
 * Runs every 5 minutes to check for meetings that need finalization
 */
export function startMeetingFinalizationScheduler(): void {
  logger.info('🚀 Starting meeting finalization scheduler (runs every 5 minutes)');
  
  // Run immediately on startup
  finalizePendingMeetings().catch(err => {
    logger.error('Initial finalization check failed:', err);
  });
  
  // Then run every 5 minutes
  setInterval(() => {
    finalizePendingMeetings().catch(err => {
      logger.error('Scheduled finalization check failed:', err);
    });
  }, 5 * 60 * 1000); // 5 minutes
}

