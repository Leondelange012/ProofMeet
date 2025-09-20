import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import QRCode from 'qrcode';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { QRCodeData } from '@/types';

const router = Router();

// Generate QR code for in-person meeting
router.post('/generate', [
  body('meetingId').isString(),
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

    const { meetingId } = req.body;

    // Check if meeting exists and is in-person
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    if (meeting.meetingFormat !== 'IN_PERSON') {
      return res.status(400).json({
        success: false,
        error: 'QR codes only available for in-person meetings'
      });
    }

    // Generate session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create QR code data
    const qrData: QRCodeData = {
      meetingId,
      sessionId,
      type: 'checkin',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    };

    // Generate QR code
    const qrCodeString = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: parseInt(process.env.QR_CODE_SIZE || '256'),
      errorCorrectionLevel: process.env.QR_CODE_ERROR_CORRECTION_LEVEL || 'M'
    });

    // Update meeting with QR code
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { qrCode: qrCodeString }
    });

    logger.info(`QR code generated for meeting: ${meetingId}`);

    res.json({
      success: true,
      data: {
        qrCode: qrCodeString,
        sessionId,
        expiresAt: qrData.expiresAt
      }
    });

  } catch (error) {
    logger.error('Generate QR code error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Check-in with QR code
router.post('/checkin', [
  body('qrData').isString(),
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

    const { qrData, userId } = req.body;

    let parsedQrData: QRCodeData;
    try {
      parsedQrData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code data'
      });
    }

    // Validate QR code
    if (parsedQrData.type !== 'checkin') {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code type for check-in'
      });
    }

    if (new Date(parsedQrData.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'QR code expired'
      });
    }

    // Check if meeting exists
    const meeting = await prisma.meeting.findUnique({
      where: { id: parsedQrData.meetingId }
    });

    if (!meeting || !meeting.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found or inactive'
      });
    }

    // Check if user already checked in
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        meetingId: parsedQrData.meetingId,
        checkInQr: parsedQrData.sessionId
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'User already checked in to this meeting'
      });
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId,
        meetingId: parsedQrData.meetingId,
        checkInQr: parsedQrData.sessionId,
        joinTime: new Date(),
        duration: 0,
        attendancePercentage: 0,
        isComplete: false
      }
    });

    logger.info(`User checked in: ${userId} -> ${parsedQrData.meetingId}`);

    res.status(201).json({
      success: true,
      data: attendance
    });

  } catch (error) {
    logger.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Check-out with QR code
router.post('/checkout', [
  body('qrData').isString(),
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

    const { qrData, userId } = req.body;

    let parsedQrData: QRCodeData;
    try {
      parsedQrData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code data'
      });
    }

    // Validate QR code
    if (parsedQrData.type !== 'checkout') {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code type for check-out'
      });
    }

    // Find attendance record
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        meetingId: parsedQrData.meetingId,
        checkInQr: parsedQrData.sessionId,
        isComplete: false
      },
      include: { meeting: true }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'No matching check-in found for check-out'
      });
    }

    const checkoutTime = new Date();
    const checkinTime = attendance.joinTime || new Date();
    const duration = Math.floor((checkoutTime.getTime() - checkinTime.getTime()) / (1000 * 60)); // minutes

    // Calculate attendance percentage
    const meetingDuration = Math.floor(
      (attendance.meeting.scheduledEnd.getTime() - attendance.meeting.scheduledStart.getTime()) / (1000 * 60)
    );
    const attendancePercentage = Math.min((duration / meetingDuration) * 100, 100);

    // Check for flags
    const flags = [];
    if (duration < meetingDuration * 0.9) {
      flags.push({
        type: 'INCOMPLETE_CHECKOUT',
        message: 'Incomplete meeting attendance',
        severity: 'HIGH'
      });
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutQr: parsedQrData.sessionId,
        leaveTime: checkoutTime,
        duration,
        attendancePercentage,
        isComplete: true,
        flags: {
          create: flags
        }
      }
    });

    logger.info(`User checked out: ${userId} -> ${parsedQrData.meetingId}, duration: ${duration}min`);

    res.json({
      success: true,
      data: updatedAttendance
    });

  } catch (error) {
    logger.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as qrRoutes };
