/**
 * Audit Trail Service
 * Tracks all court card activities, signatures, and verifications
 * Provides immutable audit logs for legal compliance
 */

import { prisma } from '../index';
import { logger } from '../utils/logger';

// ============================================
// AUDIT TYPES
// ============================================

export enum AuditAction {
  // Court Card Actions
  COURT_CARD_GENERATED = 'COURT_CARD_GENERATED',
  COURT_CARD_SIGNED = 'COURT_CARD_SIGNED',
  COURT_CARD_VERIFIED = 'COURT_CARD_VERIFIED',
  COURT_CARD_EXPORTED = 'COURT_CARD_EXPORTED',
  COURT_CARD_REVOKED = 'COURT_CARD_REVOKED',
  COURT_CARD_TAMPERED = 'COURT_CARD_TAMPERED',
  
  // Verification Actions
  PUBLIC_VERIFICATION = 'PUBLIC_VERIFICATION',
  SIGNATURE_VERIFICATION = 'SIGNATURE_VERIFICATION',
  CHAIN_VERIFICATION = 'CHAIN_VERIFICATION',
  
  // Attendance Actions
  ATTENDANCE_STARTED = 'ATTENDANCE_STARTED',
  ATTENDANCE_COMPLETED = 'ATTENDANCE_COMPLETED',
  ATTENDANCE_FLAGGED = 'ATTENDANCE_FLAGGED',
  
  // System Actions
  TIMESTAMP_CREATED = 'TIMESTAMP_CREATED',
  FRAUD_DETECTION_RUN = 'FRAUD_DETECTION_RUN',
  ENGAGEMENT_ANALYSIS = 'ENGAGEMENT_ANALYSIS',
}

export interface AuditEntry {
  action: AuditAction;
  userId?: string;
  userEmail?: string;
  userType?: string;
  resource: 'court_card' | 'attendance_record' | 'signature' | 'verification';
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

// ============================================
// AUDIT FUNCTIONS
// ============================================

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        userEmail: entry.userEmail,
        userType: entry.userType,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details as any,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });

    logger.info(`Audit: ${entry.action} - ${entry.resource}:${entry.resourceId}`);
  } catch (error: any) {
    // Don't let audit failures break the main flow
    logger.error('Failed to log audit entry:', error);
  }
}

/**
 * Log court card generation
 */
export async function logCourtCardGenerated(
  courtCardId: string,
  courtCardNumber: string,
  participantId: string,
  participantEmail: string,
  attendanceRecordId: string,
  validationStatus: string
): Promise<void> {
  await logAudit({
    action: AuditAction.COURT_CARD_GENERATED,
    userId: participantId,
    userEmail: participantEmail,
    userType: 'PARTICIPANT',
    resource: 'court_card',
    resourceId: courtCardId,
    details: {
      cardNumber: courtCardNumber,
      attendanceRecordId,
      validationStatus,
      timestamp: new Date().toISOString(),
    },
    success: true,
  });
}

/**
 * Log digital signature creation
 */
export async function logDigitalSignature(
  courtCardId: string,
  signerId: string,
  signerEmail: string,
  signerRole: string,
  signatureMethod: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    action: AuditAction.COURT_CARD_SIGNED,
    userId: signerId,
    userEmail: signerEmail,
    userType: signerRole,
    resource: 'signature',
    resourceId: courtCardId,
    details: {
      signerRole,
      signatureMethod,
      timestamp: new Date().toISOString(),
    },
    ipAddress,
    userAgent,
    success: true,
  });
}

/**
 * Log public verification attempt
 */
export async function logPublicVerification(
  courtCardId: string,
  cardNumber: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  verificationMethod?: string
): Promise<void> {
  await logAudit({
    action: AuditAction.PUBLIC_VERIFICATION,
    resource: 'verification',
    resourceId: courtCardId,
    details: {
      cardNumber,
      verificationMethod,
      timestamp: new Date().toISOString(),
    },
    ipAddress,
    userAgent,
    success,
  });
}

/**
 * Log signature verification
 */
export async function logSignatureVerification(
  courtCardId: string,
  validSignatures: number,
  totalSignatures: number,
  allValid: boolean,
  ipAddress?: string
): Promise<void> {
  await logAudit({
    action: AuditAction.SIGNATURE_VERIFICATION,
    resource: 'verification',
    resourceId: courtCardId,
    details: {
      validSignatures,
      totalSignatures,
      allValid,
      timestamp: new Date().toISOString(),
    },
    ipAddress,
    success: allValid,
  });
}

/**
 * Log chain of trust verification
 */
export async function logChainVerification(
  courtCardId: string,
  chainValid: boolean,
  errors: string[],
  ipAddress?: string
): Promise<void> {
  await logAudit({
    action: AuditAction.CHAIN_VERIFICATION,
    resource: 'verification',
    resourceId: courtCardId,
    details: {
      chainValid,
      errors,
      timestamp: new Date().toISOString(),
    },
    ipAddress,
    success: chainValid,
  });
}

