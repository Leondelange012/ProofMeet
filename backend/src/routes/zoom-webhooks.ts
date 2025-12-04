/**
 * Zoom Webhooks Handler
 * Receives real-time events from Zoom to verify actual attendance
 * FULLY AUTOMATIC - No manual controls needed
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { generateCourtCard } from '../services/courtCardService';
import { sendAttendanceConfirmation, queueDailyDigest } from '../services/emailService';
import { websocketService } from '../services/websocketService';

const router = Router();

// Zoom webhook secret token for validation (from Zoom app settings)
const ZOOM_WEBHOOK_SECRET = process.env.ZOOM_WEBHOOK_SECRET || '';

// Zoom webhook verification endpoint (GET request - legacy method)
router.get('/zoom', (req: Request, res: Response) => {
  const challenge = req.query.challenge as string;
  
  if (challenge) {
    logger.info('📞 Zoom webhook verification request received (GET/legacy)');
    return res.status(200).json({ challenge });
  }
  
  return res.status(400).json({ error: 'No challenge parameter provided' });
});

// Zoom webhook events handler (POST request)
router.post('/zoom', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    
    // Handle Zoom URL validation (new method - POST-based)
    if (event.event === 'endpoint.url_validation') {
      logger.info('📞 Zoom webhook URL validation request received (POST/new)');
      
      const plainToken = event.payload?.plainToken;
      
      if (!plainToken) {
        logger.error('❌ No plainToken in validation request');
        return res.status(400).json({ error: 'No plainToken provided' });
      }
      
      // Hash the plainToken using HMAC SHA-256 with webhook secret
      const hashForValidate = crypto
        .createHmac('sha256', ZOOM_WEBHOOK_SECRET)
        .update(plainToken)
        .digest('hex');
      
      logger.info('✅ Responding to Zoom URL validation with encrypted token');
      
      return res.status(200).json({
        plainToken: plainToken,
        encryptedToken: hashForValidate,
      });
    }
    
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
        
      case 'meeting.participant_video_on':
        await handleParticipantVideoOn(event);
        break;
        
      case 'meeting.participant_video_off':
        await handleParticipantVideoOff(event);
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
    // REJOIN: Append to existing timeline (don't replace!)
    const existingTimeline = attendanceRecord.activityTimeline as any || { events: [] };
    const events = Array.isArray(existingTimeline) ? existingTimeline : (existingTimeline.events || []);
    
    // Add rejoin event
    events.push({
      type: 'ZOOM_JOINED',
      timestamp: joinTime.toISOString(),
      source: 'ZOOM_WEBHOOK',
      data: {
        participantName: participant.user_name,
        participantEmail: participant.email,
        zoomUserId: participant.user_id,
        isRejoin: true,
        previousEvents: events.length,
      },
    });
    
    // Update record with appended timeline
    await prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: {
        activityTimeline: { events },
      },
    });
    
    logger.info(`✅ Recorded REJOIN for ${participant.user_name} (event #${events.length})`, {
      attendanceId: attendanceRecord.id,
      joinTime: joinTime.toISOString(),
      totalEvents: events.length,
    });
  } else {
    // Create new attendance record if participant joined directly via Zoom
    if (user.courtRepId) {
      // Calculate if they joined late
      // Use current date/time as the meeting date (actual meeting start time)
      const meetingStart = new Date();
      const minutesLate = 0; // Can't determine without scheduled meeting time
      const joinedLate = false;
      
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
          verificationMethod: 'ZOOM_WEBHOOK',
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
                  scheduledStart: meetingStart.toISOString(),
                  actualJoin: joinTime.toISOString(),
                  minutesLate,
                  joinedLate,
                },
              },
            ],
          },
          // @ts-ignore - Add metadata for punctuality tracking
          metadata: {
            scheduledStart: meetingStart.toISOString(),
            actualJoinTime: joinTime.toISOString(),
            minutesLate,
            joinedLate,
          },
        },
      });
      
      if (joinedLate) {
        logger.warn(`⏰ Participant joined ${minutesLate} minutes late: ${participant.user_name}`, {
          attendanceId: attendanceRecord.id,
          scheduled: meetingStart.toISOString(),
          actual: joinTime.toISOString(),
        });
      } else {
        logger.info(`✅ Participant joined on time: ${participant.user_name}`, {
          attendanceId: attendanceRecord.id,
          minutesLate,
        });
      }
      
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
    // IMPORTANT: Use Zoom's reported duration as the source of truth
    // Zoom provides participant.duration in seconds, which is accurate even if they rejoined
    const zoomDurationSeconds = participant.duration || 0;
    const duration = Math.floor(zoomDurationSeconds / 60); // Convert to minutes
    
    // Fallback: calculate from join/leave times if Zoom didn't provide duration
    const calculatedDuration = Math.floor((leaveTime.getTime() - attendanceRecord.joinTime.getTime()) / (1000 * 60));
    const finalDuration = duration > 0 ? duration : calculatedDuration;
    
    const expectedDuration = meeting.durationMinutes || 60;
    const attendancePercent = Math.min((finalDuration / expectedDuration) * 100, 100);
    
    logger.info(`📊 Duration calculation:`, {
      zoomReportedSeconds: zoomDurationSeconds,
      zoomReportedMinutes: duration,
      calculatedMinutes: calculatedDuration,
      finalDurationUsed: finalDuration,
      expectedDuration,
      attendancePercent: `${attendancePercent.toFixed(1)}%`,
    });
    
    // Get existing activity timeline
    const existingTimeline = attendanceRecord.activityTimeline as any || { events: [] };
    const events = Array.isArray(existingTimeline) ? existingTimeline : (existingTimeline.events || []);
    
    // Calculate if they left early
    // Use the join time as the effective start (since we don't have scheduled meeting times)
    const effectiveMeetingStart = attendanceRecord.joinTime;
    const meetingEnd = new Date(effectiveMeetingStart.getTime() + (meeting.durationMinutes || 60) * 60 * 1000);
    const minutesEarly = Math.max(0, Math.floor((meetingEnd.getTime() - leaveTime.getTime()) / (1000 * 60)));
    const leftEarly = minutesEarly > 5; // More than 5 minutes early
    
    // Count total join/leave pairs
    const joinEvents = events.filter((e: any) => e.type === 'ZOOM_JOINED').length;
    const leaveEvents = events.filter((e: any) => e.type === 'ZOOM_LEFT').length;
    const isTemporaryLeave = joinEvents > leaveEvents + 1; // They might rejoin
    
    // Add leave event
    events.push({
      type: 'ZOOM_LEFT',
      timestamp: leaveTime.toISOString(),
      source: 'ZOOM_WEBHOOK',
      data: {
        participantName: participant.user_name,
        zoomDurationSeconds: zoomDurationSeconds,
        zoomDurationMinutes: duration,
        scheduledEnd: meetingEnd.toISOString(),
        actualLeave: leaveTime.toISOString(),
        minutesEarly,
        leftEarly,
        isTemporaryLeave,
        totalJoins: joinEvents,
        totalLeaves: leaveEvents + 1,
      },
    });
    
    if (leftEarly && !isTemporaryLeave) {
      logger.warn(`⏰ Participant left ${minutesEarly} minutes early: ${participant.user_name}`, {
        scheduled: meetingEnd.toISOString(),
        actual: leaveTime.toISOString(),
      });
    }
    
    // Calculate active vs idle time from activity timeline (OPTIONAL - for engagement scoring only)
    const { activeDurationMin, idleDurationMin } = calculateActivityDurations({ events });
    
    // TRUST ZOOM DATA: Use Zoom's duration as active time if no browser activity was tracked
    // This ensures attendance is recorded even if the ProofMeet tab was closed
    const finalActiveDuration = activeDurationMin > 0 ? activeDurationMin : finalDuration;
    const finalIdleDuration = idleDurationMin > 0 ? idleDurationMin : 0;
    
    // Update attendance record with REAL data from Zoom webhook
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: {
        leaveTime,
        totalDurationMin: finalDuration,
        activeDurationMin: finalActiveDuration,
        idleDurationMin: finalIdleDuration,
        attendancePercent,
        status: 'COMPLETED',
        verificationMethod: 'ZOOM_WEBHOOK', // Primary source of truth
        activityTimeline: { events },
      },
    });
    
    logger.info(`✅ Attendance completed via Zoom webhook: ${attendanceRecord.id}`, {
      zoomDuration: `${zoomDurationSeconds}s (${duration} min)`,
      calculatedDuration: `${calculatedDuration} min`,
      finalDuration: `${finalDuration} min`,
      activeDuration: finalActiveDuration,
      idleDuration: finalIdleDuration,
      attendancePercent: `${attendancePercent.toFixed(1)}%`,
      joinTime: attendanceRecord.joinTime.toISOString(),
      leaveTime: leaveTime.toISOString(),
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
          finalDuration,
          Number(attendancePercent),
          courtCard.cardNumber
        );
        logger.info(`📧 Confirmation email sent to ${user.email}`);
      } catch (emailError: any) {
        logger.error(`Failed to send confirmation email: ${emailError.message}`);
      }
      
      // Send WebSocket notifications
      if (user.courtRepId) {
        websocketService.notifyParticipantLeft(meetingId, user.id, user.courtRepId, finalDuration);
        websocketService.notifyAttendanceUpdated(user.id, user.courtRepId, {
          attendanceRecordId: updatedRecord.id,
          status: 'COMPLETED',
          duration: finalDuration,
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

/**
 * Handle participant video ON event
 * Tracks when participant turns their camera on
 */
