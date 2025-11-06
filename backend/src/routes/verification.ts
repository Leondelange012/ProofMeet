/**
 * Public Verification Routes
 * No authentication required - allows courts and officials to verify court cards
 */

import { Router, Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { verifyCourtCardPublic, verifyAllSignatures, verifyChainOfTrust } from '../services/digitalSignatureService';
import { 
  logPublicVerification, 
  logSignatureVerification, 
  logChainVerification,
  getCourtCardAuditTrail,
  getVerificationHistory,
  getSignatureHistory,
  getCourtCardAuditStats 
} from '../services/auditService';

const router = Router();

// ============================================
// PUBLIC VERIFICATION (NO AUTH REQUIRED)
// ============================================

/**
 * GET /api/verify/:courtCardId
 * Publicly verify a court card by ID
 * Used by courts, probation officers, judges, etc.
 */
router.get(
  '/:courtCardId',
  [param('courtCardId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid court card ID format',
          details: errors.array(),
        });
      }

      const { courtCardId } = req.params;
      const verificationHash = req.query.hash as string | undefined;

      // Verify the court card
      const verification = await verifyCourtCardPublic(courtCardId, verificationHash);

      // Log verification attempt in audit trail
      await logPublicVerification(
        courtCardId,
        verification.cardNumber,
        verification.isValid,
        req.ip,
        req.get('user-agent'),
        verificationHash ? 'QR_CODE' : 'URL'
      );

      logger.info(`Public verification request for card: ${verification.cardNumber}`);

      res.json({
        success: true,
        data: verification,
      });
    } catch (error: any) {
      logger.error('Public verification error:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Court card not found or invalid',
      });
    }
  }
);

/**
 * GET /api/verify/card-number/:cardNumber
 * Verify a court card by card number (e.g., CC-2024-12345-001)
 * Alternative verification method when QR code provides card number
 */
router.get(
  '/card-number/:cardNumber',
  [param('cardNumber').isString().matches(/^CC-\d{4}-\d{5}-\d{3}$/)],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid card number format. Expected: CC-YYYY-XXXXX-NNN',
          details: errors.array(),
        });
      }

      const { cardNumber } = req.params;

      // Find court card by card number
      const courtCard = await prisma.courtCard.findUnique({
        where: { cardNumber },
        select: { id: true },
      });

      if (!courtCard) {
        return res.status(404).json({
          success: false,
          error: 'Court card not found',
        });
      }

      // Verify using the court card ID
      const verification = await verifyCourtCardPublic(courtCard.id);

      logger.info(`Public verification by card number: ${cardNumber}`);

      res.json({
        success: true,
        data: verification,
      });
    } catch (error: any) {
      logger.error('Card number verification error:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Court card not found or invalid',
      });
    }
  }
);

/**
 * GET /api/verify/:courtCardId/signatures
 * Get and verify all digital signatures for a court card
 */
router.get(
  '/:courtCardId/signatures',
  [param('courtCardId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid court card ID format',
          details: errors.array(),
        });
      }

      const { courtCardId } = req.params;

      // Verify all signatures
      const signatureVerification = await verifyAllSignatures(courtCardId);

      // Log signature verification in audit trail
      await logSignatureVerification(
        courtCardId,
        signatureVerification.validSignatures,
        signatureVerification.totalSignatures,
        signatureVerification.isValid,
        req.ip
      );

      logger.info(`Signature verification request for card: ${courtCardId}`);

      res.json({
        success: true,
        data: signatureVerification,
      });
    } catch (error: any) {
      logger.error('Signature verification error:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Court card not found',
      });
    }
  }
);

/**
 * GET /api/verify/:courtCardId/chain-of-trust
 * Verify the blockchain chain of trust for a court card
 */
router.get(
  '/:courtCardId/chain-of-trust',
  [param('courtCardId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid court card ID format',
          details: errors.array(),
        });
      }

      const { courtCardId } = req.params;

      // Verify chain of trust
      const chainVerification = await verifyChainOfTrust(courtCardId);

      // Log chain verification in audit trail
      await logChainVerification(
        courtCardId,
        chainVerification.isValid,
        chainVerification.errors,
        req.ip
      );

      logger.info(`Chain of trust verification for card: ${courtCardId}`);

      res.json({
        success: true,
        data: chainVerification,
      });
    } catch (error: any) {
      logger.error('Chain of trust verification error:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Court card not found',
      });
    }
  }
);

