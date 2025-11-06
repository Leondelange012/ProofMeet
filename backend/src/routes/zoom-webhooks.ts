/**
 * Zoom Webhooks Handler
 * Receives real-time events from Zoom to verify actual attendance
 * FULLY AUTOMATIC - No manual controls needed
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { generateCourtCard } from '../services/courtCardService';
import { sendAttendanceConfirmation, queueDailyDigest } from '../services/emailService';
import { websocketService } from '../services/websocketService';

const router = Router();

// Zoom webhook verification endpoint (GET request)
router.get('/zoom', (req: Request, res: Response) => {
  const challenge = req.query.challenge as string;
  
  if (challenge) {
    logger.info('📞 Zoom webhook verification request received');
    return res.status(200).json({ challenge });
  }
  
  return res.status(400).json({ error: 'No challenge parameter provided' });
});

// Zoom webhook events handler (POST request)
router.post('/zoom', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    
    logger.info(`📅 Zoom webhook event: ${event.event}`, {
      meetingId: event.payload?.object?.id,
      eventType: event.event,
    });
    
    // Handle different event types
    switch (event.event) {
      case 'meeting.started':
        await handleMeetingStarted(event);
        break;
        
      case 'meeting.ended':
        await handleMeetingEnded(event);
        break;
        
      case 'meeting.participant_joined':
        await handleParticipantJoined(event);
        break;
        
      case 'meeting.participant_left':
        await handleParticipantLeft(event);
        break;
        
      default:
        logger.warn(`⚠️ Unhandled Zoom event type: ${event.event}`);
    }
    
    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
    
  } catch (error: any) {
    logger.error('❌ Error processing Zoom webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Calculate active vs idle duration from activity timeline
 * Uses heartbeat events sent by frontend activity monitor
 */
export function calculateActivityDurations(activityTimeline: any): {
  activeDurationMin: number;
  idleDurationMin: number;
} {
  const events = activityTimeline?.events || [];
  
  // Count ACTIVE and IDLE events from frontend heartbeats
  const activeEvents = events.filter((e: any) => e.type === 'ACTIVE' && e.source === 'FRONTEND_MONITOR');
  const idleEvents = events.filter((e: any) => e.type === 'IDLE' && e.source === 'FRONTEND_MONITOR');
  
  // Each heartbeat represents approximately 30 seconds of activity
  const HEARTBEAT_DURATION_SECONDS = 30;
  
  const activeDurationMin = Math.floor((activeEvents.length * HEARTBEAT_DURATION_SECONDS) / 60);
  const idleDurationMin = Math.floor((idleEvents.length * HEARTBEAT_DURATION_SECONDS) / 60);
  
  logger.info(`Activity calculation: ${activeEvents.length} active events, ${idleEvents.length} idle events`);
  
  return { activeDurationMin, idleDurationMin };
}

/**
 * Handle meeting started event
 */
async function handleMeetingStarted(event: any) {
  const meetingId = event.payload.object.id.toString();
  const startTime = new Date(event.payload.object.start_time);
  
  logger.info(`🟢 Meeting started: ${meetingId}`, { startTime });
  
  // Find the external meeting
  const meeting = await prisma.externalMeeting.findFirst({
    where: { zoomId: meetingId },
  });
  
  if (meeting) {
    logger.info(`Found meeting in database: ${meeting.name}`);
  }
}

/**
 * Handle meeting ended event
 */
async function handleMeetingEnded(event: any) {
  const meetingId = event.payload.object.id.toString();
  const endTime = new Date(event.payload.object.end_time);
  
  logger.info(`🔴 Meeting ended: ${meetingId}`, { endTime });
  
  // Find all in-progress attendance records for this meeting
  const meeting = await prisma.externalMeeting.findFirst({
    where: { zoomId: meetingId },
  });
  
  if (meeting) {
    const inProgressRecords = await prisma.attendanceRecord.findMany({
      where: {
        externalMeetingId: meeting.id,
        status: 'IN_PROGRESS',
      },
    });
    
    // Auto-complete any records still in progress
    for (const record of inProgressRecords) {
      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          leaveTime: endTime,
          status: 'COMPLETED',
        },
      });
      
      logger.info(`Auto-completed attendance record for meeting end: ${record.id}`);
    }
  }
}