async function handleParticipantVideoOn(event: any) {
  const meetingId = event.payload.object.id.toString();
  const participant = event.payload.object.participant;
  const timestamp = new Date(event.event_ts); // Zoom event timestamp
  
  logger.info(`📹 Participant video ON: ${participant.user_name}`, {
    email: participant.email,
    meetingId,
    timestamp,
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
    // Get existing activity timeline
    const existingTimeline = attendanceRecord.activityTimeline as any || { events: [] };
    const events = Array.isArray(existingTimeline) ? existingTimeline : (existingTimeline.events || []);
    
    // Add video ON event
    events.push({
      type: 'VIDEO_ON',
      timestamp: timestamp.toISOString(),
      source: 'ZOOM_WEBHOOK',
      data: {
        participantName: participant.user_name,
        participantEmail: participant.email,
        zoomUserId: participant.user_id,
      },
    });
    
    // Update attendance record
    await prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: {
        activityTimeline: { events },
      },
    });
    
    logger.info(`✅ Video ON event recorded for ${participant.user_name}`, {
      attendanceId: attendanceRecord.id,
      totalEvents: events.length,
    });
  } else {
    logger.warn(`No in-progress attendance record found for video ON event`, {
      participantEmail: participant.email,
      meetingId,
    });
  }
}

