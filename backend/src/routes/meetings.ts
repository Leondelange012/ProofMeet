import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { CreateMeetingRequest, MeetingType, MeetingFormat } from '@/types';

const router = Router();

// Create new meeting
router.post('/create', [
  body('meetingType').isIn(['AA', 'NA', 'SMART', 'LifeRing', 'Other']),
  body('meetingFormat').isIn(['online', 'in-person']),
  body('scheduledStart').isISO8601(),
  body('scheduledEnd').isISO8601(),
  body('location').optional().isString(),
  body('zoomMeetingId').optional().isString(),
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

    const {
      meetingType,
      meetingFormat,
      scheduledStart,
      scheduledEnd,
      location,
      zoomMeetingId
    }: CreateMeetingRequest = req.body;

    // TODO: Add authentication middleware to get hostId from JWT
    const hostId = 'temp-host-id'; // This should come from authenticated user

    // Validate meeting format requirements
    if (meetingFormat === 'online' && !zoomMeetingId) {
      return res.status(400).json({
        success: false,
        error: 'Zoom meeting ID required for online meetings'
      });
    }

    if (meetingFormat === 'in-person' && !location) {
      return res.status(400).json({
        success: false,
        error: 'Location required for in-person meetings'
      });
    }

    // Generate QR code for in-person meetings
    let qrCode: string | undefined;
    if (meetingFormat === 'in-person') {
      // TODO: Implement QR code generation
      qrCode = `qr-${Date.now()}`;
    }

    const meeting = await prisma.meeting.create({
      data: {
        hostId,
        meetingType: meetingType as MeetingType,
        meetingFormat: meetingFormat.toUpperCase() as MeetingFormat,
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        meetingId: zoomMeetingId,
        qrCode,
        location
      }
    });

    logger.info(`Meeting created: ${meeting.id} by host ${hostId}`);

    res.status(201).json({
      success: true,
      data: meeting
    });

  } catch (error) {
    logger.error('Meeting creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get meetings for a host
router.get('/host/:hostId', async (req, res) => {
  try {
    const { hostId } = req.params;
    const { page = '1', limit = '10', status = 'active' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const whereClause = {
      hostId,
      ...(status === 'active' ? { isActive: true } : {})
    };

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: { scheduledStart: 'desc' },
        include: {
          attendances: {
            include: {
              user: {
                select: {
                  id: true,
                  courtId: true,
                  state: true
                }
              }
            }
          }
        }
      }),
      prisma.meeting.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: meetings,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });

  } catch (error) {
    logger.error('Get meetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get meeting by ID
router.get('/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        host: {
          select: {
            id: true,
            email: true,
            courtId: true
          }
        },
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                courtId: true,
                state: true
              }
            },
            flags: true
          }
        }
      }
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      data: meeting
    });

  } catch (error) {
    logger.error('Get meeting error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update meeting status
router.patch('/:meetingId/status', [
  body('isActive').isBoolean(),
], async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { isActive } = req.body;

    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: { isActive }
    });

    logger.info(`Meeting status updated: ${meetingId} - ${isActive}`);

    res.json({
      success: true,
      data: meeting
    });

  } catch (error) {
    logger.error('Update meeting status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as meetingRoutes };
