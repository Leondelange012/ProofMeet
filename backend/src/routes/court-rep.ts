/**
 * Court Representative Dashboard Routes
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
import { authenticate, requireCourtRep } from '../middleware/auth';
import { getCourtCard } from '../services/courtCardService';

const router = Router();

// All routes require authentication and Court Rep role
router.use(authenticate);
router.use(requireCourtRep);

// ============================================
// DASHBOARD OVERVIEW
// ============================================

/**
 * GET /api/court-rep/dashboard
 * Get dashboard overview with statistics
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const courtRepId = req.user!.id;

    // Get all participants for this Court Rep
    const participants = await prisma.user.findMany({
      where: {
        courtRepId,
        userType: 'PARTICIPANT',
      },
      include: {
        attendance: {
          where: {
            meetingDate: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7)), // Last 7 days
            },
          },
        },
        requirements: {
          where: { isActive: true },
        },
      },
    });

    // Calculate statistics
    const totalParticipants = participants.length;
    const activeThisWeek = participants.filter(p => p.attendance.length > 0).length;

    // Get today's meetings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const meetingsToday = await prisma.attendanceRecord.count({
      where: {
        courtRepId,
        meetingDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Calculate compliance rate
    const participantsWithRequirements = participants.filter(p => p.requirements.length > 0);
    let compliantCount = 0;

    for (const participant of participantsWithRequirements) {
      if (participant.requirements.length > 0) {
        const requirement = participant.requirements[0];
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
        weekStart.setHours(0, 0, 0, 0);

        const weekAttendance = await prisma.attendanceRecord.count({
          where: {
            participantId: participant.id,
            meetingDate: { gte: weekStart },
            status: 'COMPLETED',
          },
        });

        if (weekAttendance >= requirement.meetingsPerWeek) {
          compliantCount++;
        }
      }
    }

    const complianceRate = participantsWithRequirements.length > 0
      ? (compliantCount / participantsWithRequirements.length) * 100
      : 0;

    // Get recent activity (last 10 attendance records)
    const recentActivity = await prisma.attendanceRecord.findMany({
      where: { courtRepId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        participant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            caseNumber: true,
          },
        },
      },
    });

    // Get alerts (participants not meeting requirements)
    const alerts = [];
    for (const participant of participantsWithRequirements) {
      if (participant.requirements.length > 0) {
        const requirement = participant.requirements[0];
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekAttendance = await prisma.attendanceRecord.count({
          where: {
            participantId: participant.id,
            meetingDate: { gte: weekStart },
            status: 'COMPLETED',
          },
        });

        if (weekAttendance < requirement.meetingsPerWeek) {
          alerts.push({
            type: 'LOW_COMPLIANCE',
            participantName: `${participant.firstName} ${participant.lastName}`,
            caseNumber: participant.caseNumber,
            message: `Only ${weekAttendance}/${requirement.meetingsPerWeek} required meetings this week`,
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalParticipants,
          activeThisWeek,
          complianceRate: Math.round(complianceRate * 10) / 10,
          meetingsToday,
        },
        recentActivity: recentActivity.map(record => ({
          id: record.id,
          participantName: `${record.participant.firstName} ${record.participant.lastName}`,
          participantId: record.participantId,
          caseNumber: record.participant.caseNumber,
          meetingName: record.meetingName,
          meetingProgram: record.meetingProgram,
          completedAt: record.leaveTime || record.createdAt,
          duration: record.totalDurationMin,
          attendancePercentage: record.attendancePercent,
          status: record.status,
        })),
        alerts,
      },
    });
  } catch (error: any) {
    logger.error('Court Rep dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// PARTICIPANTS MANAGEMENT
// ============================================

/**
 * GET /api/court-rep/participants
 * Get all participants for this Court Rep
 */