/**
 * Handle participant video OFF event
 * Tracks when participant turns their camera off
 */
async function handleParticipantVideoOff(event: any) {
  const meetingId = event.payload.object.id.toString();
  const participant = event.payload.object.participant;
  const timestamp = new Date(event.event_ts); // Zoom event timestamp
  
  logger.info(`📹 Participant video OFF: ${participant.user_name}`, {
    email: participant.email,
    meetingId,
    timestamp,
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
    // Get existing activity timeline
    const existingTimeline = attendanceRecord.activityTimeline as any || { events: [] };
    const events = Array.isArray(existingTimeline) ? existingTimeline : (existingTimeline.events || []);
    
    // Add video OFF event
    events.push({
      type: 'VIDEO_OFF',
      timestamp: timestamp.toISOString(),
      source: 'ZOOM_WEBHOOK',
      data: {
        participantName: participant.user_name,
        participantEmail: participant.email,
        zoomUserId: participant.user_id,
      },
    });
    
    // Update attendance record
    await prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: {
        activityTimeline: { events },
      },
    });
    
    logger.info(`✅ Video OFF event recorded for ${participant.user_name}`, {
      attendanceId: attendanceRecord.id,
      totalEvents: events.length,
    });
  } else {
    logger.warn(`No in-progress attendance record found for video OFF event`, {
      participantEmail: participant.email,
      meetingId,
    });
  }
}

export { router as zoomWebhookRoutes };