/**
 * Log court card revocation
 */
export async function logCourtCardRevoked(
  courtCardId: string,
  reason: string,
  revokedBy: string,
  revokedByEmail: string
): Promise<void> {
  await logAudit({
    action: AuditAction.COURT_CARD_REVOKED,
    userId: revokedBy,
    userEmail: revokedByEmail,
    resource: 'court_card',
    resourceId: courtCardId,
    details: {
      reason,
      timestamp: new Date().toISOString(),
    },
    success: true,
  });
}

/**
 * Log tampering detection
 */
export async function logTamperingDetected(
  courtCardId: string,
  cardNumber: string,
  details: Record<string, any>
): Promise<void> {
  await logAudit({
    action: AuditAction.COURT_CARD_TAMPERED,
    resource: 'court_card',
    resourceId: courtCardId,
    details: {
      cardNumber,
      ...details,
      timestamp: new Date().toISOString(),
    },
    success: false,
    errorMessage: 'Tampering detected - card integrity check failed',
  });
}

/**
 * Log fraud detection run
 */
export async function logFraudDetection(
  attendanceRecordId: string,
  riskScore: number,
  recommendation: string,
  violations: string[]
): Promise<void> {
  await logAudit({
    action: AuditAction.FRAUD_DETECTION_RUN,
    resource: 'attendance_record',
    resourceId: attendanceRecordId,
    details: {
      riskScore,
      recommendation,
      violations,
      timestamp: new Date().toISOString(),
    },
    success: true,
  });
}

/**
 * Log engagement analysis
 */
export async function logEngagementAnalysis(
  attendanceRecordId: string,
  engagementScore: number,
  engagementLevel: string,
  flags: string[]
): Promise<void> {
  await logAudit({
    action: AuditAction.ENGAGEMENT_ANALYSIS,
    resource: 'attendance_record',
    resourceId: attendanceRecordId,
    details: {
      engagementScore,
      engagementLevel,
      flags,
      timestamp: new Date().toISOString(),
    },
    success: true,
  });
}

// ============================================
// AUDIT QUERIES
// ============================================

/**
 * Get audit trail for a court card
 */
export async function getCourtCardAuditTrail(courtCardId: string) {
  return await prisma.auditLog.findMany({
    where: {
      resourceId: courtCardId,
      resource: 'court_card',
    },
    orderBy: {
      timestamp: 'desc',
    },
  });
}

/**
 * Get all verification attempts for a court card
 */
export async function getVerificationHistory(courtCardId: string) {
  return await prisma.auditLog.findMany({
    where: {
      resourceId: courtCardId,
      action: {
        in: [
          AuditAction.PUBLIC_VERIFICATION,
          AuditAction.SIGNATURE_VERIFICATION,
          AuditAction.CHAIN_VERIFICATION,
        ],
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });
}

/**
 * Get signature history for a court card
 */
export async function getSignatureHistory(courtCardId: string) {
  return await prisma.auditLog.findMany({
    where: {
      resourceId: courtCardId,
      action: AuditAction.COURT_CARD_SIGNED,
    },
    orderBy: {
      timestamp: 'asc',
    },
  });
}

/**
 * Get all audit logs for a participant
 */
export async function getParticipantAuditTrail(participantId: string, limit = 100) {
  return await prisma.auditLog.findMany({
    where: {
      userId: participantId,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });
}

/**
 * Get audit statistics for a court card
 */
export async function getCourtCardAuditStats(courtCardId: string) {
  const allAudits = await prisma.auditLog.findMany({
    where: { resourceId: courtCardId },
  });

  const verificationAttempts = allAudits.filter(a =>
    a.action === AuditAction.PUBLIC_VERIFICATION
  ).length;

  const signatureCount = allAudits.filter(a =>
    a.action === AuditAction.COURT_CARD_SIGNED
  ).length;

  const tamperingDetected = allAudits.some(a =>
    a.action === AuditAction.COURT_CARD_TAMPERED
  );

  const lastVerification = allAudits
    .filter(a => a.action === AuditAction.PUBLIC_VERIFICATION)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

  return {
    totalAuditEntries: allAudits.length,
    verificationAttempts,
    signatureCount,
    tamperingDetected,
    lastVerification: lastVerification ? {
      timestamp: lastVerification.timestamp,
      ipAddress: lastVerification.ipAddress,
    } : null,
    createdAt: allAudits[allAudits.length - 1]?.timestamp,
  };
}

export const auditService = {
  logAudit,
  logCourtCardGenerated,
  logDigitalSignature,
  logPublicVerification,
  logSignatureVerification,
  logChainVerification,
  logCourtCardRevoked,
  logTamperingDetected,
  logFraudDetection,
  logEngagementAnalysis,
  getCourtCardAuditTrail,
  getVerificationHistory,
  getSignatureHistory,
  getParticipantAuditTrail,
  getCourtCardAuditStats,
};

