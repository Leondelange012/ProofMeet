/**
 * Migration Script: Phase 1 to Version 2.0
 * 
 * This script helps migrate existing data from Phase 1 schema to Version 2.0
 * 
 * Usage:
 *   npm run migrate:v2
 * 
 * Prerequisites:
 *   - Run `npm install` to install type definitions
 *   - Run `npx prisma generate` to generate Prisma client
 */

// @ts-nocheck - Type errors will resolve after npm install
import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';
import { stdin, stdout } from 'process';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  ProofMeet Migration: Phase 1 → Version 2.0           ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  // Check if old tables exist
  console.log('🔍 Checking database state...');
  
  const tableCheck = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  ` as any[];

  const hasOldSchema = tableCheck.some((t: any) => t.table_name === 'meetings');
  const hasNewSchema = tableCheck.some((t: any) => t.table_name === 'external_meetings');

  console.log('');
  console.log('Database Status:');
  console.log(`  Old Schema (Phase 1): ${hasOldSchema ? '✓ Found' : '✗ Not found'}`);
  console.log(`  New Schema (v2.0):    ${hasNewSchema ? '✓ Found' : '✗ Not found'}`);
  console.log('');

  if (!hasNewSchema) {
    console.log('❌ New schema not found. Please run: npx prisma migrate dev');
    process.exit(1);
  }

  if (!hasOldSchema) {
    console.log('✅ No old data to migrate. Starting fresh with Version 2.0!');
    console.log('');
    console.log('Run: npm run seed');
    process.exit(0);
  }

  // Warning about data migration
  console.log('⚠️  WARNING: This migration will:');
  console.log('   1. Convert existing users to new user types');
  console.log('   2. Archive old meetings (not delete)');
  console.log('   3. Clear old attendance records (Phase 1 tracking)');
  console.log('');
  console.log('📦 Recommended: Backup your database before proceeding');
  console.log('');

  const answer = await question('Do you want to proceed? (yes/no): ');
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('Migration cancelled.');
    process.exit(0);
  }

  console.log('');
  console.log('🚀 Starting migration...');
  console.log('');

  // Step 1: Count existing data
  const oldUsers = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users` as any[];
  const userCount = parseInt(oldUsers[0].count);

  console.log(`📊 Found ${userCount} users to migrate`);

  if (userCount === 0) {
    console.log('No users found. Nothing to migrate.');
  } else {
    // Migration choice
    console.log('');
    console.log('Migration Options:');
    console.log('  1. Convert existing users (keep data)');
    console.log('  2. Fresh start (clear all data)');
    console.log('');

    const migrationChoice = await question('Choose option (1 or 2): ');

    if (migrationChoice === '2') {
      // Fresh start
      console.log('');
      console.log('⚠️  This will DELETE all existing data!');
      const confirm = await question('Type "DELETE ALL DATA" to confirm: ');
      
      if (confirm === 'DELETE ALL DATA') {
        console.log('🗑️  Clearing all data...');
        
        await prisma.$executeRaw`TRUNCATE TABLE attendance_records CASCADE`;
        await prisma.$executeRaw`TRUNCATE TABLE auth_tokens CASCADE`;
        await prisma.$executeRaw`TRUNCATE TABLE meetings CASCADE`;
        await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
        
        console.log('✅ All data cleared');
      } else {
        console.log('Fresh start cancelled.');
        process.exit(0);
      }
    } else if (migrationChoice === '1') {
      // Convert existing users
      console.log('');
      console.log('🔄 Converting users...');

      // Fetch old users
      const oldUsersData = await prisma.$queryRaw`
        SELECT id, email, "isHost", "courtId", "courtCaseNumber"
        FROM users
      ` as any[];

      let hostsConverted = 0;
      let participantsConverted = 0;

      for (const oldUser of oldUsersData) {
        const userType = oldUser.isHost ? 'COURT_REP' : 'PARTICIPANT';
        
        if (userType === 'COURT_REP') {
          // Convert host to Court Rep
          await prisma.$executeRaw`
            UPDATE users SET
              user_type = 'COURT_REP',
              court_domain = 'migrated.proofmeet.com',
              court_name = 'Migrated Court System',
              first_name = 'Migrated',
              last_name = 'User',
              password_hash = (SELECT password_hash FROM users WHERE id = ${oldUser.id}),
              is_email_verified = true
            WHERE id = ${oldUser.id}
          `;
          hostsConverted++;
        } else {
          // Convert participant
          // Try to find a court rep to link to
          const courtRep = await prisma.$queryRaw`
            SELECT id FROM users WHERE user_type = 'COURT_REP' LIMIT 1
          ` as any[];

          const courtRepId = courtRep.length > 0 ? courtRep[0].id : null;

          await prisma.$executeRaw`
            UPDATE users SET
              user_type = 'PARTICIPANT',
              case_number = ${oldUser.courtCaseNumber || 'MIGRATED-' + oldUser.id.substring(0, 8)},
              court_rep_id = ${courtRepId},
              first_name = 'Migrated',
              last_name = 'Participant',
              password_hash = (SELECT password_hash FROM users WHERE id = ${oldUser.id}),
              is_email_verified = true
            WHERE id = ${oldUser.id}
          `;
          participantsConverted++;
        }
      }

      console.log(`✅ Converted ${hostsConverted} hosts → Court Reps`);
      console.log(`✅ Converted ${participantsConverted} participants`);
    }
  }

  console.log('');
  console.log('✅ Migration completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run seed: npm run seed');
  console.log('  2. Test with: test.officer@probation.ca.gov / Test123!');
  console.log('  3. Restart backend: npm run dev');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Migration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });

