/**
 * Engagement Detection Service
 * AI-powered analysis of participant behavior to detect genuine engagement
 */

import { logger } from '../utils/logger';

export interface EngagementMetrics {
  mouseMovements: number;
  keyboardActivity: number;
  tabFocusTimeMs: number; // Time tab was actually focused
  audioActive: boolean; // Was microphone ever used?
  videoActive: boolean; // Was camera ever on?
  zoomReactions: number; // Zoom reactions (thumbs up, etc)
  activityEvents: number; // Total activity heartbeat events
  idleEvents: number; // Idle detection events
}

export interface EngagementAnalysis {
  score: number; // 0-100
  level: 'HIGH' | 'MEDIUM' | 'LOW' | 'SUSPICIOUS';
  flags: string[];
  recommendation: 'APPROVE' | 'FLAG_FOR_REVIEW' | 'REJECT';
  details: {
    focusTimePercent: number;
    activityRate: number;
    engagementPattern: string;
  };
}

/**
 * Calculate engagement score based on multiple signals
 */
export function calculateEngagementScore(
  metrics: EngagementMetrics,
  meetingDurationMin: number
): EngagementAnalysis {
  const flags: string[] = [];
  const meetingDurationMs = meetingDurationMin * 60 * 1000;

  // Calculate individual scores
  const focusTimePercent = (metrics.tabFocusTimeMs / meetingDurationMs) * 100;
  const activityRate = metrics.activityEvents / meetingDurationMin; // Events per minute

  // Weighted scoring system
  const weights = {
    tabFocusTime: 0.40,      // Most important - was tab actually focused?
    activityRate: 0.25,       // Mouse/keyboard activity
    audioVideo: 0.15,         // Audio/video participation
    consistency: 0.20,        // Pattern consistency
  };

  // 1. Tab Focus Score (0-100)
  let focusScore = Math.min(focusTimePercent, 100);
  if (focusTimePercent < 50) {
    flags.push('LOW_TAB_FOCUS');
  }
  if (focusTimePercent < 30) {
    flags.push('CRITICALLY_LOW_FOCUS');
  }

  // 2. Activity Rate Score (0-100)
  // Expect at least 1 activity event per 2 minutes (0.5/min) for engaged participant
  const expectedActivityRate = 0.5;
  let activityScore = Math.min((activityRate / expectedActivityRate) * 100, 100);
  if (activityRate < 0.2) {
    flags.push('LOW_ACTIVITY');
  }

  // 3. Audio/Video Participation Score (0-100)
  let avScore = 0;
  if (metrics.audioActive) avScore += 50;
  if (metrics.videoActive) avScore += 50;
  if (!metrics.audioActive && !metrics.videoActive) {
    flags.push('NO_AUDIO_VIDEO');
  }

  // 4. Consistency Score - check for suspicious patterns
  let consistencyScore = 100;
  
  // Check idle events ratio
  const totalEvents = metrics.activityEvents + metrics.idleEvents;
  const idlePercent = totalEvents > 0 ? (metrics.idleEvents / totalEvents) * 100 : 0;
  
  if (idlePercent > 60) {
    flags.push('HIGH_IDLE_TIME');
    consistencyScore -= 30;
  }

  // Check for automation patterns (too consistent)
  if (metrics.activityEvents > 0 && activityRate > 5) {
    flags.push('SUSPICIOUSLY_HIGH_ACTIVITY'); // Possible bot
    consistencyScore -= 40;
  }

  // Check for zero activity (tab left open)
  if (metrics.activityEvents === 0 && meetingDurationMin > 10) {
    flags.push('ZERO_ACTIVITY_DETECTED');
    consistencyScore = 0;
  }

  // Calculate final weighted score
  const finalScore = Math.round(
    (focusScore * weights.tabFocusTime) +
    (activityScore * weights.activityRate) +
    (avScore * weights.audioVideo) +
    (consistencyScore * weights.consistency)
  );

  // Determine engagement level
  let level: 'HIGH' | 'MEDIUM' | 'LOW' | 'SUSPICIOUS';
  let recommendation: 'APPROVE' | 'FLAG_FOR_REVIEW' | 'REJECT';

  if (finalScore >= 70) {
    level = 'HIGH';
    recommendation = 'APPROVE';
  } else if (finalScore >= 50) {
    level = 'MEDIUM';
    recommendation = flags.length > 2 ? 'FLAG_FOR_REVIEW' : 'APPROVE';
  } else if (finalScore >= 30) {
    level = 'LOW';
    recommendation = 'FLAG_FOR_REVIEW';
  } else {
    level = 'SUSPICIOUS';
    recommendation = 'REJECT';
  }

  // Override recommendation if critical flags present
  if (flags.includes('ZERO_ACTIVITY_DETECTED') || flags.includes('CRITICALLY_LOW_FOCUS')) {
    recommendation = 'REJECT';
  }

  return {
    score: finalScore,
    level,
    flags,
    recommendation,
    details: {
      focusTimePercent: Math.round(focusTimePercent * 10) / 10,
      activityRate: Math.round(activityRate * 10) / 10,
      engagementPattern: determinePattern(metrics, meetingDurationMin),
    },
  };
}

