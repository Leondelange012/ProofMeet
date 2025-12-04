import { prisma } from '../index';
import { logger } from '../utils/logger';

/**
 * Activity Event Types
 */
export type ActivityEventType = 
  | 'JOIN' 
  | 'LEAVE' 
  | 'REJOIN' 
  | 'MOUSE_MOVE' 
  | 'KEYBOARD' 
  | 'SCROLL' 
  | 'CLICK' 
  | 'IDLE' 
  | 'ACTIVE';

export interface ActivityEvent {
  timestamp: string; // ISO string
  type: ActivityEventType;
  metadata?: {
    x?: number;
    y?: number;
    key?: string;
    button?: string;
    duration?: number; // For idle events
    [key: string]: any;
  };
}

/**
 * Leave/Rejoin Event
 */
export interface LeaveRejoinEvent {
  timestamp: string;
  type: 'LEAVE' | 'REJOIN';
  durationAtLeave?: number; // Minutes in meeting before leaving
  reason?: string; // Optional reason for leaving
}

/**
 * Normalize activity timeline to ensure it's always in the correct format
 * Handles both array format [...] and object format { events: [...] }
 */
function normalizeTimeline(activityTimeline: any): any[] {
  if (!activityTimeline) {
    return [];
  }
  
  // If it's already an array, return it
  if (Array.isArray(activityTimeline)) {
    return activityTimeline;
  }
  
  // If it's an object with an events array, return the events
  if (activityTimeline && typeof activityTimeline === 'object' && Array.isArray(activityTimeline.events)) {
    return activityTimeline.events;
  }
  
  // If it's an object without events array, return empty
  logger.warn(`Unexpected activityTimeline format:`, { type: typeof activityTimeline, keys: Object.keys(activityTimeline || {}) });
  return [];
}

/**
 * Add activity event to attendance record
 */
export async function addActivityEvent(
  attendanceId: string,
  event: ActivityEvent
): Promise<void> {
  try {
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceId },
      select: { activityTimeline: true },
    });

    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    // Get existing timeline or initialize - handles both array and object formats
    const events = normalizeTimeline(attendance.activityTimeline);
    
    // Add new event
    events.push({
      ...event,
      timestamp: new Date().toISOString(),
    });

    // Update attendance record - always store in { events: [...] } format for consistency
    await prisma.attendanceRecord.update({
      where: { id: attendanceId },
      data: {
        activityTimeline: { events } as any,
        updatedAt: new Date(),
      },
    });
  } catch (error: any) {
    logger.error(`Error adding activity event to ${attendanceId}:`, error);
    throw error;
  }
}

/**
 * Record leave event
 */
export async function recordLeaveEvent(
  attendanceId: string,
  reason?: string
): Promise<LeaveRejoinEvent> {
  try {
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceId },
      select: {
        joinTime: true,
        activityTimeline: true,
      },
    });

    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    const now = new Date();
    const durationAtLeave = Math.floor(
      (now.getTime() - attendance.joinTime.getTime()) / (1000 * 60)
    );

    const leaveEvent: LeaveRejoinEvent = {
      timestamp: now.toISOString(),
      type: 'LEAVE',
      durationAtLeave,
      reason,
    };

    // Add to activity timeline - this will add and save in normalized format
    await addActivityEvent(attendanceId, {
      timestamp: now.toISOString(),
      type: 'LEAVE',
      metadata: { durationAtLeave, reason },
    });

    logger.info(`Leave event recorded for ${attendanceId} at ${leaveEvent.timestamp}`);
    
    return leaveEvent;
  } catch (error: any) {
    logger.error(`Error recording leave event for ${attendanceId}:`, error);
    throw error;
  }
}

/**
 * Record rejoin event
 */
export async function recordRejoinEvent(
  attendanceId: string
): Promise<LeaveRejoinEvent> {
  try {
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceId },
      select: {
        joinTime: true,
        activityTimeline: true,
      },
    });

    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    const now = new Date();
    const durationAtRejoin = Math.floor(
      (now.getTime() - attendance.joinTime.getTime()) / (1000 * 60)
    );

    const rejoinEvent: LeaveRejoinEvent = {
      timestamp: now.toISOString(),
      type: 'REJOIN',
      durationAtLeave: durationAtRejoin,
    };

    // Add to activity timeline - this will add and save in normalized format
    await addActivityEvent(attendanceId, {
      timestamp: now.toISOString(),
      type: 'REJOIN',
      metadata: { durationAtRejoin },
    });

    logger.info(`Rejoin event recorded for ${attendanceId} at ${rejoinEvent.timestamp}`);
    
    return rejoinEvent;
  } catch (error: any) {
    logger.error(`Error recording rejoin event for ${attendanceId}:`, error);
    throw error;
  }
}

// Export normalizeTimeline for use in other services
export { normalizeTimeline };

/**
 * Calculate active duration from activity timeline
 */
