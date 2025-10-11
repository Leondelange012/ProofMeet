import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { logger } from '../utils/logger';

const router = Router();

// Generate compliance report
router.post('/report', [
  body('userId').isString(),
  body('courtOrderId').isString(),
  body('reportPeriodStart').isISO8601(),
  body('reportPeriodEnd').isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, courtOrderId, reportPeriodStart, reportPeriodEnd } = req.body;

    // Get court order details
    const courtOrder = await prisma.courtOrder.findUnique({
      where: { id: courtOrderId }
    });

    if (!courtOrder) {
      return res.status(404).json({
        success: false,
        error: 'Court order not found'
      });
    }

    // Get attendance records for the period
    const attendances = await prisma.attendanceRecord.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(reportPeriodStart),
          lte: new Date(reportPeriodEnd)
        },
        isApproved: true
      },
      include: {
        meeting: true,
        flags: true
      }
    });

    // Calculate compliance metrics
    const totalMeetingsRequired = Math.ceil(
      (courtOrder.frequency * 
       (new Date(reportPeriodEnd).getTime() - new Date(reportPeriodStart).getTime()) / 
       (1000 * 60 * 60 * 24 * 7)) // weeks in period
    );
    
    const totalMeetingsAttended = attendances.length;
    const compliancePercentage = (totalMeetingsAttended / totalMeetingsRequired) * 100;

    // Collect all flags
    const allFlags = attendances.flatMap(attendance => 
      attendance.flags.map(flag => ({
        ...flag,
        meetingDate: attendance.meeting.scheduledStart,
        meetingType: attendance.meeting.meetingType
      }))
    );

    // Create compliance report
    const complianceReport = await prisma.complianceReport.create({
      data: {
        userId,
        courtOrderId,
        reportPeriodStart: new Date(reportPeriodStart),
        reportPeriodEnd: new Date(reportPeriodEnd),
        totalMeetingsRequired,
        totalMeetingsAttended,
        compliancePercentage,
        generatedBy: 'system' // TODO: Get from authenticated user
      }
    });

    logger.info(`Compliance report generated: ${complianceReport.id} for user ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        ...complianceReport,
        attendanceRecords: attendances,
        flags: allFlags
      }
    });

  } catch (error) {
    logger.error('Generate compliance report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get compliance reports for user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [reports, total] = await Promise.all([
      prisma.complianceReport.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { generatedAt: 'desc' },
        include: {
          courtOrder: {
            select: {
              id: true,
              courtCaseNumber: true,
              frequency: true,
              duration: true,
              meetingTypes: true
            }
          }
        }
      }),
      prisma.complianceReport.count({ where: { userId } })
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });

  } catch (error) {
    logger.error('Get compliance reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get compliance dashboard data for PO/Judge
router.get('/dashboard', async (req, res) => {
  try {
    const { state, courtId, startDate, endDate } = req.query;

    const whereClause: any = {};
    
    if (state) {
      whereClause.user = { state };
    }
    
    if (courtId) {
      whereClause.user = { ...whereClause.user, courtId };
    }

    if (startDate && endDate) {
      whereClause.generatedAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const reports = await prisma.complianceReport.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            courtId: true,
            state: true,
            isVerified: true
          }
        },
        courtOrder: {
          select: {
            courtCaseNumber: true,
            frequency: true,
            meetingTypes: true
          }
        }
      },
      orderBy: { generatedAt: 'desc' }
    });

    // Calculate summary statistics
    const totalUsers = new Set(reports.map(r => r.userId)).size;
    const averageCompliance = reports.length > 0 
      ? reports.reduce((sum, r) => sum + r.compliancePercentage, 0) / reports.length 
      : 0;
    
    const nonCompliantUsers = reports.filter(r => r.compliancePercentage < 80).length;

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          averageCompliance,
          nonCompliantUsers,
          totalReports: reports.length
        },
        reports
      }
    });

  } catch (error) {
    logger.error('Get compliance dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as complianceRoutes };
