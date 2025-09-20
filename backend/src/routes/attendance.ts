import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { AttendanceApprovalRequest } from '@/types';

const router = Router();

// Join meeting (online)
router.post('/join', [
  body('meetingId').isString(),
  body('userId').isString(),
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

    const { meetingId, userId } = req.body;

    // Check if meeting exists and is active
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    });

    if (!meeting || !meeting.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found or inactive'
      });
    }

    // Check if user already has attendance record
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        meetingId,
        isComplete: false
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'User already joined this meeting'
      });
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId,
        meetingId,
        joinTime: new Date(),
        duration: 0,
        attendancePercentage: 0,
        isComplete: false
      }
    });

    logger.info(`User joined meeting: ${userId} -> ${meetingId}`);

    res.status(201).json({
      success: true,
      data: attendance
    });

  } catch (error) {
    logger.error('Join meeting error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Leave meeting (online)
router.post('/leave', [
  body('attendanceId').isString(),
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

    const { attendanceId } = req.body;

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { meeting: true }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
    }

    const leaveTime = new Date();
    const joinTime = attendance.joinTime || new Date();
    const duration = Math.floor((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60)); // minutes

    // Calculate attendance percentage
    const meetingDuration = Math.floor(
      (attendance.meeting.scheduledEnd.getTime() - attendance.meeting.scheduledStart.getTime()) / (1000 * 60)
    );
    const attendancePercentage = Math.min((duration / meetingDuration) * 100, 100);

    // Check for flags
    const flags = [];
    if (duration < meetingDuration * 0.9) {
      flags.push({
        type: 'EARLY_LEAVE',
        message: 'Left meeting early',
        severity: 'MEDIUM'
      });
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        leaveTime,
        duration,
        attendancePercentage,
        isComplete: true,
        flags: {
          create: flags
        }
      }
    });

    logger.info(`User left meeting: ${attendanceId}, duration: ${duration}min`);

    res.json({
      success: true,
      data: updatedAttendance
    });

  } catch (error) {
    logger.error('Leave meeting error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Approve attendance (host action)
router.post('/approve', [
  body('attendanceId').isString(),
  body('approved').isBoolean(),
  body('hostSignature').isString(),
  body('notes').optional().isString(),
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

    const { attendanceId, approved, hostSignature, notes }: AttendanceApprovalRequest = req.body;

    // TODO: Add authentication middleware to get hostId from JWT
    const hostId = 'temp-host-id';

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { meeting: true }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
    }

    // Verify host is authorized for this meeting
    if (attendance.meeting.hostId !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to approve this attendance'
      });
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        isApproved: approved,
        approvedBy: hostId,
        approvedAt: new Date()
      }
    });

    logger.info(`Attendance approved: ${attendanceId} by ${hostId} - ${approved}`);

    res.json({
      success: true,
      data: updatedAttendance
    });

  } catch (error) {
    logger.error('Approve attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get attendance records for user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: {
              id: true,
              meetingType: true,
              meetingFormat: true,
              scheduledStart: true,
              scheduledEnd: true,
              location: true
            }
          },
          flags: true
        }
      }),
      prisma.attendance.count({ where: { userId } })
    ]);

    res.json({
      success: true,
      data: attendances,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });

  } catch (error) {
    logger.error('Get attendance records error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as attendanceRoutes };
