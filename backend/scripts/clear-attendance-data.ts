/**
 * Clear All Attendance Data Script
 * 
 * This script will delete all attendance-related data from the database:
 * - Attendance Records
 * - Court Cards
 * - Daily Digest Queue
 * 
 * WARNING: This action is irreversible!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAttendanceData() {
  console.log('🗑️  Starting attendance data cleanup...\n');

  try {
    // Step 1: Count existing records
    const attendanceCount = await prisma.attendanceRecord.count();
    const courtCardCount = await prisma.courtCard.count();
    const digestCount = await prisma.dailyDigestQueue.count();

    console.log('📊 Current data:');
    console.log(`   - Attendance Records: ${attendanceCount}`);
    console.log(`   - Court Cards: ${courtCardCount}`);
    console.log(`   - Daily Digest Queue: ${digestCount}\n`);

    if (attendanceCount === 0 && courtCardCount === 0 && digestCount === 0) {
      console.log('✅ No data to clear. Database is already clean!');
      return;
    }

    // Step 2: Delete in the correct order (respecting foreign key constraints)
    console.log('🧹 Deleting data...');

    // Delete Court Cards first (they reference AttendanceRecord)
    const deletedCourtCards = await prisma.courtCard.deleteMany({});
    console.log(`   ✓ Deleted ${deletedCourtCards.count} Court Cards`);

    // Delete Daily Digest Queue
    const deletedDigests = await prisma.dailyDigestQueue.deleteMany({});
    console.log(`   ✓ Deleted ${deletedDigests.count} Daily Digest entries`);

    // Delete Attendance Records last
    const deletedAttendance = await prisma.attendanceRecord.deleteMany({});
    console.log(`   ✓ Deleted ${deletedAttendance.count} Attendance Records`);

    console.log('\n✅ All attendance data cleared successfully!');
    console.log('\nℹ️  Note: User accounts and meeting requirements were preserved.\n');

  } catch (error: any) {
    console.error('❌ Error clearing attendance data:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearAttendanceData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

