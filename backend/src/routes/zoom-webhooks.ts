/**
 * Zoom Webhooks Handler
 * Receives real-time events from Zoom to verify actual attendance
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { logger } from '../utils/logger';

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
    }
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
    
    // Update attendance record with REAL leave time from Zoom
    await prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: {
        leaveTime,
        totalDurationMin: duration,
        attendancePercent,
        status: 'COMPLETED',
        activityTimeline: { events },
      },
    });
    
    logger.info(`✅ Updated attendance record with Zoom leave time: ${attendanceRecord.id}`, {
      duration,
      attendancePercent,
    });
  }
}

export { router as zoomWebhookRoutes };

