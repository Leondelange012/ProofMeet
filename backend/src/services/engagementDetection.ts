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

  // Weighted scoring system - REALISTIC for actual meetings
  const weights = {
    audioVideo: 0.50,         // MOST IMPORTANT - is camera on and are they visible?
    hasAnyActivity: 0.30,     // Did they show ANY signs of presence?
    consistency: 0.20,        // Pattern consistency (not a bot)
  };

  // 1. Audio/Video Participation Score (0-100) - PRIMARY CHECK
  // This proves they're actually present and visible
  let avScore = 0;
  if (metrics.audioActive) avScore += 30;  // Audio helps but not required
  if (metrics.videoActive) avScore += 70;  // Video is the key indicator
  
  if (!metrics.videoActive) {
    flags.push('NO_VIDEO'); // No camera = can't verify presence
  }

  // 2. Activity Presence Score (0-100)
  // ANY activity (mouse/keyboard) proves they're actually there
  // We don't care if it's frequent - just that it exists
  let activityScore = 0;
  const hasAnyActivity = (metrics.mouseMovements > 0 || metrics.keyboardActivity > 0 || metrics.activityEvents > 0);
  
  if (hasAnyActivity) {
    activityScore = 100; // ANY activity is good enough
  } else {
    activityScore = 0;
    // Only flag if there's literally ZERO activity in a meeting > 10 min
    if (meetingDurationMin > 10) {
      flags.push('ZERO_ACTIVITY');
    }
  }

  // 3. Tab Focus is REMOVED - people in meetings look at notes, other screens, etc.
  // We care about video + any activity, not constant tab focus

  // 4. Consistency Score - check for suspicious patterns (bot detection)
  let consistencyScore = 100;
  
  // DEBUG: Log activity rate calculation
  logger.info(`🔍 Bot Detection Analysis:`);
  logger.info(`   - Activity Events: ${metrics.activityEvents}`);
  logger.info(`   - Meeting Duration: ${meetingDurationMin} min`);
  logger.info(`   - Activity Rate: ${activityRate.toFixed(2)} events/min`);
  logger.info(`   - Mouse Movements: ${metrics.mouseMovements}`);
  logger.info(`   - Keyboard Activity: ${metrics.keyboardActivity}`);
  
  // Check for automation patterns (too consistent = possible bot)
  // UPDATED THRESHOLDS: Much more lenient for normal meeting behavior
  if (metrics.activityEvents > 0 && activityRate > 30) {
    flags.push('SUSPICIOUSLY_HIGH_ACTIVITY'); // Possible bot/automation
    consistencyScore -= 50;
    logger.info(`   ⚠️ SUSPICIOUSLY_HIGH_ACTIVITY flagged (rate > 30)`);
  }

  // Extremely high activity with perfect timing suggests automation
  if (activityRate > 50) {
    flags.push('LIKELY_AUTOMATED');
    consistencyScore = 0;
    logger.info(`   ⚠️ LIKELY_AUTOMATED flagged (rate > 50)`);
  }

  // Calculate final weighted score
  const finalScore = Math.round(
    (avScore * weights.audioVideo) +
    (activityScore * weights.hasAnyActivity) +
    (consistencyScore * weights.consistency)
  );

  // Determine engagement level and recommendation
  let level: 'HIGH' | 'MEDIUM' | 'LOW' | 'SUSPICIOUS';
  let recommendation: 'APPROVE' | 'FLAG_FOR_REVIEW' | 'REJECT';

  // Simple, clear rules:
  // - Video ON + ANY activity = APPROVE (they're clearly there)
  // - Video OFF but activity present = FLAG FOR REVIEW (can't verify visual presence)
  // - No activity at all = REJECT (tab left open)
  // - Bot-like behavior = REJECT (automation detected)

  if (flags.includes('LIKELY_AUTOMATED')) {
    level = 'SUSPICIOUS';
    recommendation = 'REJECT';
  } else if (flags.includes('ZERO_ACTIVITY')) {
    level = 'SUSPICIOUS';
    recommendation = 'REJECT';
  } else if (finalScore >= 80) {
    // Video ON + activity = great!
    level = 'HIGH';
    recommendation = 'APPROVE';
  } else if (finalScore >= 50) {
    // Some presence indicators but maybe no video
    level = 'MEDIUM';
    recommendation = flags.includes('NO_VIDEO') ? 'FLAG_FOR_REVIEW' : 'APPROVE';
  } else if (finalScore >= 30) {
    // Minimal engagement
    level = 'LOW';
    recommendation = 'FLAG_FOR_REVIEW';
  } else {
    level = 'SUSPICIOUS';
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
  const hasActivity = (metrics.mouseMovements > 0 || metrics.keyboardActivity > 0 || metrics.activityEvents > 0);
  const activityRate = metrics.activityEvents / durationMin;

  // Simple pattern detection - UPDATED THRESHOLDS
  if (!hasActivity) return 'NO_ACTIVITY';
  if (activityRate > 50) return 'LIKELY_AUTOMATED'; // Too perfect = bot
  if (activityRate > 30) return 'VERY_HIGH_ACTIVITY'; // Suspicious
  if (metrics.videoActive && hasActivity) return 'PRESENT_AND_ENGAGED';
  if (hasActivity && !metrics.videoActive) return 'ACTIVE_NO_VIDEO';
  return 'NORMAL_ENGAGEMENT';
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

