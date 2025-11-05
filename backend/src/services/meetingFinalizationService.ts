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

    // STEP 1: Auto-complete stale IN_PROGRESS meetings
    // These are meetings where participant never clicked "leave" but the meeting ended
    logger.info('🔧 STEP 1: Checking for stale IN_PROGRESS meetings...');
    const staleRecords = await prisma.attendanceRecord.findMany({
      where: {
        status: 'IN_PROGRESS',
        // No time limit - check all IN_PROGRESS meetings to see if they should be completed
      },
      include: {
        externalMeeting: true,
      },
      // @ts-ignore - activityTimeline is a JSON field
      select: {
        id: true,
        participantId: true,
        externalMeetingId: true,
        meetingName: true,
        joinTime: true,
        leaveTime: true,
        totalDurationMin: true,
        activeDurationMin: true,
        idleDurationMin: true,
        attendancePercent: true,
        status: true,
        metadata: true,
        activityTimeline: true, // CRITICAL: Need timeline to determine actual leave time
        externalMeeting: {
          select: {
            id: true,
            durationMinutes: true,
            name: true,
          },
        },
      },
    });

    logger.info(`   Found ${staleRecords.length} IN_PROGRESS records to check`);

    for (const record of staleRecords) {
      try {
        const meetingStartTime = record.joinTime;
        const meetingDuration = record.externalMeeting?.durationMinutes || 60;
        const meetingEndTime = new Date(meetingStartTime.getTime() + meetingDuration * 60 * 1000);
        const now = new Date();
        const gracePeriod = 1 * 60 * 1000; // 1 minute grace period (reduced for faster processing)

        if (now.getTime() > (meetingEndTime.getTime() + gracePeriod)) {
          // Meeting ended more than 1 minute ago - auto-complete it
          // CRITICAL FIX: Use actual last activity time, NOT scheduled end time
          const timeline = (record.activityTimeline as any)?.events || [];
          
          // Find the last activity event (ACTIVE or IDLE, not just any event)
          const activityEvents = timeline.filter((e: any) => 
            e.source === 'FRONTEND_MONITOR' && (e.type === 'ACTIVE' || e.type === 'IDLE')
          );
          
          let leaveTime: Date;
          let totalDurationMinutes: number;
          
          if (activityEvents.length > 0) {
            // Use last activity timestamp as leave time (most accurate)
            const lastActivityTimestamp = new Date(activityEvents[activityEvents.length - 1].timestamp);
            // Add 30 seconds buffer (one heartbeat interval) to account for time between last heartbeat and actual leave
            leaveTime = new Date(lastActivityTimestamp.getTime() + 30 * 1000);
            totalDurationMinutes = Math.floor((leaveTime.getTime() - record.joinTime.getTime()) / (1000 * 60));
            
            logger.info(`   🔄 Auto-completing stale record: ${record.id}`);
            logger.info(`      Meeting: ${record.meetingName}`);
            logger.info(`      Join: ${record.joinTime.toISOString()}`);
            logger.info(`      Last Activity: ${lastActivityTimestamp.toISOString()}`);
            logger.info(`      Calculated Leave Time: ${leaveTime.toISOString()}`);
            logger.info(`      Actual Duration: ${totalDurationMinutes} minutes (NOT scheduled ${meetingDuration} minutes)`);
          } else {
            // No activity data - use join time + 1 minute as conservative estimate
            // This should rarely happen, but if it does, we assume minimal attendance
            leaveTime = new Date(record.joinTime.getTime() + 1 * 60 * 1000); // 1 minute conservative estimate
            totalDurationMinutes = 1;
            
            logger.warn(`   ⚠️ Auto-completing stale record ${record.id} with NO activity data - using conservative 1 min estimate`);
            logger.warn(`      Join: ${record.joinTime.toISOString()}`);
            logger.warn(`      Estimated Leave Time: ${leaveTime.toISOString()} (1 min after join)`);
          }
          
          const expectedDuration = meetingDuration;
          const attendancePercent = Math.min((totalDurationMinutes / expectedDuration) * 100, 100);
          
          // Calculate active vs idle time from activity timeline
          const { calculateActivityDurations } = await import('../routes/zoom-webhooks');
          const { activeDurationMin, idleDurationMin } = calculateActivityDurations({ events: timeline });
          
          // Use calculated active duration, or fallback to total duration if no activity data
          const finalActiveDuration = activeDurationMin > 0 ? activeDurationMin : totalDurationMinutes;
          const finalIdleDuration = idleDurationMin > 0 ? idleDurationMin : 0;

          await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
              status: 'COMPLETED',
              leaveTime,
              totalDurationMin: totalDurationMinutes,
              activeDurationMin: finalActiveDuration,
              idleDurationMin: finalIdleDuration,
              attendancePercent,
              // @ts-ignore
              metadata: Object.assign(
                {},
                (record.metadata as any) || {},
                {
                  autoCompleted: true,
                  autoCompletedAt: now.toISOString(),
                  reason: activityEvents.length > 0 
                    ? 'User did not manually leave - auto-completed using last activity timestamp' 
                    : 'User did not manually leave - auto-completed with no activity data (conservative estimate)',
                  calculatedFromLastActivity: activityEvents.length > 0,
                  lastActivityTimestamp: activityEvents.length > 0 ? activityEvents[activityEvents.length - 1].timestamp : null,
                }
              ),
            },
          });

          logger.info(`   ✅ Auto-completed record ${record.id} - Duration: ${totalDurationMinutes} min (${attendancePercent.toFixed(1)}%)`);
        } else {
          const minutesRemaining = Math.ceil((meetingEndTime.getTime() + gracePeriod - now.getTime()) / (1000 * 60));
          logger.info(`   ⏳ Record ${record.id} still within grace period (${minutesRemaining} min remaining)`);
        }
      } catch (error: any) {
        logger.error(`   ❌ Failed to auto-complete record ${record.id}: ${error.message}`);
      }
    }

    logger.info('✅ STEP 1 Complete: Stale meetings processed');
    logger.info('');

    // STEP 2: Find all COMPLETED attendance records without court cards from the last 48 hours
    // These are meetings where participants left early and we're waiting for the window to end
    const twentyFourHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000); // Extended to 48h for testing
    
    logger.info('🔍 STEP 2: Processing COMPLETED meetings for court card generation...');
    logger.info(`📅 Searching for meetings from: ${twentyFourHoursAgo.toISOString()}`);
    logger.info(`🔎 Query filters: status=COMPLETED, courtCard=null, isValid!=false, meetingDate >= 24h ago`);
    
    const pendingRecords = await prisma.attendanceRecord.findMany({
      where: {
        status: 'COMPLETED', // Only completed (not rejected)
        courtCard: null, // No court card generated yet
        isValid: { not: false }, // Exclude already-rejected records
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
            activityTimeline: true, // CRITICAL: Include timeline for fraud detection!
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
              isValid: false, // Mark as invalid to prevent re-processing
              // status stays 'COMPLETED' for reporting purposes
              // @ts-ignore
              metadata: Object.assign(
                {},
                (updated as any).metadata || {},
                {
                  rejectionReason: fraudResult.reasons.join('; '),
                  autoRejected: true,
                  finalizedAt: now.toISOString(),
                  finalizedBy: 'AUTO_REJECTION',
                }
              ),
            },
          });
          
          logger.warn(`   ❌ Attendance ${record.id} auto-rejected (isValid=false) - will not re-process`);
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
 * Runs every 2 minutes to check for meetings that need finalization
 */
export function startMeetingFinalizationScheduler(): void {
  logger.info('========================================');
  logger.info('🚀 STARTING MEETING FINALIZATION SCHEDULER');
  logger.info('   Interval: Every 2 minutes');
  logger.info('   First run: Immediately');
  logger.info('========================================\n');
  
  // Run immediately on startup
  logger.info('⏱️  Running initial finalization check...');
  finalizePendingMeetings().catch(err => {
    logger.error('❌ Initial finalization check failed:', err);
  });
  
  // Then run every 2 minutes (more frequent for faster processing)
  const intervalId = setInterval(() => {
    logger.info('⏱️  Running scheduled finalization check (every 2 min)...');
    finalizePendingMeetings().catch(err => {
      logger.error('❌ Scheduled finalization check failed:', err);
    });
  }, 2 * 60 * 1000); // 2 minutes
  
  logger.info(`✅ Scheduler started successfully (Interval ID: ${intervalId})\n`);
}

