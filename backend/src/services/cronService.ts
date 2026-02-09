/**
 * Cron Service
 * Schedules automated tasks like DAILY meeting sync
 * CRITICAL: Meetings must sync daily to stay current
 */

import cron from 'node-cron';
import { syncAllMeetings } from './meetingSyncService';
import { checkSyncHealth } from './syncMonitoringService';
import { logger } from '../utils/logger';

/**
 * Schedule meeting sync DAILY at 2 AM
 * CHANGED: From every 2 days to EVERY DAY (2026-02-09)
 */
export function scheduleDailyMeetingSync(): void {
  // Run DAILY at 2:00 AM (cron: minute hour day month weekday)
  cron.schedule('0 2 * * *', async () => {
    logger.info('⏰ ========================================');
    logger.info('⏰ Automated DAILY meeting sync triggered');
    logger.info('⏰ ========================================');
    
    try {
      const result = await syncAllMeetings();
      
      if (result.success) {
        logger.info(`✅ Automated sync complete: ${result.totalSaved} meetings saved`);
        logger.info(`   Duration: ${(result.duration! / 1000).toFixed(2)}s`);
        logger.info(`   AA: ${result.sources.aa}, NA: ${result.sources.na}, SMART: ${result.sources.smart}`);
        
        // ALERT if too few meetings synced
        if (result.totalSaved < 100) {
          logger.error('🚨 CRITICAL ALERT: Sync returned very few meetings!', {
            totalSaved: result.totalSaved,
            sources: result.sources,
            errors: result.errors
          });
        }
      } else {
        logger.error('❌ Automated sync FAILED!', {
          errors: result.errors,
          sources: result.sources
        });
        logger.error('🚨 CRITICAL: Meeting sync failure - check logs immediately!');
      }
      
      // Check overall sync health after each run
      const health = await checkSyncHealth();
      if (health.status === 'CRITICAL') {
        logger.error('🚨 CRITICAL: Sync health check FAILED!', {
          issues: health.issues,
          recommendations: health.recommendations
        });
      }
      
    } catch (error: any) {
      logger.error('❌ Automated sync EXCEPTION:', {
        error: error.message,
        stack: error.stack
      });
      logger.error('🚨 CRITICAL: Sync threw exception - check logs immediately!');
    }
  });
  
  logger.info('✅ Meeting sync scheduled for DAILY at 2:00 AM (cron: 0 2 * * *)');
}

/**
 * Run meeting sync on server startup (optional)
 */
export async function runInitialMeetingSync(): Promise<void> {
  logger.info('🚀 ========================================');
  logger.info('🚀 Running initial meeting sync on startup...');
  logger.info('🚀 ========================================');
  
  try {
    const result = await syncAllMeetings();
    
    if (result.success) {
      logger.info(`✅ Initial sync complete: ${result.totalSaved} meetings saved in ${(result.duration! / 1000).toFixed(2)}s`);
      logger.info(`   AA: ${result.sources.aa}, NA: ${result.sources.na}, SMART: ${result.sources.smart}`);
      
      // Check health after startup sync
      const health = await checkSyncHealth();
      logger.info(`📊 Sync Health: ${health.status}`);
      logger.info(`📊 Total Meetings: ${health.totalMeetings}`);
      logger.info(`📊 AA Meetings: ${health.meetingsByProgram.AA}`);
      
      if (health.status !== 'HEALTHY') {
        logger.warn('⚠️  Sync health is not optimal:', {
          status: health.status,
          issues: health.issues
        });
      }
    } else {
      logger.error('❌ Initial sync FAILED!', {
        errors: result.errors
      });
    }
  } catch (error: any) {
    logger.error('❌ Initial sync error:', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs(runInitialSync: boolean = false): void {
  logger.info('🕐 Initializing cron jobs...');
  
  // Schedule daily meeting sync
  scheduleDailyMeetingSync();
  
  // Optionally run initial sync
  if (runInitialSync) {
    // Run after 30 seconds to allow server to fully start
    setTimeout(() => {
      runInitialMeetingSync();
    }, 30000);
  }
  
  logger.info('✅ Cron jobs initialized');
}