/**
 * Handle participant joined event
 */
async function handleParticipantJoined(event: any) {
  const meetingId = event.payload.object.id.toString();
  const participant = event.payload.object.participant;
  const joinTime = new Date(event.payload.object.participant.join_time);
  
  logger.info(`👋 Participant joined: ${participant.user_name}`, {
    email: participant.email,
    meetingId,
    joinTime,
  });
  
  // Find the meeting
  const meeting = await prisma.externalMeeting.findFirst({
    where: { zoomId: meetingId },
  });
  
  if (!meeting) {
    logger.warn(`Meeting not found in database: ${meetingId}`);
    return;
  }
  
  // Find participant by email
  const user = await prisma.user.findFirst({
    where: {
      email: participant.email?.toLowerCase(),
      userType: 'PARTICIPANT',
    },
  });
  
  if (!user) {
    logger.warn(`Participant not found in database: ${participant.email}`);
    return;
  }
  
  // Check if there's an existing attendance record
  let attendanceRecord = await prisma.attendanceRecord.findFirst({
    where: {
      participantId: user.id,
      externalMeetingId: meeting.id,
      status: 'IN_PROGRESS',
    },
  });
  
  if (attendanceRecord) {
    // Update existing record with REAL join time from Zoom
    await prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: {
        joinTime,
        activityTimeline: {
          events: [
            {
              type: 'ZOOM_JOINED',
              timestamp: joinTime.toISOString(),
              source: 'ZOOM_WEBHOOK',
              data: {
                participantName: participant.user_name,
                participantEmail: participant.email,
                zoomUserId: participant.user_id,
              },
            },
          ],
        },
      },
    });
    
    logger.info(`✅ Updated attendance record with Zoom join time: ${attendanceRecord.id}`);
  } else {
    // Create new attendance record if participant joined directly via Zoom
    if (user.courtRepId) {
      attendanceRecord = await prisma.attendanceRecord.create({
        data: {
          participantId: user.id,
          courtRepId: user.courtRepId,
          externalMeetingId: meeting.id,
          meetingName: meeting.name,
          meetingProgram: meeting.program,
          meetingDate: new Date(),
          joinTime,
          status: 'IN_PROGRESS',
          verificationMethod: 'SCREEN_ACTIVITY',
          activityTimeline: {
            events: [
              {
                type: 'ZOOM_JOINED',
                timestamp: joinTime.toISOString(),
                source: 'ZOOM_WEBHOOK',
                data: {
                  participantName: participant.user_name,
                  participantEmail: participant.email,
                },
              },
            ],
          },
        },
      });
      
      logger.info(`✅ Created attendance record from Zoom join: ${attendanceRecord.id}`);
      
      // Send WebSocket notification
      websocketService.notifyParticipantJoined(meetingId, user.id, user.courtRepId);
    }
  }
  
  // Send WebSocket notification if attendance record exists
  if (attendanceRecord && user.courtRepId) {
    websocketService.notifyParticipantJoined(meetingId, user.id, user.courtRepId);
  }
}

/**
 * Handle participant left event
 */
