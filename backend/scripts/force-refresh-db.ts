/**
 * Force refresh database connection and Prisma client
 * Run this if data isn't updating properly
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceRefresh() {
  console.log('🔄 Force refreshing database connection...');
  
  try {
    // Disconnect existing connections
    await prisma.$disconnect();
    console.log('✅ Disconnected from database');
    
    // Reconnect
    await prisma.$connect();
    console.log('✅ Reconnected to database');
    
    // Test query
    const userCount = await prisma.user.count();
    console.log(`✅ Database connection verified: ${userCount} users found`);
    
    // Check for new tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log('\n📊 Database tables:');
    console.log(tables);
    
    // Verify new photo verification tables exist
    const photoTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('participant_id_photos', 'webcam_snapshots', 'meeting_host_signatures');
    `;
    
    console.log('\n📸 Photo verification tables:');
    console.log(photoTables);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceRefresh();

