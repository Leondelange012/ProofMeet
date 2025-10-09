import crypto from 'crypto';
import { prisma } from '../index';
import { logger } from '../utils/logger';

interface CourtCardData {
  attendanceRecordId: string;
  participantEmail: string;
  participantName: string;
  caseNumber: string;
  courtRepEmail: string;
  courtRepName: string;
  meetingName: string;
  meetingProgram: string;
  meetingDate: Date;
  meetingDurationMin: number;
  joinTime: Date;
  leaveTime: Date;
  totalDurationMin: number;
  activeDurationMin: number;
  attendancePercent: number;
  activePeriods: any;
  verificationMethod: 'WEBCAM' | 'SCREEN_ACTIVITY' | 'BOTH';
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
    meetingName: cardData.meetingName,
    meetingDate: cardData.meetingDate,
    joinTime: cardData.joinTime,
    leaveTime: cardData.leaveTime,
    totalDurationMin: cardData.totalDurationMin,
    attendancePercent: cardData.attendancePercent,
  });
  
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Determine confidence level based on attendance data
 */
function determineConfidenceLevel(
  attendancePercent: number,
  activeDurationMin: number,
  totalDurationMin: number
): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (attendancePercent >= 90 && activeDurationMin >= totalDurationMin * 0.9) {
    return 'HIGH';
  } else if (attendancePercent >= 75) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Generate a Court Card for an attendance record
 */
export async function generateCourtCard(attendanceRecordId: string): Promise<any> {
  try {
    // Get attendance record with all related data
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceRecordId },
      include: {
        participant: {
          select: {
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
            durationMinutes: true,
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

    // Prepare card data
    const cardData: CourtCardData = {
      attendanceRecordId,
      participantEmail: attendance.participant.email,
      participantName: `${attendance.participant.firstName} ${attendance.participant.lastName}`,
      caseNumber: attendance.participant.caseNumber || 'N/A',
      courtRepEmail: attendance.courtRep.email,
      courtRepName: `${attendance.courtRep.firstName} ${attendance.courtRep.lastName}`,
      meetingName: attendance.meetingName,
      meetingProgram: attendance.meetingProgram,
      meetingDate: attendance.meetingDate,
      meetingDurationMin: attendance.externalMeeting?.durationMinutes || 60,
      joinTime: attendance.joinTime,
      leaveTime: attendance.leaveTime || new Date(),
      totalDurationMin: attendance.totalDurationMin || 0,
      activeDurationMin: attendance.activeDurationMin || attendance.totalDurationMin || 0,
      attendancePercent: Number(attendance.attendancePercent || 0),
      activePeriods: attendance.activityTimeline || {},
      verificationMethod: attendance.verificationMethod || 'SCREEN_ACTIVITY',
    };

    // Generate card number and hash
    const cardNumber = generateCardNumber(cardData.caseNumber);
    const cardHash = generateCardHash(cardData);
    const confidenceLevel = determineConfidenceLevel(
      cardData.attendancePercent,
      cardData.activeDurationMin,
      cardData.totalDurationMin
    );

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
        meetingName: cardData.meetingName,
        meetingProgram: cardData.meetingProgram,
        meetingDate: cardData.meetingDate,
        meetingDurationMin: cardData.meetingDurationMin,
        joinTime: cardData.joinTime,
        leaveTime: cardData.leaveTime,
        totalDurationMin: cardData.totalDurationMin,
        activeDurationMin: cardData.activeDurationMin,
        attendancePercent: cardData.attendancePercent,
        activePeriods: cardData.activePeriods,
        verificationMethod: cardData.verificationMethod,
        confidenceLevel,
        cardHash,
      },
    });

    // Update attendance record
    await prisma.attendanceRecord.update({
      where: { id: attendanceRecordId },
      data: {
        courtCardGenerated: true,
        courtCardSentAt: new Date(),
      },
    });

    logger.info(`Court Card generated: ${cardNumber} for participant ${cardData.participantEmail}`);

    return courtCard;
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
      meetingName: courtCard.meetingName,
      meetingProgram: courtCard.meetingProgram,
      meetingDate: courtCard.meetingDate,
      meetingDurationMin: courtCard.meetingDurationMin,
      joinTime: courtCard.joinTime,
      leaveTime: courtCard.leaveTime,
      totalDurationMin: courtCard.totalDurationMin,
      activeDurationMin: courtCard.activeDurationMin,
      attendancePercent: Number(courtCard.attendancePercent),
      activePeriods: courtCard.activePeriods,
      verificationMethod: courtCard.verificationMethod,
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
 * Get Court Card with verification
 */
export async function getCourtCard(attendanceRecordId: string): Promise<any> {
  const courtCard = await prisma.courtCard.findUnique({
    where: { attendanceRecordId },
  });

  if (!courtCard) {
    return null;
  }

  // Verify integrity
  const isValid = await verifyCourtCard(courtCard.id);

  return {
    ...courtCard,
    isValid,
  };
}

export const courtCardService = {
  generateCourtCard,
  verifyCourtCard,
  getCourtCard,
};