router.get('/participants', async (req: Request, res: Response) => {
  try {
    const courtRepId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string; // compliant, at_risk, non_compliant
    const skip = (page - 1) * limit;

    // Get all participants
    const participants = await prisma.user.findMany({
      where: {
        courtRepId,
        userType: 'PARTICIPANT',
      },
      skip,
      take: limit,
      orderBy: { lastName: 'asc' },
      include: {
        requirements: {
          where: { isActive: true },
        },
        attendance: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
      },
    });

    const total = await prisma.user.count({
      where: {
        courtRepId,
        userType: 'PARTICIPANT',
      },
    });

    // Calculate compliance for each participant
    const participantsWithStats = await Promise.all(
      participants.map(async (participant) => {
        // This week stats
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const thisWeekAttendance = await prisma.attendanceRecord.findMany({
          where: {
            participantId: participant.id,
            meetingDate: { gte: weekStart },
            status: 'COMPLETED',
          },
        });

        const requirement = participant.requirements[0];
        const meetingsRequired = requirement?.meetingsPerWeek || 0;
        const meetingsAttended = thisWeekAttendance.length;

        // Calculate average attendance percentage
        const avgAttendance = thisWeekAttendance.length > 0
          ? thisWeekAttendance.reduce((sum, r) => sum + Number(r.attendancePercent || 0), 0) / thisWeekAttendance.length
          : 0;

        // Determine status
        let complianceStatus: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT' = 'COMPLIANT';
        if (meetingsRequired > 0) {
          if (meetingsAttended === 0) {
            complianceStatus = 'NON_COMPLIANT';
          } else if (meetingsAttended < meetingsRequired) {
            complianceStatus = 'AT_RISK';
          }
        }

        // All-time stats
        const allTimeAttendance = await prisma.attendanceRecord.findMany({
          where: {
            participantId: participant.id,
            status: 'COMPLETED',
          },
        });

        const totalHours = allTimeAttendance.reduce((sum, r) => sum + (r.totalDurationMin || 0), 0) / 60;
        const allTimeAvgAttendance = allTimeAttendance.length > 0
          ? allTimeAttendance.reduce((sum, r) => sum + Number(r.attendancePercent || 0), 0) / allTimeAttendance.length
          : 0;

        return {
          id: participant.id,
          firstName: participant.firstName,
          lastName: participant.lastName,
          email: participant.email,
          caseNumber: participant.caseNumber,
          registeredAt: participant.createdAt,
          lastActivity: participant.lastLogin,
          thisWeek: {
            meetingsAttended,
            meetingsRequired,
            averageAttendance: Math.round(avgAttendance * 10) / 10,
            status: complianceStatus,
          },
          allTime: {
            totalMeetings: allTimeAttendance.length,
            totalHours: Math.round(totalHours * 10) / 10,
            averageAttendance: Math.round(allTimeAvgAttendance * 10) / 10,
          },
        };
      })
    );

    // Filter by status if provided
    const filteredParticipants = status
      ? participantsWithStats.filter(p => p.thisWeek.status === status.toUpperCase())
      : participantsWithStats;

    res.json({
      success: true,
      data: filteredParticipants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error('Get participants error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/court-rep/participants/:participantId
 * Get detailed information about a specific participant
 */
router.get('/participants/:participantId', async (req: Request, res: Response) => {
  try {
    const courtRepId = req.user!.id;
    const { participantId } = req.params;

    // Get participant
    const participant = await prisma.user.findFirst({
      where: {
        id: participantId,
        courtRepId,
        userType: 'PARTICIPANT',
      },
      include: {
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

    // Get compliance stats
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

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thisMonthAttendance = await prisma.attendanceRecord.findMany({
      where: {
        participantId,
        meetingDate: { gte: monthStart },
        status: 'COMPLETED',
      },
    });

    // Get recent meetings
    const recentMeetings = await prisma.attendanceRecord.findMany({
      where: { participantId },
      orderBy: { meetingDate: 'desc' },
      take: 20,
      include: {
        courtCard: true,
      },
    });

    const requirement = participant.requirements[0];

    res.json({
      success: true,
      data: {
        participant: {
          id: participant.id,
          firstName: participant.firstName,
          lastName: participant.lastName,
          email: participant.email,
          caseNumber: participant.caseNumber,
          phoneNumber: participant.phoneNumber,
          registeredAt: participant.createdAt,
        },
        requirements: requirement ? {
          meetingsPerWeek: requirement.meetingsPerWeek,
          requiredPrograms: requirement.requiredPrograms,
          minimumDuration: requirement.minimumDurationMinutes,
          minimumAttendance: requirement.minimumAttendancePercent,
        } : null,
        compliance: {
          currentWeek: {
            attended: thisWeekAttendance.length,
            required: requirement?.meetingsPerWeek || 0,
            percentage: requirement?.meetingsPerWeek
              ? Math.round((thisWeekAttendance.length / requirement.meetingsPerWeek) * 100)
              : 0,
            status: thisWeekAttendance.length >= (requirement?.meetingsPerWeek || 0) ? 'ON_TRACK' : 'BEHIND',
          },
          lastMonth: {
            attended: thisMonthAttendance.length,
            required: requirement ? Math.ceil((requirement.meetingsPerWeek * 4.33)) : 0,
            percentage: requirement
              ? Math.round((thisMonthAttendance.length / (requirement.meetingsPerWeek * 4.33)) * 100)
              : 0,
          },
        },
        recentMeetings: recentMeetings.map(record => ({
          id: record.id,
          meetingName: record.meetingName,
          meetingProgram: record.meetingProgram,
          date: record.meetingDate,
          joinTime: record.joinTime,
          leaveTime: record.leaveTime,
          duration: record.totalDurationMin,
          attendancePercentage: record.attendancePercent,
          activitySummary: {
            totalMinutes: record.totalDurationMin,
            activeMinutes: record.activeDurationMin,
            idleMinutes: record.idleDurationMin,
          },
          courtCardId: record.courtCard?.id,
          status: record.isValid ? 'VALID' : 'FLAGGED',
        })),
      },
    });
  } catch (error: any) {
    logger.error('Get participant details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// MEETING REQUIREMENTS
// ============================================

/**
 * POST /api/court-rep/participants/:participantId/requirements
 * Set meeting requirements for a participant
 */
router.post(
  '/participants/:participantId/requirements',
  [
    body('meetingsPerWeek').isInt({ min: 0 }),
    body('requiredPrograms').optional().isArray(),
    body('minimumDurationMinutes').optional().isInt({ min: 0 }),
    body('minimumAttendancePercentage').optional().isFloat({ min: 0, max: 100 }),
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

      const courtRepId = req.user!.id;
      const { participantId } = req.params;
      const {
        meetingsPerWeek,
        requiredPrograms = [],
        minimumDurationMinutes = 60,
        minimumAttendancePercentage = 90,
      } = req.body;

      // Verify participant belongs to this Court Rep
      const participant = await prisma.user.findFirst({
        where: {
          id: participantId,
          courtRepId,
          userType: 'PARTICIPANT',
        },
      });

      if (!participant) {
        return res.status(404).json({
          success: false,
          error: 'Participant not found',
        });
      }

      // Deactivate existing requirements
      await prisma.meetingRequirement.updateMany({
        where: {
          participantId,
          isActive: true,
        },
        data: { isActive: false },
      });

      // Create new requirement
      const requirement = await prisma.meetingRequirement.create({
        data: {
          participantId,
          courtRepId,
          createdById: courtRepId,
          meetingsPerWeek,
          requiredPrograms,
          minimumDurationMinutes,
          minimumAttendancePercent: minimumAttendancePercentage,
        },
      });

      logger.info(`Requirements set for participant ${participantId} by ${courtRepId}`);

      res.status(201).json({
        success: true,
        message: 'Requirements set successfully',
        data: {
          requirementId: requirement.id,
          participantId,
          meetingsPerWeek,
          requiredPrograms,
          createdAt: requirement.createdAt,
        },
      });
    } catch (error: any) {
      logger.error('Set requirements error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * PUT /api/court-rep/participants/:participantId/requirements
 * Update meeting requirements for a participant
 */
router.put(
  '/participants/:participantId/requirements',
  [
    body('meetingsPerWeek').optional().isInt({ min: 0 }),
    body('requiredPrograms').optional().isArray(),
    body('minimumDurationMinutes').optional().isInt({ min: 0 }),
    body('minimumAttendancePercentage').optional().isFloat({ min: 0, max: 100 }),
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

      const courtRepId = req.user!.id;
      const { participantId } = req.params;

      // Get current active requirement
      const currentRequirement = await prisma.meetingRequirement.findFirst({
        where: {
          participantId,
          courtRepId,
          isActive: true,
        },
      });

      if (!currentRequirement) {
        return res.status(404).json({
          success: false,
          error: 'No active requirements found',
        });
      }

      // Update requirement
      const updated = await prisma.meetingRequirement.update({
        where: { id: currentRequirement.id },
        data: {
          ...(req.body.meetingsPerWeek && { meetingsPerWeek: req.body.meetingsPerWeek }),
          ...(req.body.requiredPrograms && { requiredPrograms: req.body.requiredPrograms }),
          ...(req.body.minimumDurationMinutes && { minimumDurationMinutes: req.body.minimumDurationMinutes }),
          ...(req.body.minimumAttendancePercentage && {
            minimumAttendancePercent: req.body.minimumAttendancePercentage,
          }),
        },
      });

      logger.info(`Requirements updated for participant ${participantId} by ${courtRepId}`);

      res.json({
        success: true,
        message: 'Requirements updated successfully',
        data: {
          requirementId: updated.id,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('Update requirements error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * DELETE /api/court-rep/participants/:participantId/requirements
 * Remove meeting requirements for a participant
 */
router.delete('/participants/:participantId/requirements', async (req: Request, res: Response) => {
  try {
    const courtRepId = req.user!.id;
    const { participantId } = req.params;

    await prisma.meetingRequirement.updateMany({
      where: {
        participantId,
        courtRepId,
        isActive: true,
      },
      data: { isActive: false },
    });

    logger.info(`Requirements removed for participant ${participantId} by ${courtRepId}`);

    res.json({
      success: true,
      message: 'Requirements removed successfully',
    });
  } catch (error: any) {
    logger.error('Remove requirements error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// COURT CARDS & ATTENDANCE REPORTS
// ============================================

/**
 * GET /api/court-rep/court-card/:attendanceId
 * Get Court Card for any participant under this Court Rep
 */
router.get('/court-card/:attendanceId', async (req: Request, res: Response) => {
  try {
    const courtRepId = req.user!.id;
    const { attendanceId } = req.params;

    // Verify attendance belongs to this Court Rep's participants
    const attendance = await prisma.attendanceRecord.findFirst({
      where: {
        id: attendanceId,
        courtRepId,
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
        error: 'Court Card not yet generated',
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
 * GET /api/court-rep/attendance-reports
 * Get attendance reports for all participants
 */
router.get('/attendance-reports', async (req: Request, res: Response) => {
  try {
    const courtRepId = req.user!.id;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const participantId = req.query.participantId as string;
    const program = req.query.program as string;

    const where: any = { courtRepId };

    if (startDate || endDate) {
      where.meetingDate = {};
      if (startDate) where.meetingDate.gte = new Date(startDate);
      if (endDate) where.meetingDate.lte = new Date(endDate);
    }

    if (participantId) where.participantId = participantId;
    if (program) where.meetingProgram = program;

    const reports = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { meetingDate: 'desc' },
      include: {
        participant: {
          select: {
            firstName: true,
            lastName: true,
            caseNumber: true,
          },
        },
        courtCard: {
          select: {
            id: true,
            cardNumber: true,
          },
        },
      },
    });

    // Calculate summary statistics
    const totalMeetings = reports.length;
    const totalParticipants = new Set(reports.map(r => r.participantId)).size;
    const avgAttendance = reports.length > 0
      ? reports.reduce((sum, r) => sum + Number(r.attendancePercent || 0), 0) / reports.length
      : 0;

    res.json({
      success: true,
      data: {
        dateRange: {
          start: startDate || 'All time',
          end: endDate || 'Present',
        },
        summary: {
          totalMeetings,
          totalParticipants,
          averageAttendance: Math.round(avgAttendance * 10) / 10,
        },
        reports: reports.map(record => ({
          attendanceId: record.id,
          participantName: `${record.participant.firstName} ${record.participant.lastName}`,
          caseNumber: record.participant.caseNumber,
          meetingName: record.meetingName,
          meetingProgram: record.meetingProgram,
          date: record.meetingDate,
          duration: record.totalDurationMin,
          attendancePercentage: record.attendancePercent,
          courtCardId: record.courtCard?.id,
          courtCardNumber: record.courtCard?.cardNumber,
        })),
      },
    });
  } catch (error: any) {
    logger.error('Get attendance reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as courtRepRoutes };
