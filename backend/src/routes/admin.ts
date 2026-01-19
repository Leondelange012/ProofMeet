/// <reference path="../types/express.d.ts" />

import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { processPendingDigests } from '../services/emailService';
import { syncAllMeetings, testMeetingAPIs } from '../services/meetingSyncService';

const router = Router();

/**
 * Admin secret validation middleware
 */
function requireAdminSecret(req: Request, res: Response, next: Function) {
  const adminSecret = req.headers['x-admin-secret'] || req.query.adminSecret;
  
  if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Invalid admin secret',
    });
  }
  
  next();
}

router.use(requireAdminSecret);

// ============================================
// DAILY DIGEST MANAGEMENT
// ============================================

/**
 * POST /api/admin/send-daily-digests
 * Process and send all pending daily digests
 * Should be called by a cron job daily
 */
router.post('/send-daily-digests', async (req: Request, res: Response) => {
  try {
    logger.info('Admin triggered: Send daily digests');

    const result = await processPendingDigests();

    res.json({
      success: true,
      message: 'Daily digests processed',
      data: {
        digestsSent: result.sent,
        digestsFailed: result.failed,
      },
    });
  } catch (error: any) {
    logger.error('Admin send daily digests error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/admin/digest-queue
 * View current digest queue status
 */
router.get('/digest-queue', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status;

    const digests = await prisma.dailyDigestQueue.findMany({
      where,
      orderBy: { digestDate: 'desc' },
      take: 100,
      include: {
        courtRep: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: digests.map(d => ({
        id: d.id,
        courtRepEmail: d.courtRep.email,
        courtRepName: `${d.courtRep.firstName} ${d.courtRep.lastName}`,
        digestDate: d.digestDate,
        attendanceCount: d.attendanceRecordIds.length,
        status: d.status,
        sentAt: d.sentAt,
        retryCount: d.retryCount,
      })),
    });
  } catch (error: any) {
    logger.error('Get digest queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// DATABASE MANAGEMENT
// ============================================

/**
 * DELETE /api/admin/clear-database
 * Clear all data (development/testing only)
 */
router.delete('/clear-database', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Cannot clear database in production',
      });
    }

    logger.warn('Admin triggered: Clear database');

    // Delete in order (respecting foreign key constraints)
    await prisma.courtCard.deleteMany({});
    await prisma.attendanceRecord.deleteMany({});
    await prisma.dailyDigestQueue.deleteMany({});
    await prisma.meetingRequirement.deleteMany({});
    await prisma.externalMeeting.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.auditLog.deleteMany({});

    logger.info('Database cleared successfully');

    res.json({
      success: true,
      message: 'Database cleared successfully',
    });
  } catch (error: any) {
    logger.error('Clear database error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// SYSTEM HEALTH
// ============================================

/**
 * GET /api/admin/system-health
 * Get system health and statistics
 */
router.get('/system-health', async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalCourtReps,
      totalParticipants,
      totalMeetings,
      totalAttendance,
      totalCourtCards,
      pendingDigests,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { userType: 'COURT_REP' } }),
      prisma.user.count({ where: { userType: 'PARTICIPANT' } }),
      prisma.externalMeeting.count(),
      prisma.attendanceRecord.count(),
      prisma.courtCard.count(),
      prisma.dailyDigestQueue.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      success: true,
      data: {
        version: '2.0.0',
        environment: process.env.NODE_ENV,
        database: 'Connected',
        statistics: {
          users: {
            total: totalUsers,
            courtReps: totalCourtReps,
            participants: totalParticipants,
          },
          meetings: totalMeetings,
          attendance: totalAttendance,
          courtCards: totalCourtCards,
          pendingDigests,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('System health error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      database: 'Disconnected',
    });
  }
});

// ============================================
// APPROVED COURT DOMAINS
// ============================================

/**
 * GET /api/admin/approved-court-domains
 * Get list of approved court email domains
 */
router.get('/approved-court-domains', async (req: Request, res: Response) => {
  try {
    const domains = await prisma.approvedCourtDomain.findMany({
      where: { isActive: true },
      orderBy: { state: 'asc' },
    });

    res.json({
      success: true,
      data: domains,
    });
  } catch (error: any) {
    logger.error('Get approved domains error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/admin/approved-court-domains
 * Add a new approved court domain
 */
router.post('/approved-court-domains', async (req: Request, res: Response) => {
  try {
    const { domain, state, organization, contactEmail } = req.body;

    if (!domain || !state || !organization) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: domain, state, organization',
      });
    }

    const newDomain = await prisma.approvedCourtDomain.create({
      data: {
        domain,
        state,
        organization,
        contactEmail,
      },
    });

    logger.info(`New court domain approved: ${domain}`);

    res.status(201).json({
      success: true,
      message: 'Court domain added successfully',
      data: newDomain,
    });
  } catch (error: any) {
    logger.error('Add approved domain error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// MEETING SYNC MANAGEMENT
// ============================================

/**
 * POST /api/admin/sync-meetings
 * Manually trigger meeting sync from external sources
 */
router.post('/sync-meetings', async (req: Request, res: Response) => {
  try {
    logger.info('Admin triggered: Manual meeting sync');

    const result = await syncAllMeetings();

    res.json({
      success: result.success,
      message: result.success ? 'Meeting sync completed successfully' : 'Meeting sync failed',
      data: {
        totalFetched: result.totalFetched,
        totalSaved: result.totalSaved,
        totalCleaned: result.totalCleaned,
        sources: result.sources,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    logger.error('Admin sync meetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/admin/test-meeting-apis
 * Test connectivity to external meeting APIs
 */
router.get('/test-meeting-apis', async (req: Request, res: Response) => {
  try {
    logger.info('Admin triggered: Test meeting APIs');

    await testMeetingAPIs();

    res.json({
      success: true,
      message: 'API tests complete - check server logs for results',
    });
  } catch (error: any) {
    logger.error('Admin test meeting APIs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/admin/meeting-stats
 * Get statistics about synced meetings
 */
router.get('/meeting-stats', async (req: Request, res: Response) => {
  try {
    const totalMeetings = await prisma.externalMeeting.count();
    
    const meetingsByProgram = await prisma.externalMeeting.groupBy({
      by: ['program'],
      _count: true,
    });
    
    const meetingsByFormat = await prisma.externalMeeting.groupBy({
      by: ['format'],
      _count: true,
    });
    
    const recentlySynced = await prisma.externalMeeting.count({
      where: {
        lastSyncedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalMeetings,
        recentlySynced,
        byProgram: meetingsByProgram.reduce((acc: any, curr: any) => {
          acc[curr.program] = curr._count;
          return acc;
        }, {}),
        byFormat: meetingsByFormat.reduce((acc: any, curr: any) => {
          acc[curr.format] = curr._count;
          return acc;
        }, {}),
      },
    });
  } catch (error: any) {
    logger.error('Get meeting stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as adminRoutes };