/**
 * GET /api/verify/participant/:participantEmail
 * Get all verified court cards for a participant (public)
 * Useful for courts to see complete compliance history
 */
router.get(
  '/participant/:participantEmail',
  [param('participantEmail').isEmail()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
          details: errors.array(),
        });
      }

      const { participantEmail } = req.params;

      // Get all court cards for this participant
      const courtCards = await prisma.courtCard.findMany({
        where: {
          participantEmail: participantEmail.toLowerCase(),
        },
        orderBy: {
          meetingDate: 'desc',
        },
        select: {
          id: true,
          cardNumber: true,
          participantName: true,
          caseNumber: true,
          meetingName: true,
          meetingProgram: true,
          meetingDate: true,
          totalDurationMin: true,
          attendancePercent: true,
          validationStatus: true,
          confidenceLevel: true,
          generatedAt: true,
          isTampered: true,
        },
      });

      // Calculate summary statistics
      const totalMeetings = courtCards.length;
      const totalHours = courtCards.reduce((sum, card) => sum + card.totalDurationMin, 0) / 60;
      const passedCards = courtCards.filter(card => (card as any).validationStatus === 'PASSED').length;
      const tamperedCards = courtCards.filter(card => card.isTampered).length;

      logger.info(`Participant verification request for: ${participantEmail} (${totalMeetings} cards)`);

      res.json({
        success: true,
        data: {
          participantEmail,
          participantName: courtCards[0]?.participantName || 'Unknown',
          caseNumber: courtCards[0]?.caseNumber || 'Unknown',
          summary: {
            totalMeetings,
            totalHours: Math.round(totalHours * 10) / 10,
            passedValidation: passedCards,
            failedValidation: totalMeetings - passedCards,
            tamperedCards,
            complianceRate: totalMeetings > 0 ? Math.round((passedCards / totalMeetings) * 100) : 0,
          },
          courtCards: courtCards.map(card => ({
            id: card.id,
            cardNumber: card.cardNumber,
            meetingName: card.meetingName,
            meetingProgram: card.meetingProgram,
            meetingDate: card.meetingDate,
            duration: card.totalDurationMin,
            attendancePercent: Number(card.attendancePercent),
            validationStatus: (card as any).validationStatus,
            confidenceLevel: card.confidenceLevel,
            generatedAt: card.generatedAt,
            isTampered: card.isTampered,
            verificationUrl: `${process.env.FRONTEND_URL || 'https://proofmeet.vercel.app'}/verify/${card.id}`,
          })),
        },
      });
    } catch (error: any) {
      logger.error('Participant verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/verify/case/:caseNumber
 * Get all verified court cards for a case number (public)
 * Alternative lookup method for courts
 */
router.get(
  '/case/:caseNumber',
  [param('caseNumber').isString()],
  async (req: Request, res: Response) => {
    try {
      const { caseNumber } = req.params;

      // Get all court cards for this case
      const courtCards = await prisma.courtCard.findMany({
        where: {
          caseNumber: caseNumber.toUpperCase(),
        },
        orderBy: {
          meetingDate: 'desc',
        },
        select: {
          id: true,
          cardNumber: true,
          participantName: true,
          participantEmail: true,
          caseNumber: true,
          meetingName: true,
          meetingProgram: true,
          meetingDate: true,
          totalDurationMin: true,
          attendancePercent: true,
          validationStatus: true,
          confidenceLevel: true,
          generatedAt: true,
          isTampered: true,
        },
      });

      if (courtCards.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No court cards found for this case number',
        });
      }

      // Calculate summary
      const totalMeetings = courtCards.length;
      const totalHours = courtCards.reduce((sum, card) => sum + card.totalDurationMin, 0) / 60;
      const passedCards = courtCards.filter(card => (card as any).validationStatus === 'PASSED').length;

      logger.info(`Case number verification request: ${caseNumber} (${totalMeetings} cards)`);

      res.json({
        success: true,
        data: {
          caseNumber: caseNumber.toUpperCase(),
          participantName: courtCards[0].participantName,
          participantEmail: courtCards[0].participantEmail,
          summary: {
            totalMeetings,
            totalHours: Math.round(totalHours * 10) / 10,
            passedValidation: passedCards,
            complianceRate: Math.round((passedCards / totalMeetings) * 100),
          },
          courtCards: courtCards.map(card => ({
            id: card.id,
            cardNumber: card.cardNumber,
            meetingName: card.meetingName,
            meetingProgram: card.meetingProgram,
            meetingDate: card.meetingDate,
            duration: card.totalDurationMin,
            attendancePercent: Number(card.attendancePercent),
            validationStatus: (card as any).validationStatus,
            confidenceLevel: card.confidenceLevel,
            isTampered: card.isTampered,
            verificationUrl: `${process.env.FRONTEND_URL || 'https://proofmeet.vercel.app'}/verify/${card.id}`,
          })),
        },
      });
    } catch (error: any) {
      logger.error('Case number verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/verify/:courtCardId/audit-trail
 * Get complete audit trail for a court card
 */
router.get(
  '/:courtCardId/audit-trail',
  [param('courtCardId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid court card ID format',
          details: errors.array(),
        });
      }

      const { courtCardId } = req.params;

      // Get audit trail
      const auditTrail = await getCourtCardAuditTrail(courtCardId);
      const auditStats = await getCourtCardAuditStats(courtCardId);

      logger.info(`Audit trail requested for card: ${courtCardId}`);

      res.json({
        success: true,
        data: {
          courtCardId,
          statistics: auditStats,
          auditTrail: auditTrail.map(log => ({
            action: log.action,
            userEmail: log.userEmail,
            userType: log.userType,
            timestamp: log.timestamp,
            details: log.details,
            ipAddress: log.ipAddress,
          })),
        },
      });
    } catch (error: any) {
      logger.error('Audit trail retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit trail',
      });
    }
  }
);