/**
 * Determine engagement pattern
 */
function determinePattern(metrics: EngagementMetrics, durationMin: number): string {
  const activityRate = metrics.activityEvents / durationMin;
  const idleRate = metrics.idleEvents / durationMin;

  if (metrics.activityEvents === 0) return 'NO_ACTIVITY';
  if (activityRate > 5) return 'HYPERACTIVE'; // Possibly automated
  if (idleRate > activityRate * 2) return 'MOSTLY_IDLE';
  if (activityRate >= 0.5 && idleRate < activityRate) return 'CONSISTENTLY_ENGAGED';
  if (activityRate >= 0.3) return 'MODERATELY_ENGAGED';
  return 'SPORADIC_ENGAGEMENT';
}

/**
 * Extract engagement metrics from attendance record
 */
export function extractEngagementMetrics(attendanceRecord: any): EngagementMetrics {
  const timeline = attendanceRecord.activityTimeline?.events || [];
  
  // Count activity types
  const activityEvents = timeline.filter((e: any) => e.type === 'ACTIVE').length;
  const idleEvents = timeline.filter((e: any) => e.type === 'IDLE').length;
  
  // Extract focus time (if tracked)
  const focusEvents = timeline.filter((e: any) => e.data?.tabFocused === true);
  const tabFocusTimeMs = focusEvents.length * 30 * 1000; // Assume 30s per heartbeat
  
  // Check for audio/video usage
  const audioActive = timeline.some((e: any) => e.data?.audioActive === true);
  const videoActive = timeline.some((e: any) => e.data?.videoActive === true);
  
  // Count Zoom reactions
  const zoomReactions = timeline.filter((e: any) => e.type === 'ZOOM_REACTION').length;
  
  // Count mouse and keyboard activity
  const mouseMovements = timeline.filter((e: any) => 
    e.data?.mouseMovement === true || e.type === 'MOUSE_MOVEMENT'
  ).length;
  
  const keyboardActivity = timeline.filter((e: any) => 
    e.data?.keyboardActivity === true || e.type === 'KEYBOARD_ACTIVITY'
  ).length;

  return {
    mouseMovements,
    keyboardActivity,
    tabFocusTimeMs,
    audioActive,
    videoActive,
    zoomReactions,
    activityEvents,
    idleEvents,
  };
}

/**
 * Analyze engagement and log results
 */
export async function analyzeAttendanceEngagement(
  attendanceId: string,
  attendanceRecord: any
): Promise<EngagementAnalysis> {
  try {
    const metrics = extractEngagementMetrics(attendanceRecord);
    const durationMin = attendanceRecord.totalDurationMin || 0;
    
    const analysis = calculateEngagementScore(metrics, durationMin);
    
    logger.info(`Engagement analysis for ${attendanceId}:`, {
      score: analysis.score,
      level: analysis.level,
      recommendation: analysis.recommendation,
      flags: analysis.flags,
    });
    
    return analysis;
  } catch (error: any) {
    logger.error('Engagement analysis error:', error);
    
    // Return safe default on error
    return {
      score: 0,
      level: 'SUSPICIOUS',
      flags: ['ANALYSIS_ERROR'],
      recommendation: 'FLAG_FOR_REVIEW',
      details: {
        focusTimePercent: 0,
        activityRate: 0,
        engagementPattern: 'ERROR',
      },
    };
  }
}

