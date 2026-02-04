/**
 * Participant Dashboard Routes
 * 
 * IMPORTANT: TypeScript errors are expected until setup is complete!
 * Run these commands first:
 *   1. npm install
 *   2. npx prisma generate    <- This regenerates Prisma Client with V2 schema
 *   3. npx prisma migrate dev
 * 
 * See: backend/SETUP_INSTRUCTIONS.md for details
 */

/// <reference path="../types/express.d.ts" />

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { authenticate, requireParticipant } from '../middleware/auth';
import { generateCourtCard, getCourtCard, verifyCourtCard } from '../services/courtCardService';
import { queueDailyDigest, sendAttendanceConfirmation } from '../services/emailService';
import {
  addActivityEvent,
  recordLeaveEvent,
  recordRejoinEvent,
  calculateActiveDuration,
  getLastActivityTimestamp,
  calculateEngagementMetrics,
  ActivityEvent,
} from '../services/activityTrackingService';

const router = Router();

// All routes require authentication and Participant role
router.use(authenticate);
router.use(requireParticipant);

// ============================================
// DASHBOARD OVERVIEW
// ============================================

/**
 * GET /api/participant/dashboard
 * Get participant dashboard with progress and requirements
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.id;

    // Get participant with Court Rep info
    const participant = await prisma.user.findUnique({
      where: { id: participantId },
      include: {
        courtRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        requirements: {
          where: { isActive: true },
        },
      },
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found',
      });
    }

    // Get this week's attendance
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const thisWeekAttendance = await prisma.attendanceRecord.findMany({
      where: {
        participantId,
        meetingDate: { gte: weekStart },
        status: 'COMPLETED',
      },
    });

    // Calculate average attendance
    const avgAttendance = thisWeekAttendance.length > 0
      ? thisWeekAttendance.reduce((sum, r) => sum + Number(r.attendancePercent || 0), 0) / thisWeekAttendance.length
      : 0;

    const requirement = participant.requirements[0];
    const meetingsRequired = requirement?.meetingsPerWeek || 0;
    const meetingsAttended = thisWeekAttendance.length;

    // Determine status
    let status = 'ON_TRACK';
    if (meetingsRequired > 0) {
      if (meetingsAttended === 0) {
        status = 'BEHIND';
      } else if (meetingsAttended < meetingsRequired) {
        status = 'AT_RISK';
      } else {
        status = 'ON_TRACK';
      }
    }

    // Get recent meetings with court cards
    const recentMeetings = await prisma.attendanceRecord.findMany({
      where: { participantId },
      orderBy: { meetingDate: 'desc' },
      take: 5,
      include: {
        courtCard: {
          select: {
            id: true,
            cardNumber: true,
            validationStatus: true,
            confidenceLevel: true,
            verificationMethod: true,
            generatedAt: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        participant: {
          firstName: participant.firstName,
          lastName: participant.lastName,
          caseNumber: participant.caseNumber,
          courtRep: participant.courtRep ? {
            name: `${participant.courtRep.firstName} ${participant.courtRep.lastName}`,
            email: participant.courtRep.email,
          } : null,
        },
        progress: {
          thisWeek: {
            attended: meetingsAttended,
            required: meetingsRequired,
            status,
            averageAttendance: Math.round(avgAttendance * 10) / 10,
          },
        },
        requirements: requirement ? {
          meetingsPerWeek: requirement.meetingsPerWeek,
          requiredPrograms: requirement.requiredPrograms,
          minimumDuration: requirement.minimumDurationMinutes,
          courtName: participant.courtRep ? `${participant.courtRep.firstName} ${participant.courtRep.lastName}` : 'N/A',
        } : {
          meetingsPerWeek: 0,
          requiredPrograms: [],
          minimumDuration: 60,
          courtName: 'N/A',
        },
        recentMeetings: recentMeetings.map(record => ({
          id: record.id,
          meetingName: record.meetingName,
          meetingProgram: record.meetingProgram,
          meetingDate: record.meetingDate,
          totalDurationMin: record.totalDurationMin,
          attendancePercent: record.attendancePercent,
          status: record.status,
          courtCard: record.courtCard ? {
            id: record.courtCard.id,
            cardNumber: record.courtCard.cardNumber,
            validationStatus: record.courtCard.validationStatus,
            confidenceLevel: record.courtCard.confidenceLevel,
            verificationMethod: record.courtCard.verificationMethod,
            generatedAt: record.courtCard.generatedAt,
          } : null,
        })),
      },
    });
  } catch (error: any) {
    logger.error('Participant dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// MEETINGS
// ============================================

/**
 * GET /api/participant/meetings/debug/:zoomId
 * Debug endpoint to check if a meeting exists by Zoom ID
 * NO AUTH - for debugging only
 */
