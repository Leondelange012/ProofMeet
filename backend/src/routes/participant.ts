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

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { authenticate, requireParticipant } from '../middleware/auth';
import { generateCourtCard, getCourtCard, verifyCourtCard } from '../services/courtCardService';
import { queueDailyDigest, sendAttendanceConfirmation } from '../services/emailService';

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

    // Get recent meetings
    const recentMeetings = await prisma.attendanceRecord.findMany({
      where: { participantId },
      orderBy: { meetingDate: 'desc' },
      take: 5,
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
        } : null,
        recentMeetings: recentMeetings.map(record => ({
          id: record.id,
          meetingName: record.meetingName,
          date: record.meetingDate,
          duration: record.totalDurationMin,
          attendancePercentage: record.attendancePercent,
          status: record.status,
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
 * GET /api/participant/meetings/available
 * Get all available external meetings
 */
router.get('/meetings/available', async (req: Request, res: Response) => {
  try {
    const program = req.query.program as string;
    const format = req.query.format as string;
    const day = req.query.day as string;

    const where: any = {
      hasProofCapability: true,
    };

    if (program) where.program = program;
    if (format) where.format = format;
    if (day) where.dayOfWeek = day;

    const meetings = await prisma.externalMeeting.findMany({
      where,
      orderBy: [
        { program: 'asc' },
        { dayOfWeek: 'asc' },
        { time: 'asc' },
      ],
    });

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
      const durationMinutes = Math.floor((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60));

      // Calculate attendance percentage (simplified for now)
      const expectedDuration = attendance.externalMeeting?.durationMinutes || 60;
      const attendancePercent = Math.min((durationMinutes / expectedDuration) * 100, 100);

      // Update attendance record
      const updated = await prisma.attendanceRecord.update({
        where: { id: attendanceId },
        data: {
          leaveTime,
          totalDurationMin: durationMinutes,
          activeDurationMin: durationMinutes, // TODO: Calculate based on activity tracking
          idleDurationMin: 0,
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
      if (req.user?.courtRepId && courtCard) {
        try {
          await queueDailyDigest(req.user.courtRepId, [attendanceId]);
          logger.info(`Queued daily digest for Court Rep ${req.user.courtRepId}`);
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
            durationMinutes,
            Number(attendancePercent),
            courtCard.cardNumber
          );
          logger.info(`Attendance confirmation sent to ${req.user!.email}`);
        } catch (error: any) {
          logger.error(`Failed to send confirmation: ${error.message}`);
        }
      }

      logger.info(`Participant ${participantId} left meeting, duration: ${durationMinutes}min`);

      res.json({
        success: true,
        message: 'Meeting attendance recorded successfully',
        data: {
          attendanceId: updated.id,
          duration: durationMinutes,
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

export { router as participantRoutes };