export function calculateActiveDuration(
  joinTime: Date,
  leaveTime: Date | null,
  activityTimeline: any
): {
  totalDurationMin: number;
  activeDurationMin: number;
  idleDurationMin: number;
  leaveRejoinPeriods: Array<{ leaveTime: Date; rejoinTime: Date | null; durationMin: number }>;
} {
  // Normalize timeline to always be an array
  const normalizedTimeline = normalizeTimeline(activityTimeline);
  
  if (normalizedTimeline.length === 0) {
    // Fallback: use join to leave time
    const totalMin = leaveTime
      ? Math.floor((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60))
      : 0;
    return {
      totalDurationMin: totalMin,
      activeDurationMin: totalMin,
      idleDurationMin: 0,
      leaveRejoinPeriods: [],
    };
  }

  // Sort events by timestamp
  const sortedEvents = [...normalizedTimeline].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Find all leave/rejoin events
  const leaveRejoinEvents = sortedEvents.filter(
    (e) => e.type === 'LEAVE' || e.type === 'REJOIN'
  );

  // Calculate leave/rejoin periods
  const leaveRejoinPeriods: Array<{ leaveTime: Date; rejoinTime: Date | null; durationMin: number }> = [];
  let currentLeaveTime: Date | null = null;

  for (const event of leaveRejoinEvents) {
    if (event.type === 'LEAVE') {
      currentLeaveTime = new Date(event.timestamp);
    } else if (event.type === 'REJOIN' && currentLeaveTime) {
      const rejoinTime = new Date(event.timestamp);
      const durationMin = Math.floor(
        (rejoinTime.getTime() - currentLeaveTime.getTime()) / (1000 * 60)
      );
      leaveRejoinPeriods.push({
        leaveTime: currentLeaveTime,
        rejoinTime,
        durationMin,
      });
      currentLeaveTime = null;
    }
  }

  // If there's an unclosed leave event, use leaveTime or current time
  if (currentLeaveTime) {
    const endTime = leaveTime || new Date();
    const durationMin = Math.floor(
      (endTime.getTime() - currentLeaveTime.getTime()) / (1000 * 60)
    );
    leaveRejoinPeriods.push({
      leaveTime: currentLeaveTime,
      rejoinTime: leaveTime,
      durationMin,
    });
  }

  // Calculate total time away (idle during leaves)
  const totalIdleMin = leaveRejoinPeriods.reduce(
    (sum, period) => sum + period.durationMin,
    0
  );

  // Calculate total duration
  const endTime = leaveTime || new Date();
  const totalDurationMin = Math.floor(
    (endTime.getTime() - joinTime.getTime()) / (1000 * 60)
  );

  // Active duration = total - idle
  const activeDurationMin = Math.max(0, totalDurationMin - totalIdleMin);

  return {
    totalDurationMin,
    activeDurationMin,
    idleDurationMin: totalIdleMin,
    leaveRejoinPeriods,
  };
}

/**
 * Get last activity timestamp from timeline
 */
export function getLastActivityTimestamp(
  activityTimeline: any
): Date | null {
  // Normalize timeline to always be an array
  const normalizedTimeline = normalizeTimeline(activityTimeline);
  
  if (normalizedTimeline.length === 0) {
    return null;
  }

  // Filter out leave events (they're not "activity")
  const activeEvents = normalizedTimeline.filter(
    (e: any) => e.type !== 'LEAVE' && e.type !== 'REJOIN'
  );

  if (activeEvents.length === 0) {
    return null;
  }

  // Sort by timestamp and get the last one
  const sorted = [...activeEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return new Date(sorted[0].timestamp);
}

/**
 * Calculate engagement metrics from activity timeline
 */
export function calculateEngagementMetrics(
  activityTimeline: any,
  totalDurationMin: number
): {
  activityRate: number; // Events per minute
  mouseMovements: number;
  keyboardActivity: number;
  idleEvents: number;
  engagementScore: number; // 0-100
} {
  // Normalize timeline to always be an array
  const normalizedTimeline = normalizeTimeline(activityTimeline);
  
  if (normalizedTimeline.length === 0) {
    return {
      activityRate: 0,
      mouseMovements: 0,
      keyboardActivity: 0,
      idleEvents: 0,
      engagementScore: 0,
    };
  }

  // Filter out leave/rejoin events for engagement calculation
  const engagementEvents = normalizedTimeline.filter(
    (e: any) => e.type !== 'LEAVE' && e.type !== 'REJOIN'
  );

  const mouseMovements = engagementEvents.filter(
    (e: any) => e.type === 'MOUSE_MOVE' || e.type === 'CLICK'
  ).length;

  const keyboardActivity = engagementEvents.filter(
    (e: any) => e.type === 'KEYBOARD'
  ).length;

  const idleEvents = engagementEvents.filter((e: any) => e.type === 'IDLE').length;

  const activityRate =
    totalDurationMin > 0 ? engagementEvents.length / totalDurationMin : 0;

  // Calculate engagement score (0-100)
  // Higher score = more activity, less idle time
  const activityScore = Math.min(activityRate * 5, 50); // Max 50 points
  const interactionScore = Math.min(
    ((mouseMovements + keyboardActivity) / engagementEvents.length) * 50,
    50
  ); // Max 50 points
  const idlePenalty = Math.min((idleEvents / engagementEvents.length) * 50, 50); // Max -50 points

  const engagementScore = Math.max(0, Math.min(100, activityScore + interactionScore - idlePenalty));

  return {
    activityRate,
    mouseMovements,
    keyboardActivity,
    idleEvents,
    engagementScore: Math.round(engagementScore),
  };
}