router.get('/meetings/debug/:zoomId', async (req: Request, res: Response) => {
  try {
    const zoomId = req.params.zoomId;
    const cleanedZoomId = zoomId.replace(/\s+/g, '');
    
    logger.info(`🔍 DEBUG: Searching for Zoom ID: ${zoomId} (cleaned: ${cleanedZoomId})`);
    
    // Search with exact match
    const exactMatch = await prisma.externalMeeting.findMany({
      where: { zoomId: cleanedZoomId },
      select: { id: true, name: true, program: true, zoomId: true, hasProofCapability: true, zoomUrl: true }
    });
    
    // Search with partial match
    const partialMatch = await prisma.externalMeeting.findMany({
      where: { zoomId: { contains: cleanedZoomId } },
      select: { id: true, name: true, program: true, zoomId: true, hasProofCapability: true, zoomUrl: true }
    });
    
    // Search in URL
    const urlMatch = await prisma.externalMeeting.findMany({
      where: { zoomUrl: { contains: cleanedZoomId } },
      select: { id: true, name: true, program: true, zoomId: true, hasProofCapability: true, zoomUrl: true }
    });
    
    res.json({
      success: true,
      searchTerm: zoomId,
      cleanedSearchTerm: cleanedZoomId,
      results: {
        exactMatch: exactMatch.length,
        partialMatch: partialMatch.length,
        urlMatch: urlMatch.length,
        exactMatchData: exactMatch,
        partialMatchData: partialMatch,
        urlMatchData: urlMatch,
      }
    });
  } catch (error: any) {
    logger.error('Debug search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/participant/meetings/programs
 * Get list of all available meeting programs/categories
 */
router.get('/meetings/programs', async (req: Request, res: Response) => {
  try {
    // Get distinct programs from meetings with proof capability
    const programs = await prisma.externalMeeting.findMany({
      where: {
        hasProofCapability: true,
      },
      distinct: ['program'],
      select: {
        program: true,
      },
      orderBy: {
        program: 'asc',
      },
    });

    const programList = programs.map(p => p.program);

    res.json({
      success: true,
      data: programList,
    });
  } catch (error: any) {
    logger.error('Get available programs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/participant/meetings/available
 * Get all available external meetings
 */
router.get('/meetings/available', async (req: Request, res: Response) => {
  try {
    const program = req.query.program as string;
    const format = req.query.format as string;
    const day = req.query.day as string;
    const zoomId = req.query.zoomId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const where: any = {
      hasProofCapability: true,
    };

    if (program) where.program = program;
    if (format) where.format = format;
    if (day) where.dayOfWeek = day;
    
    // Zoom ID search (partial match, spaces removed for flexibility)
    if (zoomId) {
      // Strip spaces from search term (e.g., "881 1306 9602" -> "88113069602")
      const cleanedZoomId = zoomId.replace(/\s+/g, '');
      where.zoomId = {
        contains: cleanedZoomId,
      };
      
      // Log search attempt
      logger.info(`🔍 Zoom ID Search: "${zoomId}" -> cleaned: "${cleanedZoomId}"`);
      
      // DIAGNOSTIC: Check if meeting exists WITHOUT hasProofCapability filter
      const allMatchingMeetings = await prisma.externalMeeting.findMany({
        where: {
          zoomId: { contains: cleanedZoomId },
        },
        select: {
          id: true,
          name: true,
          zoomId: true,
          program: true,
          hasProofCapability: true,
        },
      });
      
      logger.info(`📋 Found ${allMatchingMeetings.length} meetings with Zoom ID containing "${cleanedZoomId}" (ignoring hasProofCapability filter):`);
      allMatchingMeetings.forEach(m => {
        logger.info(`  - ID: ${m.id}, Name: ${m.name}, ZoomID: ${m.zoomId}, Program: ${m.program}, HasProof: ${m.hasProofCapability}`);
      });
    }

    const meetings = await prisma.externalMeeting.findMany({
      where,
      orderBy: [
        { program: 'asc' },
        { dayOfWeek: 'asc' },
        { time: 'asc' },
      ],
      take: limit, // Limit results if specified
    });
    
    // Log results
    logger.info(`📊 Query returned ${meetings.length} meetings WITH filters (filters: ${JSON.stringify(where)})`);

    // Group by program
    const meetingsByProgram: { [key: string]: any[] } = {};
    for (const meeting of meetings) {
      if (!meetingsByProgram[meeting.program]) {
        meetingsByProgram[meeting.program] = [];
      }
      meetingsByProgram[meeting.program].push({
        id: meeting.id,
        name: meeting.name,
        program: meeting.program,
        type: meeting.meetingType,
        day: meeting.dayOfWeek,
        time: meeting.time,
        timezone: meeting.timezone,
        duration: meeting.durationMinutes,
        format: meeting.format,
        zoomUrl: meeting.zoomUrl,
        zoomId: meeting.zoomId,
        hasProofCapability: meeting.hasProofCapability, // ✅ CRITICAL: Required for Join button
        location: meeting.location,
        address: meeting.address,
        description: meeting.description,
        tags: meeting.tags,
      });
    }

    res.json({
      success: true,
      data: meetingsByProgram,
    });
  } catch (error: any) {
    logger.error('Get available meetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/participant/meetings/assigned
 * Get assigned meetings and requirements progress
 */
router.get('/meetings/assigned', async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.id;

    // Get requirements
    const requirement = await prisma.meetingRequirement.findFirst({
      where: {
        participantId,
        isActive: true,
      },
    });

    if (!requirement) {
      return res.json({
        success: true,
        data: {
          requirements: null,
          thisWeekProgress: null,
          completedMeetings: [],
          upcomingOpportunities: [],
        },
      });
    }

    // Get this week's progress
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const completedMeetings = await prisma.attendanceRecord.findMany({
      where: {
        participantId,
        meetingDate: { gte: weekStart },
        status: 'COMPLETED',
      },
      orderBy: { meetingDate: 'desc' },
    });

    const status = completedMeetings.length >= requirement.meetingsPerWeek
      ? 'COMPLETED'
      : completedMeetings.length > 0
      ? 'IN_PROGRESS'
      : 'NOT_STARTED';

    // Get upcoming meeting opportunities (that match requirements)
    const upcomingMeetings = await prisma.externalMeeting.findMany({
      where: {
        program: requirement.requiredPrograms.length > 0
          ? { in: requirement.requiredPrograms }
          : undefined,
        hasProofCapability: true,
      },
      take: 10,
      orderBy: [
        { dayOfWeek: 'asc' },
        { time: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: {
        requirements: {
          meetingsPerWeek: requirement.meetingsPerWeek,
          requiredPrograms: requirement.requiredPrograms,
        },
        thisWeekProgress: {
          completed: completedMeetings.length,
          required: requirement.meetingsPerWeek,
          status,
        },
        completedMeetings: completedMeetings.map(record => ({
          id: record.id,
          meetingName: record.meetingName,
          program: record.meetingProgram,
          date: record.meetingDate,
          duration: record.totalDurationMin,
          status: record.isValid ? 'VALID' : 'FLAGGED',
        })),
        upcomingOpportunities: upcomingMeetings.map(meeting => ({
          id: meeting.id,
          name: meeting.name,
          program: meeting.program,
          day: meeting.dayOfWeek,
          time: meeting.time,
          format: meeting.format,
        })),
      },
    });
  } catch (error: any) {
    logger.error('Get assigned meetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// ATTENDANCE
// ============================================

/**
 * GET /api/participant/my-attendance
 * Get participant's attendance history
 */
router.get('/my-attendance', async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: any = { participantId };

    if (startDate || endDate) {
      where.meetingDate = {};
      if (startDate) where.meetingDate.gte = new Date(startDate);
      if (endDate) where.meetingDate.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { meetingDate: 'desc' },
        include: {
          courtCard: {
            select: {
              id: true,
              cardNumber: true,
            },
          },
        },
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    res.json({
      success: true,
      data: records.map(record => ({
        id: record.id,
        meeting: {
          name: record.meetingName,
          program: record.meetingProgram,
          type: record.meetingProgram,
        },
        date: record.meetingDate,
        joinTime: record.joinTime,
        leaveTime: record.leaveTime,
        duration: record.totalDurationMin,
        attendancePercentage: record.attendancePercent,
        status: record.status,
        courtCardId: record.courtCard?.id,
        sentToCourtRep: !!record.courtCardSentAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error('Get my attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/participant/join-meeting
 * Join a meeting and start attendance tracking
 */
router.post(
  '/join-meeting',
  [
    body('meetingId').isString(),
    body('joinMethod').isIn(['ONLINE', 'IN_PERSON']),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const participantId = req.user!.id;
      const { meetingId, joinMethod } = req.body;

      // Get meeting details
      const meeting = await prisma.externalMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found',
        });
      }

      // Get participant's court rep
      const participant = await prisma.user.findUnique({
        where: { id: participantId },
        select: { courtRepId: true },
      });

      if (!participant?.courtRepId) {
        return res.status(400).json({
          success: false,
          error: 'No Court Representative assigned',
        });
      }

      // Check if already attending
      const existingAttendance = await prisma.attendanceRecord.findFirst({
        where: {
          participantId,
          externalMeetingId: meetingId,
          status: 'IN_PROGRESS',
        },
      });

      if (existingAttendance) {
        return res.status(400).json({
          success: false,
          error: 'Already attending this meeting',
        });
      }

      // Create attendance record
      const attendance = await prisma.attendanceRecord.create({
        data: {
          participantId,
          courtRepId: participant.courtRepId,
          externalMeetingId: meetingId,
          meetingName: meeting.name,
          meetingProgram: meeting.program,
          meetingDate: new Date(),
          joinTime: new Date(),
          status: 'IN_PROGRESS',
        },
      });

      logger.info(`Participant ${participantId} joined meeting ${meetingId}`);

      res.status(201).json({
        success: true,
        message: 'Attendance tracking started',
        data: {
          attendanceId: attendance.id,
          meetingName: meeting.name,
          joinTime: attendance.joinTime,
          trackingActive: true,
          meetingUrl: meeting.zoomUrl,
        },
      });
    } catch (error: any) {
      logger.error('Join meeting error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/participant/leave-meeting
 * Leave a meeting and complete attendance record
 */
router.post(
  '/leave-meeting',
  [body('attendanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const participantId = req.user!.id;
      const { attendanceId } = req.body;

      // Get attendance record
      const attendance = await prisma.attendanceRecord.findFirst({
        where: {
          id: attendanceId,
          participantId,
          status: 'IN_PROGRESS',
        },
        include: {
          externalMeeting: true,
        },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          error: 'Attendance record not found or already completed',
        });
      }

      const leaveTime = new Date();
      const joinTime = attendance.joinTime;

      // Record final leave event
      await recordLeaveEvent(attendanceId, 'Final leave');

      // Calculate durations using activity timeline
      // Timeline is stored as { events: [...] } - extract the events array
      const rawTimeline = attendance.activityTimeline as any;
      const activityTimeline: ActivityEvent[] = (() => {
        if (!rawTimeline) return [];
        if (Array.isArray(rawTimeline)) return rawTimeline;
        if (rawTimeline.events && Array.isArray(rawTimeline.events)) return rawTimeline.events;
        return [];
      })();
      
      const durationCalc = calculateActiveDuration(
        joinTime,
        leaveTime,
        activityTimeline
      );

      // Calculate attendance percentage
      const expectedDuration = attendance.externalMeeting?.durationMinutes || 60;
      const attendancePercent = Math.min(
        (durationCalc.activeDurationMin / expectedDuration) * 100,
        100
      );

      // Calculate engagement metrics
      const engagementMetrics = calculateEngagementMetrics(
        activityTimeline,
        durationCalc.totalDurationMin
      );

      // Update attendance record
      const updated = await prisma.attendanceRecord.update({
        where: { id: attendanceId },
        data: {
          leaveTime,
          totalDurationMin: durationCalc.totalDurationMin,
          activeDurationMin: durationCalc.activeDurationMin,
          idleDurationMin: durationCalc.idleDurationMin,
          attendancePercent,
          status: 'COMPLETED',
          verificationMethod: 'SCREEN_ACTIVITY',
        },
      });

      // Generate Court Card automatically
      let courtCard = null;
      try {
        courtCard = await generateCourtCard(attendanceId);
        logger.info(`Court Card generated: ${courtCard.cardNumber} for participant ${participantId}`);
      } catch (error: any) {
        logger.error(`Failed to generate Court Card: ${error.message}`);
        // Don't fail the request, just log the error
      }

      // Queue daily digest for Court Rep
      if ((req.user as any)?.courtRepId && courtCard) {
        try {
          await queueDailyDigest((req.user as any).courtRepId, [attendanceId]);
          logger.info(`Queued daily digest for Court Rep ${(req.user as any).courtRepId}`);
        } catch (error: any) {
          logger.error(`Failed to queue daily digest: ${error.message}`);
        }
      }

      // Send attendance confirmation to participant
      if (courtCard) {
        try {
          await sendAttendanceConfirmation(
            req.user!.email,
            attendance.meetingName,
            durationCalc.totalDurationMin,
            Number(attendancePercent),
            courtCard.cardNumber
          );
          logger.info(`Attendance confirmation sent to ${req.user!.email}`);
        } catch (error: any) {
          logger.error(`Failed to send confirmation: ${error.message}`);
        }
      }

      logger.info(`Participant ${participantId} left meeting, duration: ${durationCalc.totalDurationMin}min`);

      res.json({
        success: true,
        message: 'Meeting attendance recorded successfully',
        data: {
          attendanceId: updated.id,
          duration: durationCalc.totalDurationMin,
          attendancePercentage: attendancePercent,
          courtCardGenerated: !!courtCard,
          courtCardId: courtCard?.id,
          courtCardNumber: courtCard?.cardNumber,
          sentToCourtRep: true,
        },
      });
    } catch (error: any) {
      logger.error('Leave meeting error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/participant/requirements
 * Get participant's meeting requirements
 */
router.get('/requirements', async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.id;

    const requirement = await prisma.meetingRequirement.findFirst({
      where: {
        participantId,
        isActive: true,
      },
    });

    if (!requirement) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: {
        meetingsPerWeek: requirement.meetingsPerWeek,
        meetingsPerMonth: requirement.meetingsPerMonth,
        requiredPrograms: requirement.requiredPrograms,
        minimumDurationMinutes: requirement.minimumDurationMinutes,
        minimumAttendancePercent: requirement.minimumAttendancePercent,
      },
    });
  } catch (error: any) {
    logger.error('Get requirements error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// ACTIVITY TRACKING
// ============================================

/**
 * POST /api/participant/track-activity
 * Record activity event (mouse, keyboard, etc.)
 */
router.post(
  '/track-activity',
  [
    body('attendanceId').isString(),
    body('eventType').isIn(['MOUSE_MOVE', 'KEYBOARD', 'SCROLL', 'CLICK', 'IDLE', 'ACTIVE']),
    body('metadata').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const participantId = req.user!.id;
      const { attendanceId, eventType, metadata } = req.body;

      // Verify attendance belongs to this participant
      // Allow tracking for IN_PROGRESS or recently COMPLETED (within 10 minutes) to catch late events
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const attendance = await prisma.attendanceRecord.findFirst({
        where: {
          id: attendanceId,
          participantId,
          OR: [
            { status: 'IN_PROGRESS' },
            {
              status: 'COMPLETED',
              updatedAt: { gte: tenMinutesAgo }, // Recently completed - allow late events
            },
          ],
        },
      });

      if (!attendance) {
        logger.warn(`Track activity rejected: attendance ${attendanceId} not found or too old for participant ${participantId}`);
        return res.status(404).json({
          success: false,
          error: 'Attendance record not found, not in progress, or too old',
        });
      }

      // Add activity event with source tag for proper counting
      await addActivityEvent(attendanceId, {
        timestamp: new Date().toISOString(),
        type: eventType as any,
        metadata: {
          ...metadata,
          source: 'FRONTEND_MONITOR', // Tag for activity duration calculation
        },
      });
      
      logger.debug(`Activity event recorded: ${eventType} for attendance ${attendanceId}`);

      res.json({
        success: true,
        message: 'Activity recorded',
      });
    } catch (error: any) {
      logger.error('Track activity error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/participant/leave-meeting-temp
 * Record temporary leave (user can rejoin)
 */
router.post(
  '/leave-meeting-temp',
  [body('attendanceId').isString(), body('reason').optional().isString()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const participantId = req.user!.id;
      const { attendanceId, reason } = req.body;

      // Verify attendance belongs to this participant
      // Allow leave events for IN_PROGRESS or recently COMPLETED (within 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const attendance = await prisma.attendanceRecord.findFirst({
        where: {
          id: attendanceId,
          participantId,
          OR: [
            { status: 'IN_PROGRESS' },
            {
              status: 'COMPLETED',
              updatedAt: { gte: tenMinutesAgo },
            },
          ],
        },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          error: 'Attendance record not found, not in progress, or too old',
        });
      }

      // Record leave event
      const leaveEvent = await recordLeaveEvent(attendanceId, reason);

      res.json({
        success: true,
        message: 'Leave event recorded',
        data: leaveEvent,
      });
    } catch (error: any) {
      logger.error('Leave meeting temp error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/participant/rejoin-meeting
 * Record rejoin after temporary leave
 */
router.post(
  '/rejoin-meeting',
  [body('attendanceId').isString()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const participantId = req.user!.id;
      const { attendanceId } = req.body;

      // Verify attendance belongs to this participant
      // Allow rejoin events for IN_PROGRESS or recently COMPLETED (within 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const attendance = await prisma.attendanceRecord.findFirst({
        where: {
          id: attendanceId,
          participantId,
          OR: [
            { status: 'IN_PROGRESS' },
            {
              status: 'COMPLETED',
              updatedAt: { gte: tenMinutesAgo },
            },
          ],
        },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          error: 'Attendance record not found, not in progress, or too old',
        });
      }

      // Record rejoin event
      const rejoinEvent = await recordRejoinEvent(attendanceId);

      res.json({
        success: true,
        message: 'Rejoin event recorded',
        data: rejoinEvent,
      });
    } catch (error: any) {
      logger.error('Rejoin meeting error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// ============================================
// COURT CARDS
// ============================================

/**
 * GET /api/participant/court-card/:attendanceId
 * Get Court Card for a specific attendance record
 */
router.get('/court-card/:attendanceId', async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.id;
    const { attendanceId } = req.params;

    // Verify attendance belongs to this participant
    const attendance = await prisma.attendanceRecord.findFirst({
      where: {
        id: attendanceId,
        participantId,
      },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
      });
    }

    // Get Court Card
    const courtCard = await getCourtCard(attendanceId);

    if (!courtCard) {
      return res.status(404).json({
        success: false,
        error: 'Court Card not found',
      });
    }

    res.json({
      success: true,
      data: {
        courtCard,
      },
    });
  } catch (error: any) {
    logger.error('Get court card error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/participant/attendance/:attendanceId
 * Get attendance record details for viewing court card
 */
router.get('/attendance/:attendanceId', async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.id;
    const { attendanceId } = req.params;

    // Get attendance record with court card
    const attendance = await prisma.attendanceRecord.findFirst({
      where: {
        id: attendanceId,
        participantId,
      },
      include: {
        courtCard: true,
        participant: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
      });
    }

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error: any) {
    logger.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/participant/court-card-pdf/:attendanceId
 * Download Court Card PDF for a specific attendance record
 */
router.get('/court-card-pdf/:attendanceId', async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.id;
    const { attendanceId } = req.params;

    logger.info(`PDF download requested for attendance ${attendanceId} by participant ${participantId}`);

    // Verify attendance belongs to this participant
    const attendance = await prisma.attendanceRecord.findFirst({
      where: {
        id: attendanceId,
        participantId,
      },
      include: {
        courtCard: true,
        participant: {
          include: {
            courtRep: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!attendance) {
      logger.warn(`Attendance record not found: ${attendanceId} for participant ${participantId}`);
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
      });
    }

    if (!attendance.courtCard) {
      logger.warn(`Court Card not yet generated for attendance: ${attendanceId}`);
      return res.status(404).json({
        success: false,
        error: 'Court Card not yet generated',
      });
    }

    logger.info(`Generating PDF for court card: ${attendance.courtCard.cardNumber}`);

    // Generate PDF with court card data
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CourtCard_${attendance.courtCard.cardNumber}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);
    
    // Handle PDF generation errors
    doc.on('error', (err: any) => {
      logger.error('PDF generation error:', err);
    });

    // Add content
    doc.fontSize(20).text('ProofMeet Court Card', { align: 'center' });
    doc.moveDown();

    // Card information
    doc.fontSize(14).text(`Card Number: ${attendance.courtCard.cardNumber}`, { bold: true });
    doc.fontSize(12).text(`Participant: ${attendance.courtCard.participantName}`);
    doc.text(`Case Number: ${attendance.courtCard.caseNumber}`);
    doc.text(`Court Rep: ${attendance.courtCard.courtRepName}`);
    doc.moveDown();

    // Meeting information
    doc.fontSize(14).text('Meeting Details', { underline: true });
    doc.fontSize(12).text(`Meeting: ${attendance.courtCard.meetingName}`);
    doc.text(`Program: ${attendance.courtCard.meetingProgram}`);
    doc.text(`Date: ${new Date(attendance.courtCard.meetingDate).toLocaleDateString()}`);
    doc.text(`Scheduled Duration: ${attendance.courtCard.meetingDurationMin} minutes`);
    doc.moveDown();

    // Attendance metrics
    doc.fontSize(14).text('Attendance Metrics', { underline: true });
    doc.fontSize(12).text(`Time Joined: ${new Date(attendance.courtCard.joinTime).toLocaleTimeString()}`);
    doc.text(`Time Left: ${new Date(attendance.courtCard.leaveTime).toLocaleTimeString()}`);
    doc.text(`Total Duration: ${attendance.courtCard.totalDurationMin} minutes`);
    doc.text(`Attendance: ${attendance.courtCard.attendancePercent.toFixed(1)}%`);
    doc.moveDown();

    // Validation status
    doc.fontSize(14).text('Validation Status', { underline: true });
    const status = attendance.courtCard.validationStatus === 'PASSED' ? 'COMPLIANT' : 'NON-COMPLIANT';
    doc.fontSize(12).text(`Status: ${status}`, { 
      bold: true,
      color: attendance.courtCard.validationStatus === 'PASSED' ? 'green' : 'red',
    });
    doc.text(`Confidence Level: ${attendance.courtCard.confidenceLevel}`);
    doc.text(`Verification Method: ${attendance.courtCard.verificationMethod}`);
    doc.moveDown();

    // QR Code and verification
    doc.fontSize(10).text('Verification URL:', { continued: false });
    doc.text(attendance.courtCard.verificationUrl, { link: attendance.courtCard.verificationUrl });
    doc.moveDown();

    doc.fontSize(8).text(`Generated: ${new Date(attendance.courtCard.generatedAt).toLocaleString()}`, { align: 'center' });

    // Finalize PDF
    doc.end();

    logger.info(`Court Card PDF generated for participant ${participantId}, attendance ${attendanceId}`);
  } catch (error: any) {
    logger.error('Generate court card PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as participantRoutes };

