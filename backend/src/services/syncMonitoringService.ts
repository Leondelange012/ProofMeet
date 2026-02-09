/**
 * Meeting Sync Monitoring Service
 * 
 * Monitors sync health and sends alerts when issues are detected
 */

import { prisma } from '../index';
import { logger } from '../utils/logger';

export interface SyncHealthStatus {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  lastSyncAt: Date | null;
  hoursSinceLastSync: number | null;
  totalMeetings: number;
  meetingsByProgram: {
    AA: number;
    NA: number;
    SMART: number;
    [key: string]: number;
  };
  issues: string[];
  recommendations: string[];
}

/**
 * Check the health of the meeting sync system
 */
export async function checkSyncHealth(): Promise<SyncHealthStatus> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Get last sync time
  const lastSyncedMeeting = await prisma.externalMeeting.findFirst({
    orderBy: { lastSyncedAt: 'desc' },
    select: { lastSyncedAt: true }
  });
  
  const lastSyncAt = lastSyncedMeeting?.lastSyncedAt || null;
  
  // Calculate hours since last sync
  const hoursSinceLastSync = lastSyncAt
    ? (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60)
    : null;
  
  // Get total meeting count
  const totalMeetings = await prisma.externalMeeting.count();
  
  // Get meetings by program
  const meetingsByProgram = await prisma.externalMeeting.groupBy({
    by: ['program'],
    _count: true
  });
  
  const programCounts = meetingsByProgram.reduce((acc, item) => {
    acc[item.program] = item._count;
    return acc;
  }, {} as { [key: string]: number });
  
  // Ensure all programs are represented
  const standardPrograms = { AA: 0, NA: 0, SMART: 0, ...programCounts };
  
  // Determine status
  let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
  
  // Check 1: Has sync run recently?
  if (!lastSyncAt) {
    status = 'CRITICAL';
    issues.push('No meetings have ever been synced');
    recommendations.push('Run: npx ts-node scripts/sync-aa-intergroup.ts');
  } else if (hoursSinceLastSync && hoursSinceLastSync > 48) {
    status = 'CRITICAL';
    issues.push(`Last sync was ${hoursSinceLastSync.toFixed(1)} hours ago (>48h)`);
    recommendations.push('Check if automated sync is running');
    recommendations.push('Manually trigger sync if needed');
  } else if (hoursSinceLastSync && hoursSinceLastSync > 30) {
    status = 'WARNING';
    issues.push(`Last sync was ${hoursSinceLastSync.toFixed(1)} hours ago (>30h)`);
    recommendations.push('Monitor next scheduled sync');
  }
  
  // Check 2: Do we have enough meetings?
  if (totalMeetings === 0) {
    status = 'CRITICAL';
    issues.push('No meetings in database');
    recommendations.push('Run initial sync immediately');
  } else if (totalMeetings < 50) {
    status = status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
    issues.push(`Only ${totalMeetings} meetings in database (expected 100+)`);
    recommendations.push('Check sync logs for errors');
    recommendations.push('Verify API endpoints are accessible');
  }
  
  // Check 3: Do we have AA meetings?
  if (standardPrograms.AA === 0) {
    status = status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
    issues.push('No AA meetings found (primary source may be failing)');
    recommendations.push('Check aa-intergroup.org accessibility');
    recommendations.push('Review sync error logs');
  } else if (standardPrograms.AA < 50) {
    status = status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
    issues.push(`Only ${standardPrograms.AA} AA meetings (expected 100+)`);
    recommendations.push('AA sync may be filtering too aggressively');
  }
  
  // Log health check
  logger.info('🏥 Sync Health Check:', {
    status,
    lastSyncAt: lastSyncAt?.toISOString(),
    hoursSinceLastSync: hoursSinceLastSync?.toFixed(1),
    totalMeetings,
    meetingsByProgram: standardPrograms,
    issuesCount: issues.length
  });
  
  return {
    status,
    lastSyncAt,
    hoursSinceLastSync,
    totalMeetings,
    meetingsByProgram: standardPrograms,
    issues,
    recommendations
  };
}

/**
 * Get sync statistics
 */
export async function getSyncStatistics() {
  const [
    totalMeetings,
    meetingsWithZoom,
    meetingsWithProof,
    recentlyUpdated,
    programCounts
  ] = await Promise.all([
    prisma.externalMeeting.count(),
    prisma.externalMeeting.count({ where: { zoomId: { not: null } } }),
    prisma.externalMeeting.count({ where: { hasProofCapability: true } }),
    prisma.externalMeeting.count({
      where: {
        lastSyncedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    }),
    prisma.externalMeeting.groupBy({
      by: ['program'],
      _count: true
    })
  ]);
  
  return {
    totalMeetings,
    meetingsWithZoom,
    meetingsWithProof,
    recentlyUpdated,
    programCounts: programCounts.reduce((acc, item) => {
      acc[item.program] = item._count;
      return acc;
    }, {} as { [key: string]: number })
  };
}

/**
 * Check if a specific meeting exists
 */
export async function checkMeetingExists(zoomId: string): Promise<{
  exists: boolean;
  meeting?: any;
}> {
  const meeting = await prisma.externalMeeting.findFirst({
    where: {
      zoomId: {
        contains: zoomId
      }
    }
  });
  
  return {
    exists: !!meeting,
    meeting: meeting || undefined
  };
}
