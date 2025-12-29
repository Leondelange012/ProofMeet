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
 * Normalize activity timeline - handles both array format and object { events: [...] } format
 */
function normalizeTimeline(activityTimeline: any): any[] {
  if (!activityTimeline) {
    return [];
  }
  
  // If it's already an array, return it
  if (Array.isArray(activityTimeline)) {
    return activityTimeline;
  }
  
  // If it's an object with an events array, return the events
  if (activityTimeline && typeof activityTimeline === 'object' && Array.isArray(activityTimeline.events)) {
    return activityTimeline.events;
  }
  
  // If it's an object without events array, return empty
  logger.warn(`Unexpected activityTimeline format in webhook:`, { 
    type: typeof activityTimeline, 
    keys: Object.keys(activityTimeline || {}) 
  });
  return [];
}

/**
 * Calculate active vs idle duration from activity timeline
 * Uses heartbeat events sent by frontend activity monitor
 */
export function calculateActivityDurations(activityTimeline: any): {
  activeDurationMin: number;
  idleDurationMin: number;
} {
  const events = normalizeTimeline(activityTimeline);
  
  // Count ACTIVE and IDLE events from frontend heartbeats
  // Support both tagged (metadata.source) and untagged events for backward compatibility
  const activeEvents = events.filter((e: any) => {
    if (e.type !== 'ACTIVE') return false;
    // If source exists, it must be FRONTEND_MONITOR
    // If no source, accept any ACTIVE event (backward compatibility)
    const source = e.metadata?.source || e.source;
    return !source || source === 'FRONTEND_MONITOR';
  });
  
  const idleEvents = events.filter((e: any) => {
    if (e.type !== 'IDLE') return false;
    // If source exists, it must be FRONTEND_MONITOR
    // If no source, accept any IDLE event (backward compatibility)
    const source = e.metadata?.source || e.source;
    return !source || source === 'FRONTEND_MONITOR';
  });
  
  // Each heartbeat represents approximately 30 seconds of activity
  const HEARTBEAT_DURATION_SECONDS = 30;
  
  const activeDurationMin = Math.floor((activeEvents.length * HEARTBEAT_DURATION_SECONDS) / 60);
  const idleDurationMin = Math.floor((idleEvents.length * HEARTBEAT_DURATION_SECONDS) / 60);
  
  logger.info(`Activity calculation: ${activeEvents.length} active events, ${idleEvents.length} idle events, total timeline events: ${events.length}`);
  
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
      // Calculate duration from join to meeting end
      const totalDurationMin = Math.max(1, Math.floor((endTime.getTime() - record.joinTime.getTime()) / (1000 * 60)));
      
      // Calculate active/idle from activity timeline
      const { activeDurationMin, idleDurationMin } = calculateActivityDurations(record.activityTimeline);
      
      // If no activity data, use total duration as active (participant was in meeting)
      const finalActiveDuration = activeDurationMin > 0 ? activeDurationMin : totalDurationMin;
      const finalIdleDuration = idleDurationMin > 0 ? idleDurationMin : 0;
      
      // Calculate attendance percentage
      const meetingDuration = meeting.durationMinutes || 60;
      const attendancePercent = Math.min((totalDurationMin / meetingDuration) * 100, 100);
      
      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          leaveTime: endTime,
          totalDurationMin,
          activeDurationMin: finalActiveDuration,
          idleDurationMin: finalIdleDuration,
          attendancePercent,
          status: 'COMPLETED',
        },
      });
      
      logger.info(`Auto-completed attendance record for meeting end: ${record.id} - Duration: ${totalDurationMin} min, Active: ${finalActiveDuration} min (${attendancePercent.toFixed(1)}%)`);
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
  
  logger.info(`🔍 Attendance record lookup:`, {
    participantId: user.id,
    participantEmail: user.email,
    meetingId: meeting.id,
    meetingZoomId: meetingId,
    existingRecordFound: !!attendanceRecord,
    existingRecordId: attendanceRecord?.id,
    existingJoinTime: attendanceRecord?.joinTime?.toISOString(),
    zoomJoinTime: joinTime.toISOString(),
  });
  
  if (attendanceRecord) {
    // REJOIN or DUPLICATE JOIN: Append to existing timeline (don't replace!)
    const existingTimeline = attendanceRecord.activityTimeline as any || { events: [] };
    const events = normalizeTimeline(existingTimeline);
    
    // Check if this is a rejoin (we have previous ZOOM_LEFT events)
    const previousLeaveEvents = events.filter((e: any) => e.type === 'ZOOM_LEFT');
    const isRejoin = previousLeaveEvents.length > 0;
    
    // Add join event
    events.push({
      type: 'ZOOM_JOINED',
      timestamp: joinTime.toISOString(),
      source: 'ZOOM_WEBHOOK',
      data: {
        participantName: participant.user_name,
        participantEmail: participant.email,
        zoomUserId: participant.user_id,
        isRejoin,
        previousEvents: events.length,
      },
    });
    
    // IMPORTANT: If Zoom's join time is EARLIER than our record's join time,
    // update the join time to the earlier value (more accurate)
    const updateData: any = {
      activityTimeline: { events },
    };
    
    if (joinTime < attendanceRecord.joinTime) {
      updateData.joinTime = joinTime;
      logger.info(`📍 Updating joinTime to earlier Zoom time: ${joinTime.toISOString()} (was ${attendanceRecord.joinTime.toISOString()})`);
    }
    
    // Update record with appended timeline and potentially earlier join time
    await prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: updateData,
    });
    
    logger.info(`✅ Recorded ${isRejoin ? 'REJOIN' : 'JOIN'} for ${participant.user_name} (event #${events.length})`, {
      attendanceId: attendanceRecord.id,
      joinTime: joinTime.toISOString(),
      totalEvents: events.length,
      isRejoin,
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
  
  // Log the full participant object to debug duration issues
  logger.info(`👋 Participant left: ${participant.user_name}`, {
    email: participant.email,
    meetingId,
    leaveTime,
    // Debug: log all participant fields to see what Zoom sends
    participantFields: Object.keys(participant),
    rawDuration: participant.duration,
    rawDurationType: typeof participant.duration,
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
    // Get existing activity timeline to find the EARLIEST join time
    const existingTimeline = attendanceRecord.activityTimeline as any || { events: [] };
    const events = normalizeTimeline(existingTimeline);
    
    // Find the earliest ZOOM_JOINED event for accurate join time
    const joinEvents = events.filter((e: any) => e.type === 'ZOOM_JOINED' && e.source === 'ZOOM_WEBHOOK');
    let effectiveJoinTime = attendanceRecord.joinTime;
    
    if (joinEvents.length > 0) {
      // Sort join events by timestamp and use the earliest one
      const sortedJoinEvents = joinEvents.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const firstJoinTimestamp = new Date(sortedJoinEvents[0].timestamp);
      
      // Use the earlier of: attendance record joinTime or first Zoom join event
      if (firstJoinTimestamp < effectiveJoinTime) {
        effectiveJoinTime = firstJoinTimestamp;
        logger.info(`📍 Using earlier join time from timeline: ${effectiveJoinTime.toISOString()}`);
      }
    }
    
    // IMPORTANT: Use Zoom's reported duration as the source of truth
    // Zoom provides participant.duration in seconds, which is accurate even if they rejoined
    // However, some Zoom account types may not provide this field, so we need robust fallback
    
    // Parse duration carefully - it might be a string, number, or undefined
    let zoomDurationSeconds = 0;
    if (participant.duration !== undefined && participant.duration !== null) {
      zoomDurationSeconds = typeof participant.duration === 'string' 
        ? parseInt(participant.duration, 10) 
        : Number(participant.duration);
      
      // Handle NaN case
      if (isNaN(zoomDurationSeconds)) {
        zoomDurationSeconds = 0;
      }
    }
    
    const duration = Math.floor(zoomDurationSeconds / 60); // Convert to minutes
    
    // Fallback: calculate from timestamps using EFFECTIVE join time (earliest known)
    const calculatedDuration = Math.max(0, Math.floor((leaveTime.getTime() - effectiveJoinTime.getTime()) / (1000 * 60)));
    
    // Use calculated duration as primary if Zoom duration is 0 or very short (less than 1 min)
    // This handles cases where Zoom's duration field isn't populated
    const finalDuration = (duration >= 1) ? duration : Math.max(calculatedDuration, 1);
    
    const expectedDuration = meeting.durationMinutes || 60;
    const attendancePercent = Math.min((finalDuration / expectedDuration) * 100, 100);
    
    logger.info(`📊 Duration calculation:`, {
      zoomReportedSeconds: zoomDurationSeconds,
      zoomReportedMinutes: duration,
      calculatedFromTimestamps: calculatedDuration,
      finalDurationUsed: finalDuration,
      expectedDuration,
      attendancePercent: `${attendancePercent.toFixed(1)}%`,
      recordJoinTime: attendanceRecord.joinTime.toISOString(),
      effectiveJoinTime: effectiveJoinTime.toISOString(),
      leaveTime: leaveTime.toISOString(),
      timelineJoinEvents: joinEvents.length,
      durationSource: (duration >= 1) ? 'ZOOM_WEBHOOK' : 'CALCULATED_FROM_TIMESTAMPS',
    });
    
    // Calculate if they left early
    // Use the join time as the effective start (since we don't have scheduled meeting times)
    const effectiveMeetingStart = attendanceRecord.joinTime;
    const meetingEnd = new Date(effectiveMeetingStart.getTime() + (meeting.durationMinutes || 60) * 60 * 1000);
    const minutesEarly = Math.max(0, Math.floor((meetingEnd.getTime() - leaveTime.getTime()) / (1000 * 60)));
    const leftEarly = minutesEarly > 5; // More than 5 minutes early
    
    // Count total join/leave pairs from the already loaded events
    const joinEventsCount = events.filter((e: any) => e.type === 'ZOOM_JOINED').length;
    const leaveEventsCount = events.filter((e: any) => e.type === 'ZOOM_LEFT').length;
    const isTemporaryLeave = joinEventsCount > leaveEventsCount + 1; // They might rejoin
    
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
        totalJoins: joinEventsCount,
        totalLeaves: leaveEventsCount + 1,
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
    // Also update joinTime to the effective (earliest) join time for accuracy
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: {
        joinTime: effectiveJoinTime, // Use the earliest known join time
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