/**
 * GET /api/verify/:courtCardId/verification-history
 * Get verification history for a court card
 */
router.get(
  '/:courtCardId/verification-history',
  [param('courtCardId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid court card ID format',
          details: errors.array(),
        });
      }

      const { courtCardId } = req.params;

      // Get verification history
      const verificationHistory = await getVerificationHistory(courtCardId);

      logger.info(`Verification history requested for card: ${courtCardId}`);

      res.json({
        success: true,
        data: {
          courtCardId,
          totalVerifications: verificationHistory.length,
          verifications: verificationHistory.map(log => ({
            action: log.action,
            timestamp: log.timestamp,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            details: log.details,
          })),
        },
      });
    } catch (error: any) {
      logger.error('Verification history retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve verification history',
      });
    }
  }
);

/**
 * GET /api/verify/:courtCardId/signature-history
 * Get signature history for a court card
 */
router.get(
  '/:courtCardId/signature-history',
  [param('courtCardId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid court card ID format',
          details: errors.array(),
        });
      }

      const { courtCardId } = req.params;

      // Get signature history
      const signatureHistory = await getSignatureHistory(courtCardId);

      logger.info(`Signature history requested for card: ${courtCardId}`);

      res.json({
        success: true,
        data: {
          courtCardId,
          totalSignatures: signatureHistory.length,
          signatures: signatureHistory.map(log => ({
            signerName: (log.details as any)?.signerRole || 'Unknown',
            signerEmail: log.userEmail,
            signerRole: log.userType,
            signatureMethod: (log.details as any)?.signatureMethod || 'Unknown',
            timestamp: log.timestamp,
            ipAddress: log.ipAddress,
          })),
        },
      });
    } catch (error: any) {
      logger.error('Signature history retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve signature history',
      });
    }
  }
);

/**
 * GET /api/verify/health
 * Health check for verification service
 */
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'ProofMeet Verification Service',
    version: '2.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

export { router as verificationRoutes };

