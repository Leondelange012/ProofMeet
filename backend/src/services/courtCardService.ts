import crypto from 'crypto';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { 
  createChainOfTrust, 
  signCourtCard, 
  generateQRCodeData, 
  generateVerificationUrl,
  createTrustedTimestamp 
} from './digitalSignatureService';
import { logCourtCardGenerated, logDigitalSignature } from './auditService';

interface Violation {
  type: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
}

interface CourtCardData {
  attendanceRecordId: string;
  participantEmail: string;
  participantName: string;
  caseNumber: string;
  courtRepEmail: string;
  courtRepName: string;
  meetingId: string | null;
  meetingName: string;
  meetingProgram: string;
  meetingDate: Date;
  meetingDurationMin: number;
  joinTime: Date;
  leaveTime: Date;
  totalDurationMin: number;
  activeDurationMin: number;
  idleDurationMin: number;
  attendancePercent: number;
  activePeriods: any;
  verificationMethod: 'WEBCAM' | 'SCREEN_ACTIVITY' | 'BOTH';
  violations: Violation[];
  validationStatus: 'PASSED' | 'FAILED';
}

/**
 * Validate attendance and generate violations
 * PRIMARY SOURCE: Zoom webhook join/leave times
 * SECONDARY: Activity heartbeats (supplementary evidence)
 */
function validateAttendance(
  totalDurationMin: number,
  activeDurationMin: number,
  idleDurationMin: number,
  attendancePercent: number,
  meetingDurationMin: number,
  activityTimeline: any
): { violations: Violation[]; validationStatus: 'PASSED' | 'FAILED' } {
  const violations: Violation[] = [];
  
  // Calculate percentages
  const activePercent = totalDurationMin > 0 ? (activeDurationMin / totalDurationMin) * 100 : 0;
  const idlePercent = totalDurationMin > 0 ? (idleDurationMin / totalDurationMin) * 100 : 0;
  const meetingAttendancePercent = meetingDurationMin > 0 ? (totalDurationMin / meetingDurationMin) * 100 : 0;
  
  // Count activity heartbeats
  const events = activityTimeline?.events || [];
  const activityEvents = events.filter((e: any) => e.source === 'FRONTEND_MONITOR');
  const activeHeartbeats = events.filter((e: any) => e.type === 'ACTIVE' && e.source === 'FRONTEND_MONITOR').length;
  const idleHeartbeats = events.filter((e: any) => e.type === 'IDLE' && e.source === 'FRONTEND_MONITOR').length;
  
  // Rule 1: Must be active for at least 80% of time attended
  if (activePercent < 80) {
    violations.push({
      type: 'LOW_ACTIVE_TIME',
      message: `Only ${activePercent.toFixed(1)}% active during meeting (required 80%). Active: ${activeDurationMin} min, Total: ${totalDurationMin} min.`,
      severity: 'CRITICAL',
      timestamp: new Date().toISOString(),
    });
  }
  
  // Rule 2: Idle time must not exceed 20% (complementary to Rule 1)
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
  
  // Rule 4: Warning if attendance percent is below 90% but above 80%
  if (attendancePercent >= 80 && attendancePercent < 90) {
    violations.push({
      type: 'LOW_ATTENDANCE_WARNING',
      message: `Attendance ${attendancePercent.toFixed(1)}% is acceptable but below recommended 90%.`,
      severity: 'WARNING',
      timestamp: new Date().toISOString(),
    });
  }
  
  // Rule 5: Flag if idle periods were detected
  if (idleDurationMin > 0 && idlePercent <= 20) {
    violations.push({
      type: 'IDLE_PERIODS_DETECTED',
      message: `${idleDurationMin} minutes of idle time detected. Stayed within acceptable limits.`,
      severity: 'INFO',
      timestamp: new Date().toISOString(),
    });
  }
  
  // Rule 6: SUSPICIOUS PATTERN - Attended meeting but zero activity heartbeats
  // Indicates participant may have closed ProofMeet tab but stayed in Zoom
  if (totalDurationMin >= 10 && activityEvents.length === 0) {
    violations.push({
      type: 'NO_ACTIVITY_MONITORING',
      message: `Attended ${totalDurationMin} minutes but no activity heartbeats received. ProofMeet monitoring tab may have been closed.`,
      severity: 'WARNING',
      timestamp: new Date().toISOString(),
    });
  }
  
  // Rule 7: SUSPICIOUS PATTERN - Very few heartbeats for long attendance
  // Expected: ~2 heartbeats per minute (30s intervals)
  const expectedHeartbeats = totalDurationMin * 2;
  const receivedHeartbeats = activityEvents.length;
  const heartbeatRatio = expectedHeartbeats > 0 ? (receivedHeartbeats / expectedHeartbeats) * 100 : 0;
  
  if (totalDurationMin >= 10 && heartbeatRatio < 30) {
    violations.push({
      type: 'LOW_ACTIVITY_MONITORING',
      message: `Received ${receivedHeartbeats} activity heartbeats (expected ~${expectedHeartbeats}). Monitoring tab may have been intermittently closed or inactive.`,
      severity: 'WARNING',
      timestamp: new Date().toISOString(),
    });
  }
  
  // Rule 8: INFO - Good monitoring behavior
  if (heartbeatRatio >= 70 && totalDurationMin >= 10) {
    violations.push({
      type: 'GOOD_MONITORING',
      message: `Received ${receivedHeartbeats} activity heartbeats. ProofMeet monitoring tab was kept open as instructed.`,
      severity: 'INFO',
      timestamp: new Date().toISOString(),
    });
  }
  
  // Determine final validation status
  // CRITICAL violations = automatic FAIL
  // WARNING violations = PASS but flagged for review
  const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
  const validationStatus = criticalViolations.length > 0 ? 'FAILED' : 'PASSED';
  
  return { violations, validationStatus };
}

