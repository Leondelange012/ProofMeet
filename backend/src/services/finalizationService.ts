import { prisma } from '../index';
import { logger } from '../utils/logger';
import {
  calculateActiveDuration,
  getLastActivityTimestamp,
  calculateEngagementMetrics,
  ActivityEvent,
} from './activityTrackingService';
import { generateCourtCard } from './courtCardService';
import { queueDailyDigest } from './emailService';

/**
 * Grace period for stale meetings (in minutes)
 * Meetings without activity for this long will be auto-completed
 */
const STALE_MEETING_GRACE_PERIOD_MIN = 15;

/**
 * Finalize a single attendance record
 */
async function finalizeAttendanceRecord(attendanceId: string): Promise<boolean> {
  try {
    logger.info(`🔄 Processing record: ${attendanceId}`);

    const attendance = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceId },
      include: {
        externalMeeting: true,
        participant: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!attendance) {
      logger.warn(`Attendance record not found: ${attendanceId}`);
      return false;
    }

    logger.info(`   Meeting: ${attendance.meetingName}`);
    logger.info(`   Participant: ${attendance.participant.email}`);

    const joinTime = attendance.joinTime;
    const activityTimeline = (attendance.activityTimeline as unknown as ActivityEvent[]) || [];
    
    // ============================================
    // ZOOM-ONLY TRACKING: Use Zoom webhook data (PRIMARY SOURCE OF TRUTH)
    // ============================================
    // ProofMeet does NOT require the browser tab to be open.
    // All attendance tracking is done via Zoom webhooks:
    //   - participant_joined: records join time
    //   - participant_left: records leave time AND duration from Zoom
    // 
    // This finalization service only runs as a BACKUP for meetings where:
    //   - Zoom webhooks didn't fire (rare)
    //   - Meeting ended but participant never explicitly left
    const meetingStart = new Date(attendance.meetingDate);
    const meetingDuration = attendance.externalMeeting?.durationMinutes || 60;
    const meetingEnd = new Date(
      meetingStart.getTime() + meetingDuration * 60 * 1000
    );

    let leaveTime: Date;
    if (attendance.leaveTime) {
      // Use Zoom-provided leave time (most accurate - includes Zoom's duration calculation)
      leaveTime = attendance.leaveTime;
      logger.info(`   ✅ Using Zoom webhook leave time: ${leaveTime.toISOString()}`);
      if (attendance.totalDurationMin) {
        logger.info(`   ✅ Zoom reported duration: ${attendance.totalDurationMin} minutes`);
      }
    } else {
      // BACKUP: No Zoom webhook received yet (this should be rare)
      // Wait for Zoom webhook instead of guessing
      logger.warn(`   ⚠️ No Zoom leave time yet - meeting may still be in progress`);
      logger.warn(`   ⚠️ This record will be processed when Zoom webhook arrives`);
      return false; // Don't finalize yet, wait for Zoom
    }

    logger.info(`   Join Time: ${joinTime.toISOString()}`);
    logger.info(`   Leave Time: ${leaveTime.toISOString()}`);

    // Calculate actual duration from Zoom timestamps
    const totalDurationMin = Math.floor(
      (leaveTime.getTime() - joinTime.getTime()) / (1000 * 60)
    );
    
    // For Zoom-only tracking, all time in meeting is considered active
    const activeDurationMin = totalDurationMin;
    const idleDurationMin = 0;

    logger.info(`   Actual Duration: ${totalDurationMin} minutes (${meetingDuration} minutes scheduled)`);

    // Calculate engagement metrics (optional, for additional context)
    const engagementMetrics = calculateEngagementMetrics(
      activityTimeline,
      totalDurationMin
    );

    logger.info(
      `Optional activity data: ${engagementMetrics.mouseMovements + engagementMetrics.keyboardActivity} active events, ${engagementMetrics.idleEvents} idle events`
    );

    // Calculate attendance percentage based on actual Zoom duration
    const attendancePercent = Math.min(
      (totalDurationMin / meetingDuration) * 100,
      100
    );

    // Update attendance record
    const updated = await prisma.attendanceRecord.update({
      where: { id: attendanceId },
      data: {
        leaveTime,
        totalDurationMin,
        activeDurationMin,
        idleDurationMin,
        attendancePercent,
        status: 'COMPLETED',
        verificationMethod: 'ZOOM_WEBHOOK', // Changed from SCREEN_ACTIVITY
      },
    });

    logger.info(
      `   ✅ Auto-completed record ${attendanceId} - Duration: ${totalDurationMin} min (${attendancePercent.toFixed(1)}%)`
    );

    // Run engagement analysis (from logs, this seems to exist)
    // For now, we'll use the engagement metrics we calculated
    const engagementAnalysis = {
      flags: [] as string[],
      recommendation: engagementMetrics.engagementScore >= 80 ? 'APPROVE' : engagementMetrics.engagementScore >= 60 ? 'REVIEW' : 'FLAG',
      score: engagementMetrics.engagementScore,
    };

    logger.info(`   📊 Engagement Score: ${engagementMetrics.engagementScore}, Level: ${engagementMetrics.engagementScore >= 80 ? 'HIGH' : engagementMetrics.engagementScore >= 60 ? 'MEDIUM' : 'LOW'}`);

    // Update with engagement data
    await prisma.attendanceRecord.update({
      where: { id: attendanceId },
      data: {
        flags: {
          engagementScore: engagementMetrics.engagementScore,
          activityRate: engagementMetrics.activityRate,
          mouseMovements: engagementMetrics.mouseMovements,
          keyboardActivity: engagementMetrics.keyboardActivity,
          recommendation: engagementAnalysis.recommendation,
        } as any,
      },
    });

    // Run fraud detection (simplified - should check for webhook data, etc.)
    const fraudDetection = {
      violations: [] as string[],
      recommendation: 'APPROVE' as 'APPROVE' | 'FLAG_FOR_REVIEW' | 'REJECT',
      riskScore: 0,
      reasons: [] as string[],
    };

    // Check for missing verification data (as seen in logs)
    if (!attendance.verificationMethod) {
      fraudDetection.violations.push('MISSING_VERIFICATION_DATA');
      fraudDetection.recommendation = 'FLAG_FOR_REVIEW';
      fraudDetection.riskScore += 15;
      fraudDetection.reasons.push('No Zoom webhook data received');
    }

    // Check for excessive idle time (only if idle time > 30% of total)
    if (durationCalc.idleDurationMin > durationCalc.totalDurationMin * 0.3) {
      fraudDetection.violations.push('EXCESSIVE_IDLE_TIME');
      fraudDetection.recommendation = 'FLAG_FOR_REVIEW';
      fraudDetection.riskScore += 10;
      fraudDetection.reasons.push(`Idle time: ${durationCalc.idleDurationMin} min (${((durationCalc.idleDurationMin / durationCalc.totalDurationMin) * 100).toFixed(1)}%)`);
    }

    // BUT: If engagement score is high, override the idle time flag
    if (engagementMetrics.engagementScore >= 90 && fraudDetection.violations.includes('EXCESSIVE_IDLE_TIME')) {
      fraudDetection.violations = fraudDetection.violations.filter(v => v !== 'EXCESSIVE_IDLE_TIME');
      fraudDetection.riskScore = Math.max(0, fraudDetection.riskScore - 10);
      if (fraudDetection.violations.length === 0 && fraudDetection.riskScore < 15) {
        fraudDetection.recommendation = 'APPROVE';
      }
    }

    logger.info(`   🔍 Fraud detection complete: ${JSON.stringify(fraudDetection)}`);

    // Generate court card
    logger.info(`   📄 Checking if court card should be generated...`);
    
    // Check if meeting window has ended
    const currentTime = new Date();
    const timeUntilEnd = meetingEnd.getTime() - currentTime.getTime();
    const hasEnded = timeUntilEnd <= 0;

    if (hasEnded) {
      logger.info(`   📄 Proceeding with court card generation...`);
      logger.info(`   📄 Calling generateCourtCard()...`);

      try {
        const courtCard = await generateCourtCard(attendanceId);
        
        // Validate court card (check for violations)
        const isValid = fraudDetection.violations.length === 0 || 
                       (fraudDetection.violations.length === 1 && 
                        fraudDetection.violations[0] === 'MISSING_VERIFICATION_DATA' &&
                        engagementMetrics.engagementScore >= 90);

        if (!isValid && courtCard) {
          await prisma.courtCard.update({
            where: { id: courtCard.id },
            data: {
              validationStatus: 'FAILED',
              violations: fraudDetection.violations as any,
            },
          });
          logger.warn(`Court Card ${courtCard.cardNumber} FAILED validation. Violations: ${fraudDetection.violations.join(', ')}`);
        } else if (courtCard) {
          await prisma.courtCard.update({
            where: { id: courtCard.id },
            data: {
              validationStatus: 'PASSED',
            },
          });
        }

        logger.info(`   ✅ Court Card generated successfully: ${courtCard?.cardNumber || 'N/A'}`);
      } catch (error: any) {
        logger.error(`   ❌ Court Card generation failed:`, error);
      }
    } else {
      logger.info(`   ⏳ Meeting window not ended yet (${Math.round(timeUntilEnd / 1000 / 60)} minutes remaining)`);
    }

    // Queue daily digest
    logger.info(`   📧 Queuing daily digest for Court Rep ${attendance.courtRepId}...`);
    try {
      await queueDailyDigest(attendance.courtRepId, [attendanceId]);
      logger.info(`   📧 Daily digest queued successfully`);
    } catch (error: any) {
      logger.error(`   ❌ Failed to queue daily digest:`, error);
    }

    logger.info(`   ✅ Successfully finalized attendance record ${attendanceId}`);
    return true;
  } catch (error: any) {
    logger.error(`Error finalizing attendance record ${attendanceId}:`, error);
    return false;
  }
}

