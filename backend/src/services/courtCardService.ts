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
  verificationMethod: 'WEBCAM' | 'SCREEN_ACTIVITY' | 'BOTH' | 'ZOOM_WEBHOOK';
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
  activityTimeline: any,
  scheduledStartTime: Date | null,
  scheduledEndTime: Date | null,
  actualJoinTime: Date,
  actualLeaveTime: Date
): { violations: Violation[]; validationStatus: 'PASSED' | 'FAILED' } {
  const violations: Violation[] = [];
  
  // Calculate percentages
  const activePercent = totalDurationMin > 0 ? (activeDurationMin / totalDurationMin) * 100 : 0;
  const idlePercent = totalDurationMin > 0 ? (idleDurationMin / totalDurationMin) * 100 : 0;
  const meetingAttendancePercent = meetingDurationMin > 0 ? (totalDurationMin / meetingDurationMin) * 100 : 0;
  
  // LENIENT COMPLIANCE: Check tardiness and early departure (10-minute grace period EACH)
  const GRACE_PERIOD_MINUTES = 10;
  
  // Rule 0: TARDINESS + EARLY DEPARTURE - Separate grace periods (not cumulative)
  // Early joins (before scheduled start) are OK and don't count against grace period
  if (scheduledStartTime && scheduledEndTime) {
    // Calculate late join (only if joined AFTER scheduled start)
    const minutesLate = Math.max(0, Math.round((actualJoinTime.getTime() - scheduledStartTime.getTime()) / (1000 * 60)));
    
    // Calculate early departure (only if left BEFORE scheduled end)
    const minutesEarly = Math.max(0, Math.round((scheduledEndTime.getTime() - actualLeaveTime.getTime()) / (1000 * 60)));
    
    // FAIL only if late join OR early departure exceeds grace period (not cumulative)
    const violations_found: string[] = [];
    
    if (minutesLate > GRACE_PERIOD_MINUTES) {
      violations_found.push(`${minutesLate} min late (max ${GRACE_PERIOD_MINUTES} min allowed)`);
    }
    
    if (minutesEarly > GRACE_PERIOD_MINUTES) {
      violations_found.push(`${minutesEarly} min early departure (max ${GRACE_PERIOD_MINUTES} min allowed)`);
    }
    
    if (violations_found.length > 0) {
      violations.push({
        type: 'ATTENDANCE_WINDOW_VIOLATION',
        message: `Attendance window violation: ${violations_found.join('; ')}. Note: Early joins (before scheduled start) are always allowed.`,
        severity: 'CRITICAL',
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // Normalize timeline - handles both array format and object { events: [...] } format
  const events = (() => {
    if (!activityTimeline) return [];
    if (Array.isArray(activityTimeline)) return activityTimeline;
    if (activityTimeline.events && Array.isArray(activityTimeline.events)) return activityTimeline.events;
    return [];
  })();
  
  // Count activity heartbeats
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
  
  // Rule 2: Idle time must not exceed 10% (complementary to Rule 1)
  if (idlePercent > 10) {
    violations.push({
      type: 'EXCESSIVE_IDLE_TIME',
      message: `Idle for ${idleDurationMin} minutes (${idlePercent.toFixed(1)}% of attendance). Maximum allowed: 10%.`,
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
 * Generate detailed validation explanation
 * Provides human-readable explanation of why a meeting passed or failed
 */
function generateValidationExplanation(
  validationStatus: 'PASSED' | 'FAILED',
  violations: Violation[],
  attendancePercent: number,
  activeDurationMin: number,
  idleDurationMin: number,
  totalDurationMin: number,
  meetingDurationMin: number,
  engagementScore: number | null,
  engagementLevel: string | null,
  videoOnPercentage: number,
  fraudRiskScore: number,
  fraudRecommendation: string,
  activityEvents: number
): string {
  const explanations: string[] = [];
  
  if (validationStatus === 'PASSED') {
    explanations.push('✅ VALIDATION PASSED - All requirements met');
    explanations.push('');
    explanations.push('📊 Attendance Metrics:');
    explanations.push(`   • Attended ${totalDurationMin} of ${meetingDurationMin} minutes (${attendancePercent.toFixed(1)}% attendance)`);
    explanations.push(`   • Active time: ${activeDurationMin} minutes (${((activeDurationMin / totalDurationMin) * 100).toFixed(1)}% active)`);
    if (idleDurationMin > 0) {
      explanations.push(`   • Idle time: ${idleDurationMin} minutes (within acceptable limits)`);
    }
    
    explanations.push('');
    explanations.push('🎥 Engagement Verification:');
    if (engagementScore !== null) {
      explanations.push(`   • Engagement Score: ${engagementScore}/100 (${engagementLevel || 'N/A'})`);
    }
    explanations.push(`   • Video Active: ${videoOnPercentage}% of meeting time`);
    explanations.push(`   • Activity Events: ${activityEvents} tracked`);
    
    explanations.push('');
    explanations.push('🔒 Fraud Detection:');
    explanations.push(`   • Risk Score: ${fraudRiskScore}/100 (${fraudRiskScore < 50 ? 'Low Risk' : fraudRiskScore < 80 ? 'Medium Risk' : 'High Risk'})`);
    explanations.push(`   • Recommendation: ${fraudRecommendation}`);
    
    // Check for warnings
    const warnings = violations.filter(v => v.severity === 'WARNING');
    if (warnings.length > 0) {
      explanations.push('');
      explanations.push('⚠️ Warnings (Non-Critical):');
      warnings.forEach(w => {
        explanations.push(`   • ${w.message}`);
      });
    }
    
    explanations.push('');
    explanations.push('✅ All critical requirements satisfied. Court card generated successfully.');
    
  } else {
    explanations.push('❌ VALIDATION FAILED - Critical requirements not met');
    explanations.push('');
    
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    explanations.push('🚫 Critical Violations:');
    criticalViolations.forEach((v, index) => {
      explanations.push(`   ${index + 1}. ${v.message}`);
    });
    
    explanations.push('');
    explanations.push('📊 Attendance Metrics:');
    explanations.push(`   • Attended ${totalDurationMin} of ${meetingDurationMin} minutes (${attendancePercent.toFixed(1)}% attendance)`);
    explanations.push(`   • Active time: ${activeDurationMin} minutes (${((activeDurationMin / totalDurationMin) * 100).toFixed(1)}% active)`);
    if (idleDurationMin > 0) {
      explanations.push(`   • Idle time: ${idleDurationMin} minutes (${((idleDurationMin / totalDurationMin) * 100).toFixed(1)}% idle)`);
    }
    
    explanations.push('');
    explanations.push('🎥 Engagement Verification:');
    if (engagementScore !== null) {
      explanations.push(`   • Engagement Score: ${engagementScore}/100 (${engagementLevel || 'N/A'})`);
    }
    explanations.push(`   • Video Active: ${videoOnPercentage}% of meeting time`);
    explanations.push(`   • Activity Events: ${activityEvents} tracked`);
    
    explanations.push('');
    explanations.push('🔒 Fraud Detection:');
    explanations.push(`   • Risk Score: ${fraudRiskScore}/100`);
    explanations.push(`   • Recommendation: ${fraudRecommendation}`);
    
    explanations.push('');
    explanations.push('❌ Court card cannot be generated due to critical violations above.');
  }
  
  return explanations.join('\n');
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
            time: true,
            timezone: true,
            createdAt: true,
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

    // Parse scheduled meeting times for tardiness/early departure checking
    // Use externalMeeting.createdAt which has the correct timezone-aware start time
    let scheduledStartTime: Date | null = null;
    let scheduledEndTime: Date | null = null;
    
    if (attendance.externalMeeting?.createdAt) {
      // Use the meeting's createdAt timestamp (set to actual Zoom meeting start time)
      scheduledStartTime = new Date(attendance.externalMeeting.createdAt);
      
      // Calculate scheduled end time (start + duration)
      scheduledEndTime = new Date(scheduledStartTime);
      scheduledEndTime.setMinutes(scheduledEndTime.getMinutes() + meetingDurationMin);
      
      logger.info(`Scheduled time window: ${scheduledStartTime.toISOString()} to ${scheduledEndTime.toISOString()}`);
    }

    // Validate attendance and generate violations
    const { violations, validationStatus } = validateAttendance(
      totalDurationMin,
      activeDurationMin,
      idleDurationMin,
      attendancePercent,
      meetingDurationMin,
      attendance.activityTimeline,
      scheduledStartTime,
      scheduledEndTime,
      attendance.joinTime,
      attendance.leaveTime || new Date()
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

    // Extract engagement and fraud metrics from metadata
    const metadata = (attendance.metadata as any) || {};
    const engagementScore = metadata.engagementScore || null;
    const engagementLevel = metadata.engagementLevel || null;
    const fraudRiskScore = metadata.fraudRiskScore || 0;
    const fraudRecommendation = metadata.fraudRecommendation || 'APPROVE';
    
    // Calculate video on percentage using Zoom webhook events (PRIMARY SOURCE)
    // Zoom sends VIDEO_ON and VIDEO_OFF events throughout the meeting
    const timeline = (attendance.activityTimeline as any) || [];
    const timelineEvents = Array.isArray(timeline) ? timeline : (timeline.events || []);
    
    // Legacy: Check webcam snapshots (DISABLED - camera conflict)
    const snapshots = attendance.webcamSnapshots || [];
    const totalSnapshots = snapshots.length;
    const snapshotsWithFace = snapshots.filter((s: any) => s.faceDetected === true).length;
    
    // PRIMARY METHOD: Calculate video on duration from Zoom webhook events
    const videoOnEvents = timelineEvents.filter((e: any) => e.type === 'VIDEO_ON' && e.source === 'ZOOM_WEBHOOK');
    const videoOffEvents = timelineEvents.filter((e: any) => e.type === 'VIDEO_OFF' && e.source === 'ZOOM_WEBHOOK');
    
    let videoOnPercentage = 0;
    let videoOnDurationMin = 0;
    let videoOffPeriods: Array<{startTime: string; endTime: string | null; durationMin: number}> = [];
    
    if (videoOnEvents.length > 0 || videoOffEvents.length > 0) {
      // Calculate camera on/off periods from Zoom webhook events
      const sortedEvents = [...videoOnEvents, ...videoOffEvents].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      let currentVideoState: 'ON' | 'OFF' = 'OFF'; // Assume camera starts OFF
      let lastEventTime = attendance.joinTime;
      let totalVideoOnMs = 0;
      
      // Check if participant's camera was on when they joined (first event might be VIDEO_OFF)
      // If first event is VIDEO_OFF, assume camera was on from join until first OFF event
      if (sortedEvents.length > 0 && sortedEvents[0].type === 'VIDEO_OFF') {
        currentVideoState = 'ON';
      }
      
      for (const event of sortedEvents) {
        const eventTime = new Date(event.timestamp);
        const duration = eventTime.getTime() - lastEventTime.getTime();
        
        if (currentVideoState === 'ON') {
          // Camera was on, add to total
          totalVideoOnMs += duration;
        } else {
          // Camera was off, track the off period
          videoOffPeriods.push({
            startTime: lastEventTime.toISOString(),
            endTime: eventTime.toISOString(),
            durationMin: Math.floor(duration / (1000 * 60)),
          });
        }
        
        // Toggle state
        currentVideoState = event.type === 'VIDEO_ON' ? 'ON' : 'OFF';
        lastEventTime = eventTime;
      }
      
      // Handle final period (from last event to meeting end)
      const meetingEnd = attendance.leaveTime || new Date();
      const finalDuration = meetingEnd.getTime() - lastEventTime.getTime();
      
      if (currentVideoState === 'ON') {
        totalVideoOnMs += finalDuration;
      } else {
        videoOffPeriods.push({
          startTime: lastEventTime.toISOString(),
          endTime: null, // Still off at meeting end
          durationMin: Math.floor(finalDuration / (1000 * 60)),
        });
      }
      
      // Calculate video on duration in minutes
      videoOnDurationMin = Math.floor(totalVideoOnMs / (1000 * 60));
      videoOnPercentage = Math.round((videoOnDurationMin / totalDurationMin) * 100);
      
      logger.info(`📹 Video calculation from Zoom webhooks:`, {
        videoOnEvents: videoOnEvents.length,
        videoOffEvents: videoOffEvents.length,
        videoOnDurationMin,
        totalDurationMin,
        videoOnPercentage,
        videoOffPeriods: videoOffPeriods.length,
      });
    } else {
      // FALLBACK: No video events tracked yet (legacy or in-progress meeting)
      // Assume camera was on for entire meeting (optimistic assumption)
      videoOnPercentage = 100;
      videoOnDurationMin = totalDurationMin;
      
      logger.warn(`⚠️ No VIDEO_ON/OFF events found, assuming camera was on for entire meeting`, {
        attendanceId: attendanceRecordId,
        totalDurationMin,
      });
    }
    
    // Count total activity events
    const activityEvents = timelineEvents.length;
    
    // Calculate leave/rejoin periods from activity timeline
    const { calculateActiveDuration } = await import('./activityTrackingService');
    const durationCalc = calculateActiveDuration(
      attendance.joinTime,
      attendance.leaveTime || new Date(),
      timelineEvents.length > 0 ? timelineEvents as any : null
    );
    const leaveRejoinPeriods = durationCalc.leaveRejoinPeriods || [];
    
    // Generate detailed validation explanation
    const validationExplanation = generateValidationExplanation(
      validationStatus,
      violations,
      attendancePercent,
      activeDurationMin,
      idleDurationMin,
      totalDurationMin,
      meetingDurationMin,
      engagementScore,
      engagementLevel,
      videoOnPercentage,
      fraudRiskScore,
      fraudRecommendation,
      activityEvents
    );

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
    
    // Store enhanced metrics in attendance record metadata
    await prisma.attendanceRecord.update({
      where: { id: attendanceRecordId },
      data: {
        // @ts-ignore
        metadata: {
          ...metadata,
          validationExplanation,
          // Engagement and fraud metrics
          engagementScore,
          engagementLevel,
          fraudRiskScore,
          fraudRecommendation,
          // Video and activity metrics (from Zoom webhooks)
          videoOnPercentage,
          videoOnDurationMin,
          videoOffPeriods: videoOffPeriods.map(period => ({
            startTime: period.startTime,
            endTime: period.endTime,
            durationMin: period.durationMin,
          })),
          activityEvents,
          // Snapshot metrics
          totalSnapshots,
          snapshotsWithFace,
          snapshotFaceDetectionRate: totalSnapshots > 0 ? Math.round((snapshotsWithFace / totalSnapshots) * 100) : 0,
          // Leave/rejoin periods
          leaveRejoinPeriods: leaveRejoinPeriods.map(period => ({
            leaveTime: period.leaveTime.toISOString(),
            rejoinTime: period.rejoinTime ? period.rejoinTime.toISOString() : null,
            durationMin: period.durationMin,
          })),
          // Detailed time breakdown
          timeBreakdown: {
            totalDurationMin,
            activeDurationMin,
            idleDurationMin,
            timeAwayMin: durationCalc.idleDurationMin,
            meetingDurationMin,
            attendancePercent: Number(attendancePercent),
          },
        },
      },
    });
    
    // Update court card with verification URL and QR code data (now that we have the real ID)
    const updatedVerificationUrl = generateVerificationUrl(courtCard.id);
    const updatedQRCodeData = generateQRCodeData(courtCard.id, cardNumber, cardHash);
    
    await prisma.courtCard.update({
      where: { id: courtCard.id },
      data: {
        verificationUrl: updatedVerificationUrl,
        qrCodeData: updatedQRCodeData,
      },
    });

    // Create trusted timestamp
    const timestamp = await createTrustedTimestamp(courtCard.id, cardHash).catch(err => {
      logger.error(`Failed to create timestamp: ${err.message}`);
      return null;
    });

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

    logger.info(
      `Court Card generated without signatures: ${cardNumber} - Participant must sign manually`
    );

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

    // Fetch the updated court card with verification data
    const finalCourtCard = await prisma.courtCard.findUnique({
      where: { id: courtCard.id },
    });
    
    return {
      ...finalCourtCard,
      totalHoursCompleted,
      allMeetingIds,
      chainOfTrust,
      signatures: [], // Empty - participant and host must sign manually
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
