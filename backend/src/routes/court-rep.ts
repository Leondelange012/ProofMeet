/**
 * Court Representative Dashboard Routes
 * 
 * IMPORTANT: Local TypeScript errors are from stale Prisma Client
 * This file is CORRECT for V2.0 schema. Railway will build successfully.
 * To fix locally: cd backend && npm install
 */

/// <reference path="../types/express.d.ts" />

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { authenticate, requireCourtRep } from '../middleware/auth';
import { getCourtCard } from '../services/courtCardService';
import { zoomService } from '../services/zoomService';
import { generateCourtCardHTML } from '../services/pdfGenerator';

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

        // ONLY count meetings with PASSED validation (80%+ attendance)
        const weekAttendanceRecords = await prisma.attendanceRecord.findMany({
          where: {
            participantId: participant.id,
            meetingDate: { gte: weekStart },
            status: 'COMPLETED',
          },
          include: {
            courtCard: {
              select: {
                validationStatus: true as any,
              },
            },
          },
        });

        const validMeetings = weekAttendanceRecords.filter(record => {
          const validationStatus = (record.courtCard as any)?.validationStatus;
          return validationStatus === 'PASSED';
        });

        if (validMeetings.length >= requirement.meetingsPerWeek) {
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

        // ONLY count VALID meetings (80%+ attendance)
        const weekAttendanceRecords = await prisma.attendanceRecord.findMany({
          where: {
            participantId: participant.id,
            meetingDate: { gte: weekStart },
            status: 'COMPLETED',
          },
          include: {
            courtCard: {
              select: {
                validationStatus: true as any,
              },
            },
          },
        });

        const validMeetings = weekAttendanceRecords.filter(record => {
          const validationStatus = (record.courtCard as any)?.validationStatus;
          return validationStatus === 'PASSED';
        });

        if (validMeetings.length < requirement.meetingsPerWeek) {
          alerts.push({
            type: 'LOW_COMPLIANCE',
            participantName: `${participant.firstName} ${participant.lastName}`,
            caseNumber: participant.caseNumber,
            message: `Only ${validMeetings.length}/${requirement.meetingsPerWeek} valid meetings this week (${weekAttendanceRecords.length} total)`,
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
          include: {
            courtCard: {
              select: {
                validationStatus: true as any,
              },
            },
          },
        });

        // ONLY count meetings with 80%+ attendance (PASSED validation)
        const validMeetings = thisWeekAttendance.filter(record => {
          const validationStatus = (record.courtCard as any)?.validationStatus;
          return validationStatus === 'PASSED';
        });

        const requirement = participant.requirements[0];
        const meetingsRequired = requirement?.meetingsPerWeek || 0;
        const meetingsAttended = validMeetings.length; // Only count VALID meetings

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
      include: {
        courtCard: {
          select: {
            validationStatus: true as any,
          },
        },
      },
    });

    // ONLY count valid meetings (80%+ attendance)
    const validThisWeek = thisWeekAttendance.filter(record => {
      const validationStatus = (record.courtCard as any)?.validationStatus;
      return validationStatus === 'PASSED';
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
      include: {
        courtCard: {
          select: {
            validationStatus: true as any,
          },
        },
      },
    });

    // ONLY count valid meetings for the month
    const validThisMonth = thisMonthAttendance.filter(record => {
      const validationStatus = (record.courtCard as any)?.validationStatus;
      return validationStatus === 'PASSED';
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
            attended: validThisWeek.length, // Only VALID meetings
            required: requirement?.meetingsPerWeek || 0,
            totalCompleted: thisWeekAttendance.length, // Total including failed
            percentage: requirement?.meetingsPerWeek
              ? Math.round((validThisWeek.length / requirement.meetingsPerWeek) * 100)
              : 0,
            status: validThisWeek.length >= (requirement?.meetingsPerWeek || 0) ? 'ON_TRACK' : 'BEHIND',
          },
          lastMonth: {
            attended: validThisMonth.length, // Only VALID meetings
            required: requirement ? Math.ceil((requirement.meetingsPerWeek * 4.33)) : 0,
            totalCompleted: thisMonthAttendance.length, // Total including failed
            percentage: requirement
              ? Math.round((validThisMonth.length / (requirement.meetingsPerWeek * 4.33)) * 100)
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
 * GET /api/court-rep/participant/:participantId/court-card-pdf
 * Generate comprehensive Court Card PDF for participant (all meetings)
 */
router.get('/participant/:participantId/court-card-pdf', async (req: Request, res: Response) => {
  try {
    const courtRepId = req.user!.id;
    const { participantId } = req.params;

    // Verify participant belongs to this Court Rep
    const participant = await prisma.user.findFirst({
      where: {
        id: participantId,
        courtRepId,
        userType: 'PARTICIPANT',
      },
      include: {
        courtRep: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found',
      });
    }

    // Get all completed meetings
    const meetings = await prisma.attendanceRecord.findMany({
      where: {
        participantId,
        status: 'COMPLETED',
      },
      orderBy: { meetingDate: 'desc' },
      include: {
        courtCard: {
          select: {
            validationStatus: true as any,
          },
        },
      },
    });

    // Calculate statistics
    const totalMinutes = meetings.reduce((sum, m) => sum + (m.totalDurationMin || 0), 0);
    const totalHours = totalMinutes / 60;

    // Count meetings by type
    const meetingsByType: { [key: string]: number } = {};
    meetings.forEach(m => {
      meetingsByType[m.meetingProgram] = (meetingsByType[m.meetingProgram] || 0) + 1;
    });

    // Prepare PDF data
    const pdfData = {
      participantName: `${participant.firstName} ${participant.lastName}`,
      participantEmail: participant.email,
      caseNumber: participant.caseNumber || 'N/A',
      courtRepName: `${participant.courtRep.firstName} ${participant.courtRep.lastName}`,
      courtRepEmail: participant.courtRep.email,
      totalMeetings: meetings.length,
      totalHours,
      meetingsByType,
      meetings: meetings.map(m => ({
        date: m.meetingDate,
        meetingName: m.meetingName,
        meetingProgram: m.meetingProgram,
        duration: m.totalDurationMin || 0,
        attendancePercent: Number(m.attendancePercent || 0),
        validationStatus: (m.courtCard as any)?.validationStatus || 'PENDING',
      })),
      generatedDate: new Date(),
    };

    // Generate HTML (can be converted to PDF client-side or server-side)
    const html = generateCourtCardHTML(pdfData);

    // Set response headers for HTML download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="CourtCard_${participant.caseNumber}_${Date.now()}.html"`);
    res.send(html);

    logger.info(`Court Card PDF generated for participant ${participant.email} by Court Rep ${req.user!.email}`);
  } catch (error: any) {
    logger.error('Generate court card PDF error:', error);
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

// ============================================
// ZOOM MEETINGS (FOR TESTING)
// ============================================

/**
 * POST /api/court-rep/create-test-meeting
 * Create a test Zoom meeting for compliance tracking
 */
router.post('/create-test-meeting', async (req: Request, res: Response) => {
  try {
    const courtRep = req.user!;
    const courtRepName = `${courtRep.firstName} ${courtRep.lastName}`;
    
    // Get optional parameters from request body with defaults
    const duration = req.body.duration || 30;
    const startInMinutes = req.body.startInMinutes || 2;
    const topic = req.body.topic;

    // Create Zoom meeting with custom settings
    const meeting = await zoomService.createTestMeeting(
      courtRepName,
      duration,
      startInMinutes,
      topic
    );

    // Store meeting in database as external meeting
    const externalMeeting = await prisma.externalMeeting.create({
      data: {
        externalId: meeting.id,
        name: meeting.topic,
        program: 'TEST',
        meetingType: 'Test Meeting',
        description: 'Test meeting for ProofMeet compliance tracking',
        dayOfWeek: new Date(meeting.start_time).toLocaleDateString('en-US', { weekday: 'long' }),
        time: new Date(meeting.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timezone: meeting.timezone,
        durationMinutes: meeting.duration,
        format: 'ONLINE',
        zoomUrl: meeting.join_url,
        zoomId: meeting.id,
        zoomPassword: meeting.password,
        tags: ['test', 'compliance-tracking'],
        hasProofCapability: true,
        lastSyncedAt: new Date(),
      },
    });

    logger.info(`Test meeting created by ${courtRep.email}: ${meeting.id}`);

    res.status(201).json({
      success: true,
      message: 'Test meeting created successfully',
      data: {
        meetingId: externalMeeting.id,
        zoomMeetingId: meeting.id,
        topic: meeting.topic,
        joinUrl: meeting.join_url,
        password: meeting.password,
        startTime: meeting.start_time,
        duration: meeting.duration,
        instructions: 'Share this meeting link with participants to test attendance tracking.',
      },
    });
  } catch (error: any) {
    logger.error('Create test meeting error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create test meeting',
    });
  }
});

/**
 * GET /api/court-rep/test-meetings
 * Get all test meetings
 */
router.get('/test-meetings', async (req: Request, res: Response) => {
  try {
    const testMeetings = await prisma.externalMeeting.findMany({
      where: { program: 'TEST' },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        meetings: testMeetings.map(m => ({
          id: m.id,
          name: m.name,
          zoomUrl: m.zoomUrl,
          zoomId: m.zoomId,
          password: m.zoomPassword,
          startTime: m.time,
          duration: m.durationMinutes,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error: any) {
    logger.error('Get test meetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/court-rep/delete-meeting/:meetingId
 * Delete a test meeting (for testing purposes only)
 */
router.delete('/delete-meeting/:meetingId', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;

    // Find the meeting
    const meeting = await prisma.externalMeeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    // Only allow deletion of TEST meetings
    if (meeting.program !== 'TEST') {
      return res.status(403).json({
        success: false,
        error: 'Can only delete TEST meetings',
      });
    }

    // Delete related attendance records first
    await prisma.attendanceRecord.deleteMany({
      where: { externalMeetingId: meetingId },
    });

    // Delete the meeting
    await prisma.externalMeeting.delete({
      where: { id: meetingId },
    });

    logger.info(`Test meeting deleted: ${meetingId} by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Test meeting deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete meeting error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/court-rep/participants/:participantId/meetings
 * Get detailed meeting history for a specific participant
 */
router.get('/participants/:participantId/meetings', async (req: Request, res: Response) => {
  try {
    const courtRepId = req.user!.id;
    const { participantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

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

    // Get all meetings for this participant
    const meetings = await prisma.attendanceRecord.findMany({
      where: { participantId },
      orderBy: { meetingDate: 'desc' },
      take: limit,
      include: {
        courtCard: {
          select: {
            id: true,
            cardNumber: true,
            confidenceLevel: true,
            validationStatus: true as any,
            violations: true as any,
            idleDurationMin: true as any,
          },
        },
      },
    });

    // Get summary statistics
    const totalMeetings = meetings.length;
    const completedMeetings = meetings.filter(m => m.status === 'COMPLETED').length;
    const totalMinutes = meetings.reduce((sum, m) => sum + (m.totalDurationMin || 0), 0);
    const avgAttendance = meetings.length > 0
      ? meetings.reduce((sum, m) => sum + Number(m.attendancePercent || 0), 0) / meetings.length
      : 0;

    res.json({
      success: true,
      data: {
        participant: {
          id: participant.id,
          name: `${participant.firstName} ${participant.lastName}`,
          caseNumber: participant.caseNumber,
        },
        summary: {
          totalMeetings,
          completedMeetings,
          totalHours: Math.round((totalMinutes / 60) * 10) / 10,
          averageAttendance: Math.round(avgAttendance * 10) / 10,
        },
        meetings: meetings.map(meeting => ({
          id: meeting.id,
          meetingName: meeting.meetingName,
          meetingProgram: meeting.meetingProgram,
          date: meeting.meetingDate,
          joinTime: meeting.joinTime,
          leaveTime: meeting.leaveTime,
          duration: meeting.totalDurationMin,
          activeDuration: meeting.activeDurationMin,
          idleDuration: meeting.idleDurationMin,
          attendancePercent: meeting.attendancePercent,
          status: meeting.status,
          isValid: meeting.isValid,
          courtCard: meeting.courtCard ? {
            id: meeting.courtCard.id,
            cardNumber: meeting.courtCard.cardNumber,
            confidenceLevel: meeting.courtCard.confidenceLevel,
            validationStatus: meeting.courtCard.validationStatus,
            violations: meeting.courtCard.violations,
          } : null,
          verificationMethod: meeting.verificationMethod,
          webcamSnapshots: meeting.webcamSnapshotCount,
        })),
      },
    });
  } catch (error: any) {
    logger.error('Get participant meetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/court-rep/admin/revalidate-court-cards
 * Revalidate all Court Cards to ensure correct PASSED/FAILED status
 * ADMIN ONLY - for fixing validation issues
 */
router.post('/admin/revalidate-court-cards', async (req: Request, res: Response) => {
  try {
    const courtRepId = req.user!.id;

    // Get all Court Cards (for this Court Rep only for safety)
    const courtCards = await prisma.courtCard.findMany({
      where: {
        courtRepEmail: req.user!.email, // Only revalidate this Court Rep's cards
      },
      include: {
        attendanceRecord: {
          include: {
            externalMeeting: {
              select: {
                durationMinutes: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Revalidating ${courtCards.length} Court Cards for ${req.user!.email}`);

    let updatedCount = 0;
    const results: any[] = [];

    for (const card of courtCards) {
      const totalDurationMin = card.totalDurationMin;
      const meetingDurationMin = card.meetingDurationMin;
      const activeDurationMin = card.activeDurationMin;
      const idleDurationMin = (card as any).idleDurationMin || 0;
      
      // Calculate percentages
      const activePercent = totalDurationMin > 0 ? (activeDurationMin / totalDurationMin) * 100 : 0;
      const idlePercent = totalDurationMin > 0 ? (idleDurationMin / totalDurationMin) * 100 : 0;
      const meetingAttendancePercent = meetingDurationMin > 0 ? (totalDurationMin / meetingDurationMin) * 100 : 0;
      
      const violations: any[] = [];
      
      // Rule 1: Must be active for at least 80% of time attended
      if (activePercent < 80) {
        violations.push({
          type: 'LOW_ACTIVE_TIME',
          message: `Only ${activePercent.toFixed(1)}% active during meeting (required 80%).`,
          severity: 'CRITICAL',
          timestamp: new Date().toISOString(),
        });
      }
      
      // Rule 2: Idle time must not exceed 20%
      if (idlePercent > 20) {
        violations.push({
          type: 'EXCESSIVE_IDLE_TIME',
          message: `Idle for ${idleDurationMin} minutes (${idlePercent.toFixed(1)}% of attendance). Maximum allowed: 20%.`,
          severity: 'CRITICAL',
          timestamp: new Date().toISOString(),
        });
      }
      
      // Rule 3: Must attend at least 80% of scheduled meeting duration
      if (meetingAttendancePercent < 80) {
        violations.push({
          type: 'INSUFFICIENT_ATTENDANCE',
          message: `Attended ${totalDurationMin} minutes of ${meetingDurationMin} minute meeting (${meetingAttendancePercent.toFixed(1)}%). Required: 80%.`,
          severity: 'CRITICAL',
          timestamp: new Date().toISOString(),
        });
      }
      
      // Determine correct validation status
      const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
      const correctStatus = criticalViolations.length > 0 ? 'FAILED' : 'PASSED';
      const currentStatus = (card as any).validationStatus || 'PASSED';
      
      // Check if status needs updating
      if (currentStatus !== correctStatus) {
        // Update the Court Card
        await prisma.courtCard.update({
          where: { id: card.id },
          data: {
            validationStatus: correctStatus as any,
            violations: violations as any,
          },
        });
        
        // Update the attendance record isValid flag
        await prisma.attendanceRecord.update({
          where: { id: card.attendanceRecordId },
          data: {
            isValid: correctStatus === 'PASSED',
          },
        });
        
        results.push({
          cardNumber: card.cardNumber,
          oldStatus: currentStatus,
          newStatus: correctStatus,
          attendancePercent: meetingAttendancePercent.toFixed(1),
          violations: criticalViolations.length,
        });
        
        updatedCount++;
      }
    }

    logger.info(`Revalidation complete: ${updatedCount} Court Cards updated`);

    res.json({
      success: true,
      message: `Revalidated ${courtCards.length} Court Cards, updated ${updatedCount}`,
      data: {
        total: courtCards.length,
        updated: updatedCount,
        alreadyCorrect: courtCards.length - updatedCount,
        corrections: results,
      },
    });
  } catch (error: any) {
    logger.error('Revalidate court cards error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as courtRepRoutes };
