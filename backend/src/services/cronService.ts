/**
 * Cron Service
 * Schedules automated tasks like daily meeting sync
 */

import cron from 'node-cron';
import { syncAllMeetings } from './meetingSyncService';
import { logger } from '../utils/logger';

/**
 * Schedule meeting sync every 2 days at 2 AM
 */
export function scheduleDailyMeetingSync(): void {
  // Run every 2 days at 2:00 AM
  cron.schedule('0 2 */2 * *', async () => {
    logger.info('⏰ Automated meeting sync triggered (every 2 days)');
    try {
      const result = await syncAllMeetings();
      if (result.success) {
        logger.info(`✅ Automated sync complete: ${result.totalSaved} meetings saved`);
      } else {
        logger.error('❌ Automated sync failed');
      }
    } catch (error: any) {
      logger.error('❌ Automated sync error:', error);
    }
  });
  
  logger.info('✅ Meeting sync scheduled for every 2 days at 2:00 AM');
}

/**
 * Run meeting sync on server startup (optional)
 */
export async function runInitialMeetingSync(): Promise<void> {
  logger.info('🚀 Running initial meeting sync on startup...');
  try {
    const result = await syncAllMeetings();
    if (result.success) {
      logger.info(`✅ Initial sync complete: ${result.totalSaved} meetings saved`);
    }
  } catch (error: any) {
    logger.error('❌ Initial sync error:', error);
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