/**
 * Generate a unique Court Card number
 * Format: CC-YYYY-CASENUM-SEQ
 * Example: CC-2024-12345-001
 */
function generateCardNumber(caseNumber: string): string {
  const year = new Date().getFullYear();
  const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const caseNum = caseNumber.replace(/[^0-9]/g, '').slice(-5).padStart(5, '0');
  
  return `CC-${year}-${caseNum}-${sequence}`;
}

/**
 * Generate SHA-256 hash for card integrity verification
 */
function generateCardHash(cardData: CourtCardData): string {
  const dataString = JSON.stringify({
    attendanceRecordId: cardData.attendanceRecordId,
    participantEmail: cardData.participantEmail,
    caseNumber: cardData.caseNumber,
    meetingId: cardData.meetingId,
    meetingName: cardData.meetingName,
    meetingDate: cardData.meetingDate,
    joinTime: cardData.joinTime,
    leaveTime: cardData.leaveTime,
    totalDurationMin: cardData.totalDurationMin,
    activeDurationMin: cardData.activeDurationMin,
    idleDurationMin: cardData.idleDurationMin,
    attendancePercent: cardData.attendancePercent,
    validationStatus: cardData.validationStatus,
  });
  
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Determine confidence level based on attendance data
 */
function determineConfidenceLevel(
  attendancePercent: number,
  activeDurationMin: number,
  totalDurationMin: number,
  validationStatus: string
): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (validationStatus === 'FAILED') {
    return 'LOW';
  }
  
  if (attendancePercent >= 95 && activeDurationMin >= totalDurationMin * 0.95) {
    return 'HIGH';
  } else if (attendancePercent >= 80) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Calculate total hours completed by participant across all meetings
 */
async function calculateTotalHours(participantId: string): Promise<number> {
  const completedMeetings = await prisma.attendanceRecord.findMany({
    where: {
      participantId,
      status: 'COMPLETED',
    },
    select: {
      totalDurationMin: true,
    },
  });
  
  const totalMinutes = completedMeetings.reduce((sum, record) => {
    return sum + (record.totalDurationMin || 0);
  }, 0);
  
  return Number((totalMinutes / 60).toFixed(2)); // Convert to hours with 2 decimal places
}

/**
 * Get all meeting IDs attended by participant
 */
async function getAllMeetingIds(participantId: string): Promise<string[]> {
  const meetings = await prisma.attendanceRecord.findMany({
    where: {
      participantId,
      status: 'COMPLETED',
      externalMeetingId: { not: null },
    },
    select: {
      externalMeetingId: true,
    },
  });
  
  return meetings
    .map(m => m.externalMeetingId)
    .filter((id): id is string => id !== null);
}

/**
 * Generate a Court Card for an attendance record
 */
export async function generateCourtCard(attendanceRecordId: string): Promise<any> {
  try {
    // Get attendance record with all related data including photos and signatures
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceRecordId },
      include: {
        participant: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            caseNumber: true,
          },
        },
        courtRep: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        externalMeeting: {
          select: {
            id: true,
            durationMinutes: true,
          },
        },
        webcamSnapshots: {
          select: {
            id: true,
            photoUrl: true,
            capturedAt: true,
            minuteIntoMeeting: true,
            faceDetected: true,
            faceMatchScore: true,
          },
          orderBy: {
            capturedAt: 'asc',
          },
        },
        hostSignature: {
          select: {
            id: true,
            hostName: true,
            hostEmail: true,
            hostRole: true,
            signatureData: true,
            confirmedAt: true,
            attestationText: true,
            meetingLocation: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    if (attendance.status !== 'COMPLETED') {
      throw new Error('Attendance must be completed before generating Court Card');
    }

    // Check if court card already exists
    const existingCard = await prisma.courtCard.findUnique({
      where: { attendanceRecordId },
    });

    if (existingCard) {
      logger.info(`Court Card already exists: ${existingCard.cardNumber}`);
      return existingCard;
    }

    // Calculate durations
    const totalDurationMin = attendance.totalDurationMin || 0;
    const activeDurationMin = attendance.activeDurationMin || totalDurationMin;
    const idleDurationMin = attendance.idleDurationMin || (totalDurationMin - activeDurationMin);
    const attendancePercent = Number(attendance.attendancePercent || 0);
    const meetingDurationMin = attendance.externalMeeting?.durationMinutes || 60;

    // Validate attendance and generate violations
    const { violations, validationStatus } = validateAttendance(
      totalDurationMin,
      activeDurationMin,
      idleDurationMin,
      attendancePercent,
      meetingDurationMin,
      attendance.activityTimeline
    );

    // Get total hours and meeting IDs for this participant
    const totalHoursCompleted = await calculateTotalHours(attendance.participant.id);
    const allMeetingIds = await getAllMeetingIds(attendance.participant.id);

    // Prepare card data
    const cardData: CourtCardData = {
      attendanceRecordId,
      participantEmail: attendance.participant.email,
      participantName: `${attendance.participant.firstName} ${attendance.participant.lastName}`,
      caseNumber: attendance.participant.caseNumber || 'N/A',
      courtRepEmail: attendance.courtRep.email,
      courtRepName: `${attendance.courtRep.firstName} ${attendance.courtRep.lastName}`,
      meetingId: attendance.externalMeeting?.id || null,
      meetingName: attendance.meetingName,
      meetingProgram: attendance.meetingProgram,
      meetingDate: attendance.meetingDate,
      meetingDurationMin,
      joinTime: attendance.joinTime,
      leaveTime: attendance.leaveTime || new Date(),
      totalDurationMin,
      activeDurationMin,
      idleDurationMin,
      attendancePercent,
      activePeriods: attendance.activityTimeline || {},
      verificationMethod: attendance.verificationMethod || 'SCREEN_ACTIVITY',
      violations,
      validationStatus,
    };

    // Generate card number and hash
    const cardNumber = generateCardNumber(cardData.caseNumber);
    const cardHash = generateCardHash(cardData);
    const confidenceLevel = determineConfidenceLevel(
      cardData.attendancePercent,
      cardData.activeDurationMin,
      cardData.totalDurationMin,
      validationStatus
    );

    // Create chain of trust
    const chainOfTrust = await createChainOfTrust(attendance.participant.id, cardHash);
    
    // Generate verification URL and QR code data
    const tempCardId = crypto.randomUUID(); // Temporary ID for QR code generation
    const verificationUrl = generateVerificationUrl(tempCardId);
    const qrCodeData = generateQRCodeData(tempCardId, cardNumber, cardHash);
    
    // Create Court Card
    const courtCard = await prisma.courtCard.create({
      data: {
        attendanceRecordId,
        cardNumber,
        participantEmail: cardData.participantEmail,
        participantName: cardData.participantName,
        caseNumber: cardData.caseNumber,
        courtRepEmail: cardData.courtRepEmail,
        courtRepName: cardData.courtRepName,
        meetingId: cardData.meetingId as any,
        meetingName: cardData.meetingName,
        meetingProgram: cardData.meetingProgram,
        meetingDate: cardData.meetingDate,
        meetingDurationMin: cardData.meetingDurationMin,
        joinTime: cardData.joinTime,
        leaveTime: cardData.leaveTime,
        totalDurationMin: cardData.totalDurationMin,
        activeDurationMin: cardData.activeDurationMin,
        idleDurationMin: cardData.idleDurationMin,
        attendancePercent: cardData.attendancePercent,
        validationStatus: cardData.validationStatus,
        violations: violations as any,
        activePeriods: cardData.activePeriods,
        verificationMethod: cardData.verificationMethod,
        confidenceLevel,
        cardHash,
      },
    });

    // Create automatic system signature (system-generated verification)
    const systemSignature = await signCourtCard({
      courtCardId: courtCard.id,
      signerId: attendance.courtRepId, // Signed by court rep's system account
      signerRole: 'COURT_REP',
      authMethod: 'SYSTEM_GENERATED',
      metadata: {
        ipAddress: 'SYSTEM',
        userAgent: 'ProofMeet-Server/2.0',
      },
    }).catch(err => {
      logger.error(`Failed to create system signature: ${err.message}`);
      return null;
    });

    // Create trusted timestamp
    const timestamp = await createTrustedTimestamp(courtCard.id, cardHash).catch(err => {
      logger.error(`Failed to create timestamp: ${err.message}`);
      return null;
    });

    // Update court card with verification data
    const updatedVerificationUrl = generateVerificationUrl(courtCard.id);
    const updatedQRCodeData = generateQRCodeData(courtCard.id, cardNumber, cardHash);
    
    // Update attendance record
    await prisma.attendanceRecord.update({
      where: { id: attendanceRecordId },
      data: {
        courtCardGenerated: true,
        courtCardSentAt: new Date(),
        isValid: validationStatus === 'PASSED',
      },
    });

    // Log audit trail
    await logCourtCardGenerated(
      courtCard.id,
      cardNumber,
      attendance.participant.id,
      attendance.participant.email,
      attendanceRecordId,
      validationStatus
    );

    // Log system signature in audit trail
    if (systemSignature) {
      await logDigitalSignature(
        courtCard.id,
        attendance.courtRepId,
        attendance.courtRep.email,
        'COURT_REP',
        'SYSTEM_GENERATED'
      );
    }

    logger.info(
      `Court Card generated: ${cardNumber} for participant ${cardData.participantEmail} - Status: ${validationStatus}`
    );
    
    if (validationStatus === 'FAILED') {
      logger.warn(
        `Court Card ${cardNumber} FAILED validation. Violations: ${violations
          .filter(v => v.severity === 'CRITICAL')
          .map(v => v.type)
          .join(', ')}`
      );
    }

    // Get participant ID photo if available
    const idPhoto = await prisma.participantIDPhoto.findUnique({
      where: { participantId: attendance.participant.id },
      select: {
        id: true,
        photoUrl: true,
        isVerified: true,
        verifiedAt: true,
        idType: true,
      },
    });

    return {
      ...courtCard,
      totalHoursCompleted,
      allMeetingIds,
      verificationUrl: updatedVerificationUrl,
      qrCodeData: updatedQRCodeData,
      chainOfTrust,
      signatures: systemSignature ? [systemSignature] : [],
      timestamp,
      // Include verification photos and signatures
      webcamSnapshots: attendance.webcamSnapshots || [],
      hostSignature: attendance.hostSignature || null,
      participantIDPhoto: idPhoto || null,
    };
  } catch (error: any) {
    logger.error('Court Card generation error:', error);
    throw error;
  }
}

/**
 * Verify Court Card integrity (check for tampering)
 */
export async function verifyCourtCard(courtCardId: string): Promise<boolean> {
  try {
    const courtCard = await prisma.courtCard.findUnique({
      where: { id: courtCardId },
    });

    if (!courtCard) {
      return false;
    }

    // Recreate hash from stored data
    const cardData: CourtCardData = {
      attendanceRecordId: courtCard.attendanceRecordId,
      participantEmail: courtCard.participantEmail,
      participantName: courtCard.participantName,
      caseNumber: courtCard.caseNumber,
      courtRepEmail: courtCard.courtRepEmail,
      courtRepName: courtCard.courtRepName,
      meetingId: courtCard.meetingId as any,
      meetingName: courtCard.meetingName,
      meetingProgram: courtCard.meetingProgram,
      meetingDate: courtCard.meetingDate,
      meetingDurationMin: courtCard.meetingDurationMin,
      joinTime: courtCard.joinTime,
      leaveTime: courtCard.leaveTime,
      totalDurationMin: courtCard.totalDurationMin,
      activeDurationMin: courtCard.activeDurationMin,
      idleDurationMin: (courtCard as any).idleDurationMin || 0,
      attendancePercent: Number(courtCard.attendancePercent),
      activePeriods: courtCard.activePeriods,
      verificationMethod: courtCard.verificationMethod,
      violations: ((courtCard as any).violations || []) as any,
      validationStatus: (courtCard as any).validationStatus as 'PASSED' | 'FAILED',
    };

    const expectedHash = generateCardHash(cardData);
    const isTampered = expectedHash !== courtCard.cardHash;

    // Update if tampered
    if (isTampered && !courtCard.isTampered) {
      await prisma.courtCard.update({
        where: { id: courtCardId },
        data: { isTampered: true },
      });
      
      logger.warn(`Court Card tampering detected: ${courtCard.cardNumber}`);
    }

    return !isTampered;
  } catch (error: any) {
    logger.error('Court Card verification error:', error);
    return false;
  }
}

/**
 * Get Court Card with verification and total hours
 */
export async function getCourtCard(attendanceRecordId: string): Promise<any> {
  const courtCard = await prisma.courtCard.findUnique({
    where: { attendanceRecordId },
    include: {
      attendanceRecord: {
        select: {
          participantId: true,
        },
        include: {
          webcamSnapshots: {
            select: {
              id: true,
              photoUrl: true,
              capturedAt: true,
              minuteIntoMeeting: true,
              faceDetected: true,
              faceMatchScore: true,
            },
            orderBy: {
              capturedAt: 'asc',
            },
          },
          hostSignature: {
            select: {
              id: true,
              hostName: true,
              hostEmail: true,
              hostRole: true,
              signatureData: true,
              confirmedAt: true,
              attestationText: true,
              meetingLocation: true,
            },
          },
        },
      },
    },
  });

  if (!courtCard) {
    return null;
  }

  // Verify integrity
  const isValid = await verifyCourtCard(courtCard.id);
  
  // Get total hours and meeting IDs
  const totalHoursCompleted = await calculateTotalHours(courtCard.attendanceRecord.participantId);
  const allMeetingIds = await getAllMeetingIds(courtCard.attendanceRecord.participantId);

  // Get participant ID photo
  const idPhoto = await prisma.participantIDPhoto.findUnique({
    where: { participantId: courtCard.attendanceRecord.participantId },
    select: {
      id: true,
      photoUrl: true,
      isVerified: true,
      verifiedAt: true,
      idType: true,
    },
  });

  return {
    ...courtCard,
    isValid,
    totalHoursCompleted,
    allMeetingIds,
    webcamSnapshots: (courtCard as any).attendanceRecord?.webcamSnapshots || [],
    hostSignature: (courtCard as any).attendanceRecord?.hostSignature || null,
    participantIDPhoto: idPhoto || null,
  };
}

export const courtCardService = {
  generateCourtCard,
  verifyCourtCard,
  getCourtCard,
};
