/**
 * Photo Verification Routes
 * Handles webcam snapshots, ID photos, and meeting host signatures
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { authenticate, requireParticipant } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// ============================================
// PARTICIPANT ID PHOTO UPLOAD
// ============================================

/**
 * POST /api/verification/id-photo
 * Upload participant ID photo (during registration or profile setup)
 */
router.post(
  '/id-photo',
  authenticate,
  requireParticipant,
  [
    body('photoData').isString().notEmpty(),
    body('idType').optional().isString(),
    body('idState').optional().isString(),
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
      const { photoData, idType, idState } = req.body;

      // Calculate photo hash for integrity
      const photoHash = crypto
        .createHash('sha256')
        .update(photoData)
        .digest('hex');

      // Check if ID photo already exists
      const existingPhoto = await prisma.participantIDPhoto.findUnique({
        where: { participantId },
      });

      if (existingPhoto) {
        // Update existing photo
        const updated = await prisma.participantIDPhoto.update({
          where: { participantId },
          data: {
            photoUrl: photoData,
            photoHash,
            idType,
            idState,
            isVerified: false, // Reset verification on new upload
            verifiedAt: null,
            verifiedBy: null,
            updatedAt: new Date(),
          },
        });

        logger.info(`ID photo updated for participant ${req.user!.email}`);

        return res.json({
          success: true,
          message: 'ID photo updated successfully',
          data: {
            photoId: updated.id,
            uploadedAt: updated.uploadedAt,
          },
        });
      }

      // Create new ID photo
      const idPhoto = await prisma.participantIDPhoto.create({
        data: {
          participantId,
          photoUrl: photoData,
          photoHash,
          idType,
          idState,
        },
      });

      logger.info(`ID photo uploaded for participant ${req.user!.email}`);

      res.status(201).json({
        success: true,
        message: 'ID photo uploaded successfully',
        data: {
          photoId: idPhoto.id,
          uploadedAt: idPhoto.uploadedAt,
        },
      });
    } catch (error: any) {
      logger.error('Upload ID photo error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/verification/id-photo
 * Get participant's ID photo
 */
router.get('/id-photo', authenticate, requireParticipant, async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.id;

    const idPhoto = await prisma.participantIDPhoto.findUnique({
      where: { participantId },
      select: {
        id: true,
        photoUrl: true,
        idType: true,
        idState: true,
        isVerified: true,
        verifiedAt: true,
        uploadedAt: true,
      },
    });

    if (!idPhoto) {
      return res.status(404).json({
        success: false,
        error: 'No ID photo found',
      });
    }

    res.json({
      success: true,
      data: idPhoto,
    });
  } catch (error: any) {
    logger.error('Get ID photo error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// WEBCAM SNAPSHOTS (During Meetings)
// ============================================

/**
 * POST /api/verification/webcam-snapshot
 * Upload webcam snapshot during active meeting
 */
router.post(
  '/webcam-snapshot',
  authenticate,
  requireParticipant,
  [
    body('attendanceRecordId').isUUID(),
    body('photoData').isString().notEmpty(),
    body('minuteIntoMeeting').isInt({ min: 0 }),
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
      const { attendanceRecordId, photoData, minuteIntoMeeting } = req.body;

      // Verify attendance record belongs to this participant and is IN_PROGRESS
      const attendance = await prisma.attendanceRecord.findFirst({
        where: {
          id: attendanceRecordId,
          participantId,
          status: 'IN_PROGRESS',
        },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          error: 'Active attendance record not found',
        });
      }

      // Calculate photo hash
      const photoHash = crypto
        .createHash('sha256')
        .update(photoData)
        .digest('hex');

      // Create webcam snapshot
      const snapshot = await prisma.webcamSnapshot.create({
        data: {
          attendanceRecordId,
          participantId,
          photoUrl: photoData,
          photoHash,
          capturedAt: new Date(),
          minuteIntoMeeting,
        },
      });

      // Update attendance record webcam count
      await prisma.attendanceRecord.update({
        where: { id: attendanceRecordId },
        data: {
          webcamSnapshotCount: {
            increment: 1,
          },
        },
      });

      logger.info(`Webcam snapshot captured for attendance ${attendanceRecordId}`);

      res.status(201).json({
        success: true,
        message: 'Webcam snapshot captured successfully',
        data: {
          snapshotId: snapshot.id,
          capturedAt: snapshot.capturedAt,
        },
      });
    } catch (error: any) {
      logger.error('Upload webcam snapshot error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/verification/webcam-snapshots/:attendanceRecordId
 * Get all webcam snapshots for an attendance record
 */
router.get(
  '/webcam-snapshots/:attendanceRecordId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { attendanceRecordId } = req.params;
      const userId = req.user!.id;

      // Verify user has access to this attendance record
      const attendance = await prisma.attendanceRecord.findFirst({
        where: {
          id: attendanceRecordId,
          OR: [
            { participantId: userId },
            { courtRepId: userId },
          ],
        },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          error: 'Attendance record not found',
        });
      }

      const snapshots = await prisma.webcamSnapshot.findMany({
        where: { attendanceRecordId },
        orderBy: { capturedAt: 'asc' },
        select: {
          id: true,
          photoUrl: true,
          capturedAt: true,
          minuteIntoMeeting: true,
          faceDetected: true,
          faceMatchScore: true,
        },
      });

      res.json({
        success: true,
        data: {
          attendanceRecordId,
          snapshotCount: snapshots.length,
          snapshots,
        },
      });
    } catch (error: any) {
      logger.error('Get webcam snapshots error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// ============================================
// MEETING HOST SIGNATURES
// ============================================

/**
 * POST /api/verification/host-signature
 * Meeting host confirms participant attendance with digital signature
 * This can be called by the host (if they have an account) or via a public link
 */
router.post(
  '/host-signature',
  [
    body('attendanceRecordId').isUUID(),
    body('hostName').isString().notEmpty(),
    body('hostEmail').isEmail(),
    body('hostPhone').optional().isString(),
    body('signatureData').isString().notEmpty(),
    body('attestationText').isString().notEmpty(),
    body('meetingLocation').optional().isString(),
    body('verificationCode').isString().notEmpty(), // Unique code sent to host
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

      const {
        attendanceRecordId,
        hostName,
        hostEmail,
        hostPhone,
        signatureData,
        attestationText,
        meetingLocation,
        verificationCode,
      } = req.body;

      // Verify attendance record exists
      const attendance = await prisma.attendanceRecord.findUnique({
        where: { id: attendanceRecordId },
        include: {
          participant: {
            select: {
              firstName: true,
              lastName: true,
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

      // Check if signature already exists
      const existingSignature = await prisma.meetingHostSignature.findUnique({
        where: { attendanceRecordId },
      });

      if (existingSignature) {
        return res.status(400).json({
          success: false,
          error: 'Host signature already exists for this meeting',
        });
      }

      // Create host signature
      const signature = await prisma.meetingHostSignature.create({
        data: {
          attendanceRecordId,
          hostName,
          hostEmail,
          hostPhone,
          signatureData,
          attestationText,
          meetingLocation,
          verificationCode,
          confirmedAt: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info(`Host signature added for attendance ${attendanceRecordId} by ${hostEmail}`);

      res.status(201).json({
        success: true,
        message: 'Host signature recorded successfully',
        data: {
          signatureId: signature.id,
          confirmedAt: signature.confirmedAt,
          verificationCode: signature.verificationCode,
        },
      });
    } catch (error: any) {
      logger.error('Create host signature error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/verification/host-signature/:attendanceRecordId
 * Get host signature for an attendance record
 */
router.get(
  '/host-signature/:attendanceRecordId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { attendanceRecordId } = req.params;
      const userId = req.user!.id;

      // Verify user has access
      const attendance = await prisma.attendanceRecord.findFirst({
        where: {
          id: attendanceRecordId,
          OR: [
            { participantId: userId },
            { courtRepId: userId },
          ],
        },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          error: 'Attendance record not found',
        });
      }

      const signature = await prisma.meetingHostSignature.findUnique({
        where: { attendanceRecordId },
      });

      if (!signature) {
        return res.status(404).json({
          success: false,
          error: 'No host signature found',
        });
      }

      res.json({
        success: true,
        data: signature,
      });
    } catch (error: any) {
      logger.error('Get host signature error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/verification/request-host-signature/:attendanceRecordId
 * Participant requests host to sign their court card
 * Generates a unique verification code and sends email to host
 */
router.post(
  '/request-host-signature/:attendanceRecordId',
  authenticate,
  requireParticipant,
  [
    body('hostEmail').isEmail(),
    body('hostName').optional().isString(),
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

      const { attendanceRecordId } = req.params;
      const { hostEmail, hostName } = req.body;
      const participantId = req.user!.id;

      // Verify attendance record belongs to this participant
      const attendance = await prisma.attendanceRecord.findFirst({
        where: {
          id: attendanceRecordId,
          participantId,
        },
        include: {
          participant: true,
        },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          error: 'Attendance record not found',
        });
      }

      // Generate verification code
      const verificationCode = crypto.randomBytes(16).toString('hex');

      // Create the signature URL
      const signatureUrl = `${process.env.FRONTEND_URL || 'https://proof-meet-frontend.vercel.app'}/host-signature/${attendanceRecordId}?code=${verificationCode}`;

      // TODO: Send email to host with signature request
      // For now, just return the URL

      logger.info(`Host signature requested for attendance ${attendanceRecordId}, host: ${hostEmail}`);

      res.json({
        success: true,
        message: 'Host signature request created',
        data: {
          verificationCode,
          signatureUrl,
          expiresIn: '7 days',
        },
      });
    } catch (error: any) {
      logger.error('Request host signature error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

export { router as verificationPhotoRoutes };