/**
 * Check for stale IN_PROGRESS meetings and finalize them
 */
export async function finalizeStaleMeetings(): Promise<{
  checked: number;
  finalized: number;
  failed: number;
}> {
  try {
    logger.info('========================================');
    logger.info('🔍 FINALIZATION CHECK STARTED');
    logger.info(`⏰ Current time: ${new Date().toISOString()}`);
    logger.info('========================================');

    // Step 1: Check for stale IN_PROGRESS meetings
    logger.info('🔧 STEP 1: Checking for stale IN_PROGRESS meetings...');

    const staleThreshold = new Date();
    staleThreshold.setMinutes(
      staleThreshold.getMinutes() - STALE_MEETING_GRACE_PERIOD_MIN
    );

    const staleMeetings = await prisma.attendanceRecord.findMany({
      where: {
        status: 'IN_PROGRESS',
        updatedAt: {
          lte: staleThreshold, // No activity for grace period
        },
      },
      include: {
        externalMeeting: true,
      },
    });

    logger.info(`   Found ${staleMeetings.length} IN_PROGRESS records to check`);

    let finalized = 0;
    let failed = 0;

    for (const meeting of staleMeetings) {
      // Check if meeting end time has passed
      const meetingStart = new Date(meeting.meetingDate);
      const meetingDuration = meeting.externalMeeting?.durationMinutes || 60;
      const meetingEnd = new Date(
        meetingStart.getTime() + meetingDuration * 60 * 1000
      );
      const currentTime = new Date();

      if (currentTime >= meetingEnd) {
        // Meeting has ended, finalize it
        logger.info(`   🔄 Auto-completing stale record: ${meeting.id}`);
        logger.info(`       Meeting: ${meeting.meetingName}`);
        logger.info(`       Join: ${meeting.joinTime.toISOString()}`);
        
        // Check if Zoom webhook already provided leave time
        if (meeting.leaveTime) {
          logger.info(`       ✅ Leave time from Zoom webhook: ${meeting.leaveTime.toISOString()}`);
        } else {
          logger.warn(`       ⚠️ No Zoom webhook received - will use conservative estimate`);
        }

        const success = await finalizeAttendanceRecord(meeting.id);
        if (success) {
          finalized++;
        } else {
          failed++;
        }
      } else {
        // Still within grace period or meeting hasn't ended
        const minutesRemaining = Math.floor(
          (meetingEnd.getTime() - currentTime.getTime()) / (1000 * 60)
        );
        logger.info(
          `   ⏳ Record ${meeting.id} still within grace period (${minutesRemaining} min remaining)`
        );
      }
    }

    logger.info('✅ STEP 1 Complete: Stale meetings processed');
    logger.info('');

    // Step 2: Process COMPLETED meetings for court card generation
    logger.info('🔍 STEP 2: Processing COMPLETED meetings for court card generation...');

    // Find meetings that ended more than 1 minute ago but don't have court cards
    const oneMinuteAgo = new Date();
    oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const completedMeetings = await prisma.attendanceRecord.findMany({
      where: {
        status: 'COMPLETED',
        courtCardGenerated: false,
        isValid: { not: false },
        meetingDate: { gte: oneDayAgo },
        leaveTime: { lte: oneMinuteAgo }, // Ended at least 1 minute ago
      },
      include: {
        externalMeeting: true,
      },
    });

    logger.info(`📅 Searching for meetings from: ${oneDayAgo.toISOString()}`);
    logger.info(`🔎 Query filters: status=COMPLETED, courtCard=null, isValid!=false, meetingDate >= 24h ago`);
    logger.info(`📊 Query returned: ${completedMeetings.length} records`);

    if (completedMeetings.length === 0) {
      logger.info('✅ No pending meetings to finalize');
      logger.info('========================================');
      logger.info('');
      return { checked: staleMeetings.length, finalized, failed };
    }

    logger.info(`📋 Found ${completedMeetings.length} pending attendance records to check:`);
    for (const meeting of completedMeetings) {
      logger.info(
        `   ${completedMeetings.indexOf(meeting) + 1}. ID: ${meeting.id}, Meeting: ${meeting.meetingName}, Date: ${meeting.meetingDate}, Status: ${meeting.status}`
      );
    }

    for (const meeting of completedMeetings) {
      logger.info('----------------------------------------');
      logger.info(`🔄 Processing record: ${meeting.id}`);
      logger.info(`   Meeting: ${meeting.meetingName}`);
      logger.info(`   Participant: ${meeting.participantId}`);
      logger.info(`   Join Time: ${meeting.joinTime.toISOString()}`);

      if (meeting.leaveTime) {
        logger.info(`   Leave Time: ${meeting.leaveTime.toISOString()}`);
      }

      const meetingStart = new Date(meeting.meetingDate);
      const meetingDuration = meeting.externalMeeting?.durationMinutes || 60;
      const meetingEnd = new Date(
        meetingStart.getTime() + meetingDuration * 60 * 1000
      );
      const currentTime = new Date();

      logger.info(`   Meeting Start: ${meetingStart.toISOString()}`);
      logger.info(`   Meeting Duration: ${meetingDuration} minutes`);
      logger.info(`   Meeting End: ${meetingEnd.toISOString()}`);
      logger.info(`   Current Time: ${currentTime.toISOString()}`);
      logger.info(
        `   Time Until End: ${Math.round((meetingEnd.getTime() - currentTime.getTime()) / 1000 / 60)} minutes`
      );
      logger.info(`   Has Ended: ${currentTime >= meetingEnd}`);

      if (currentTime >= meetingEnd) {
        logger.info('   ✅ Meeting window has ended - proceeding with finalization');

        try {
          // Generate court card if not already generated
          if (!meeting.courtCardGenerated) {
            await generateCourtCard(meeting.id);
            logger.info(`   ✅ Court Card generated for ${meeting.id}`);
          }

          // Queue daily digest
          await queueDailyDigest(meeting.courtRepId, [meeting.id]);
          logger.info(`   ✅ Daily digest queued for Court Rep ${meeting.courtRepId}`);
        } catch (error: any) {
          logger.error(`   ❌ Error finalizing completed meeting ${meeting.id}:`, error);
        }
      }
    }

    logger.info('========================================');
    logger.info('📊 FINALIZATION SUMMARY:');
    logger.info(`   Total records found: ${staleMeetings.length + completedMeetings.length}`);
    logger.info(`   Successfully finalized: ${finalized}`);
    logger.info(`   Failed: ${failed}`);
    logger.info('========================================');
    logger.info('');

    return {
      checked: staleMeetings.length + completedMeetings.length,
      finalized,
      failed,
    };
  } catch (error: any) {
    logger.error('Error in finalizeStaleMeetings:', error);
    return { checked: 0, finalized: 0, failed: 0 };
  }
}

