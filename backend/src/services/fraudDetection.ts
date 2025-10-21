/**
 * Fraud Detection Service
 * Automated detection of suspicious attendance patterns
 */

import { logger } from '../utils/logger';
import { analyzeAttendanceEngagement } from './engagementDetection';

export interface FraudRule {
  name: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  check: (record: any, context?: any) => boolean;
  action: 'REJECT' | 'FLAG_FOR_REVIEW' | 'WARN';
  category: 'DURATION' | 'ENGAGEMENT' | 'PATTERN' | 'DATA_INTEGRITY';
}

export interface FraudDetectionResult {
  attendanceId: string;
  violations: Array<{
    rule: string;
    severity: string;
    action: string;
    description: string;
    timestamp: Date;
  }>;
  recommendation: 'APPROVE' | 'FLAG_FOR_REVIEW' | 'REJECT';
  riskScore: number; // 0-100
  reasons: string[];
}

/**
 * Fraud Detection Rules
 */
export const FRAUD_RULES: FraudRule[] = [
  {
    name: 'IMPOSSIBLE_DURATION',
    description: 'Duration exceeds scheduled meeting time by >15 minutes',
    severity: 'CRITICAL',
    category: 'DURATION',
    check: (record) => {
      const scheduledDuration = record.externalMeeting?.durationMinutes || 60;
      return record.totalDurationMin > scheduledDuration + 15;
    },
    action: 'REJECT',
  },
  {
    name: 'ZERO_DURATION',
    description: 'No attendance duration recorded',
    severity: 'CRITICAL',
    category: 'DURATION',
    check: (record) => {
      return !record.totalDurationMin || record.totalDurationMin === 0;
    },
    action: 'REJECT',
  },
  {
    name: 'NEGATIVE_DURATION',
    description: 'Duration is negative or invalid',
    severity: 'CRITICAL',
    category: 'DURATION',
    check: (record) => {
      return record.totalDurationMin < 0;
    },
    action: 'REJECT',
  },
  {
    name: 'INSUFFICIENT_DURATION',
    description: 'Duration is below minimum requirement (5 minutes)',
    severity: 'HIGH',
    category: 'DURATION',
    check: (record) => {
      return record.totalDurationMin > 0 && record.totalDurationMin < 5;
    },
    action: 'FLAG_FOR_REVIEW',
  },
  {
    name: 'NO_ENGAGEMENT_SIGNALS',
    description: 'Zero activity detected during entire meeting',
    severity: 'CRITICAL',
    category: 'ENGAGEMENT',
    check: (record) => {
      const timeline = record.activityTimeline?.events || [];
      const activityEvents = timeline.filter((e: any) => 
        e.type === 'ACTIVE' || e.type === 'MOUSE_MOVEMENT' || e.type === 'KEYBOARD_ACTIVITY'
      );
      return record.totalDurationMin > 10 && activityEvents.length === 0;
    },
    action: 'REJECT',
  },
  {
    name: 'LOW_ENGAGEMENT_SCORE',
    description: 'Engagement score below 30 indicates likely absence',
    severity: 'HIGH',
    category: 'ENGAGEMENT',
    check: (record) => {
      return record.engagementScore && record.engagementScore < 30;
    },
    action: 'FLAG_FOR_REVIEW',
  },
  {
    name: 'SUSPICIOUS_ACTIVITY_PATTERN',
    description: 'Activity pattern suggests automated bot',
    severity: 'HIGH',
    category: 'PATTERN',
    check: (record) => {
      const timeline = record.activityTimeline?.events || [];
      if (timeline.length < 10) return false;
      
      // Check for too-perfect timing (bot-like behavior)
      const timestamps = timeline.map((e: any) => new Date(e.timestamp).getTime());
      const intervals = [];
      
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }
      
      // If all intervals are exactly the same, likely automated
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
      
      // Very low variance = suspicious
      return variance < 100 && intervals.length > 10;
    },
    action: 'FLAG_FOR_REVIEW',
  },
  {
    name: 'RAPID_JOIN_LEAVE_CYCLES',
    description: 'Multiple join/leave events in short time',
    severity: 'MEDIUM',
    category: 'PATTERN',
    check: (record) => {
      const timeline = record.activityTimeline?.events || [];
      const joinLeaveEvents = timeline.filter((e: any) => 
        e.type === 'ZOOM_JOINED' || e.type === 'ZOOM_LEFT'
      );
      return joinLeaveEvents.length > 5;
    },
    action: 'FLAG_FOR_REVIEW',
  },
  {
    name: 'DURATION_DATA_MISMATCH',
    description: 'Zoom reported duration differs significantly from tracked duration',
    severity: 'HIGH',
    category: 'DATA_INTEGRITY',
    check: (record) => {
      if (!record.zoomReportedDuration) return false;
      
      const difference = Math.abs(record.totalDurationMin - record.zoomReportedDuration);
      return difference > 10; // >10 minute discrepancy
    },
    action: 'FLAG_FOR_REVIEW',
  },
  {
    name: 'MISSING_VERIFICATION_DATA',
    description: 'No Zoom webhook data received',
    severity: 'MEDIUM',
    category: 'DATA_INTEGRITY',
    check: (record) => {
      return record.verificationMethod !== 'BOTH' && 
             record.verificationMethod !== 'ZOOM_WEBHOOK' &&
             record.totalDurationMin > 15;
    },
    action: 'FLAG_FOR_REVIEW',
  },
  {
    name: 'ATTENDANCE_BELOW_THRESHOLD',
    description: 'Attendance percentage below 80% threshold',
    severity: 'HIGH',
    category: 'DURATION',
    check: (record) => {
      return Number(record.attendancePercent || 0) < 80;
    },
    action: 'FLAG_FOR_REVIEW',
  },
  {
    name: 'EXTREMELY_HIGH_IDLE_TIME',
    description: 'Idle time exceeds 50% of total duration',
    severity: 'MEDIUM',
    category: 'ENGAGEMENT',
    check: (record) => {
      if (!record.idleDurationMin || !record.totalDurationMin) return false;
      const idlePercent = (record.idleDurationMin / record.totalDurationMin) * 100;
      return idlePercent > 50;
    },
    action: 'FLAG_FOR_REVIEW',
  },
];