async function handleParticipantLeft(event: any) {
  const meetingId = event.payload.object.id.toString();
  const participant = event.payload.object.participant;
  const leaveTime = new Date(event.payload.object.participant.leave_time);
  
  logger.info(`👋 Participant left: ${participant.user_name}`, {
    email: participant.email,
    meetingId,
    leaveTime,
  });
  
  // Find the meeting
  const meeting = await prisma.externalMeeting.findFirst({
    where: { zoomId: meetingId },
  });
  
  if (!meeting) {
    logger.warn(`Meeting not found in database: ${meetingId}`);
    return;
  }
  
  // Find participant by email
  const user = await prisma.user.findFirst({
    where: {
      email: participant.email?.toLowerCase(),
      userType: 'PARTICIPANT',
    },
  });
  
  if (!user) {
    logger.warn(`Participant not found in database: ${participant.email}`);
    return;
  }
  
  // Find the in-progress attendance record
  const attendanceRecord = await prisma.attendanceRecord.findFirst({
    where: {
      participantId: user.id,
      externalMeetingId: meeting.id,
      status: 'IN_PROGRESS',
    },
  });
  
  if (attendanceRecord) {
    const duration = Math.floor((leaveTime.getTime() - attendanceRecord.joinTime.getTime()) / (1000 * 60));
    const expectedDuration = meeting.durationMinutes || 60;
    const attendancePercent = Math.min((duration / expectedDuration) * 100, 100);
    
    // Get existing activity timeline
    const existingTimeline = attendanceRecord.activityTimeline as any || { events: [] };
    const events = existingTimeline.events || [];
    
    // Add leave event
    events.push({
      type: 'ZOOM_LEFT',
      timestamp: leaveTime.toISOString(),
      source: 'ZOOM_WEBHOOK',
      data: {
        participantName: participant.user_name,
        duration: `${participant.duration} seconds`,
      },
    });
    
    // Calculate active vs idle time from activity timeline
    const { activeDurationMin, idleDurationMin } = calculateActivityDurations({ events });
    
    // If no activity heartbeats received, assume all time was active (fallback)
    const finalActiveDuration = activeDurationMin > 0 ? activeDurationMin : duration;
    const finalIdleDuration = idleDurationMin > 0 ? idleDurationMin : 0;
    
    // Update attendance record with REAL leave time from Zoom
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: {
        leaveTime,
        totalDurationMin: duration,
        activeDurationMin: finalActiveDuration,
        idleDurationMin: finalIdleDuration,
        attendancePercent,
        status: 'COMPLETED',
        verificationMethod: 'BOTH', // Zoom + Activity monitoring
        activityTimeline: { events },
      },
    });
    
    logger.info(`✅ Attendance completed via Zoom webhook: ${attendanceRecord.id}`, {
      duration,
      activeDuration: finalActiveDuration,
      idleDuration: finalIdleDuration,
      attendancePercent,
    });
    
    // ========================================
    // AUTOMATIC COURT CARD GENERATION
    // ========================================
    try {
      const courtCard = await generateCourtCard(updatedRecord.id);
      logger.info(`🎫 Court Card auto-generated: ${courtCard.cardNumber}`, {
        status: courtCard.validationStatus,
        violations: (courtCard.violations as any[]).filter((v: any) => v.severity === 'CRITICAL').length,
      });
      
      // Send confirmation email to participant
      try {
        await sendAttendanceConfirmation(
          user.email,
          meeting.name,
          duration,
          Number(attendancePercent),
          courtCard.cardNumber
        );
        logger.info(`📧 Confirmation email sent to ${user.email}`);
      } catch (emailError: any) {
        logger.error(`Failed to send confirmation email: ${emailError.message}`);
      }
      
      // Send WebSocket notifications
      if (user.courtRepId) {
        websocketService.notifyParticipantLeft(meetingId, user.id, user.courtRepId, duration);
        websocketService.notifyAttendanceUpdated(user.id, user.courtRepId, {
          attendanceRecordId: updatedRecord.id,
          status: 'COMPLETED',
          duration,
          attendancePercent,
        });
        websocketService.notifyCourtCardUpdated(user.id, user.courtRepId, {
          courtCardId: courtCard.id,
          cardNumber: courtCard.cardNumber,
          validationStatus: courtCard.validationStatus,
        });
      }
      
      // Queue daily digest for Court Rep
      if (user.courtRepId) {
        try {
          await queueDailyDigest(user.courtRepId, [updatedRecord.id]);
          logger.info(`📬 Queued daily digest for Court Rep ${user.courtRepId}`);
        } catch (digestError: any) {
          logger.error(`Failed to queue daily digest: ${digestError.message}`);
        }
      }
      
      // Log warnings if validation failed
      if (courtCard.validationStatus === 'FAILED') {
        const criticalViolations = (courtCard.violations as any[])
          .filter((v: any) => v.severity === 'CRITICAL')
          .map((v: any) => v.type)
          .join(', ');
        
        logger.warn(`⚠️ Attendance FAILED validation: ${courtCard.cardNumber}`, {
          participant: user.email,
          meeting: meeting.name,
          violations: criticalViolations,
        });
      }
      
    } catch (cardError: any) {
      logger.error(`❌ Failed to generate Court Card: ${cardError.message}`, {
        attendanceId: updatedRecord.id,
        participant: user.email,
      });
    }
  }
}

export { router as zoomWebhookRoutes };