/**
 * Run fraud detection on attendance record
 */
export async function runFraudDetection(
  attendanceRecord: any,
  context?: any
): Promise<FraudDetectionResult> {
  const violations: FraudDetectionResult['violations'] = [];
  let riskScore = 0;

  logger.info(`Running fraud detection for attendance ${attendanceRecord.id}`);

  // Run all fraud rules
  for (const rule of FRAUD_RULES) {
    try {
      if (rule.check(attendanceRecord, context)) {
        violations.push({
          rule: rule.name,
          severity: rule.severity,
          action: rule.action,
          description: rule.description,
          timestamp: new Date(),
        });

        // Add to risk score based on severity
        const severityWeight = {
          CRITICAL: 40,
          HIGH: 25,
          MEDIUM: 15,
          LOW: 5,
        };
        riskScore += severityWeight[rule.severity];

        logger.warn(`Fraud rule violated: ${rule.name}`, {
          attendanceId: attendanceRecord.id,
          severity: rule.severity,
        });
      }
    } catch (error: any) {
      logger.error(`Error checking fraud rule ${rule.name}:`, error);
    }
  }

  // Run engagement analysis
  let engagementAnalysis;
  try {
    engagementAnalysis = await analyzeAttendanceEngagement(
      attendanceRecord.id,
      attendanceRecord
    );

    // Add engagement-based violations
    if (engagementAnalysis.recommendation === 'REJECT') {
      violations.push({
        rule: 'ENGAGEMENT_ANALYSIS_FAILED',
        severity: 'HIGH',
        action: 'REJECT',
        description: `Engagement score ${engagementAnalysis.score} with flags: ${engagementAnalysis.flags.join(', ')}`,
        timestamp: new Date(),
      });
      riskScore += 25;
    } else if (engagementAnalysis.recommendation === 'FLAG_FOR_REVIEW') {
      violations.push({
        rule: 'ENGAGEMENT_CONCERNS',
        severity: 'MEDIUM',
        action: 'FLAG_FOR_REVIEW',
        description: `Engagement score ${engagementAnalysis.score}: ${engagementAnalysis.flags.join(', ')}`,
        timestamp: new Date(),
      });
      riskScore += 15;
    }
  } catch (error: any) {
    logger.error('Engagement analysis failed:', error);
  }

  // Cap risk score at 100
  riskScore = Math.min(riskScore, 100);

  // Determine final recommendation
  let recommendation: 'APPROVE' | 'FLAG_FOR_REVIEW' | 'REJECT';
  if (violations.some(v => v.action === 'REJECT')) {
    recommendation = 'REJECT';
  } else if (violations.length > 0 || riskScore > 50) {
    recommendation = 'FLAG_FOR_REVIEW';
  } else {
    recommendation = 'APPROVE';
  }

  // Generate reasons
  const reasons = violations.map(v => v.description);

  const result: FraudDetectionResult = {
    attendanceId: attendanceRecord.id,
    violations,
    recommendation,
    riskScore,
    reasons,
  };

  logger.info(`Fraud detection complete for ${attendanceRecord.id}:`, {
    violations: violations.length,
    recommendation,
    riskScore,
  });

  return result;
}

/**
 * Check if attendance record should be auto-rejected
 */
export function shouldAutoReject(fraudResult: FraudDetectionResult): boolean {
  return (
    fraudResult.recommendation === 'REJECT' ||
    fraudResult.riskScore >= 80 ||
    fraudResult.violations.some(v => v.severity === 'CRITICAL')
  );
}

/**
 * Check if attendance record needs manual review
 */
export function needsManualReview(fraudResult: FraudDetectionResult): boolean {
  return (
    fraudResult.recommendation === 'FLAG_FOR_REVIEW' ||
    (fraudResult.riskScore >= 40 && fraudResult.riskScore < 80) ||
    fraudResult.violations.length > 0
  );
}

/**
 * Generate fraud detection report
 */
export function generateFraudReport(fraudResult: FraudDetectionResult): string {
  let report = `Fraud Detection Report\n`;
  report += `====================\n\n`;
  report += `Attendance ID: ${fraudResult.attendanceId}\n`;
  report += `Risk Score: ${fraudResult.riskScore}/100\n`;
  report += `Recommendation: ${fraudResult.recommendation}\n\n`;

  if (fraudResult.violations.length > 0) {
    report += `Violations (${fraudResult.violations.length}):\n`;
    fraudResult.violations.forEach((v, i) => {
      report += `\n${i + 1}. ${v.rule} [${v.severity}]\n`;
      report += `   ${v.description}\n`;
      report += `   Action: ${v.action}\n`;
    });
  } else {
    report += `No violations detected.\n`;
  }

  report += `\n====================\n`;

  return report;
}

