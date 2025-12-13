/**
 * Migration Script: Add ZOOM_WEBHOOK to VerificationMethod enum
 * 
 * This script manually adds the ZOOM_WEBHOOK value to the database enum
 * since Railway doesn't automatically run migrations.
 */

const { Client } = require('pg');
require('dotenv').config();

async function addZoomWebhookEnum() {
  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL not found in environment variables');
    console.error('Please make sure your .env file exists in the backend directory');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  console.log(`Database: ${databaseUrl.split('@')[1]?.split('/')[0] || 'hidden'}`);

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false, // Railway requires SSL
    },
  });

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database successfully');

    // First, find the correct enum type name
    console.log('\n🔍 Looking for VerificationMethod enum type...');
    const typeCheck = await client.query(`
      SELECT n.nspname as schema, t.typname as typename
      FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typtype = 'e' 
      AND (t.typname ILIKE '%verification%' OR t.typname ILIKE '%method%')
      ORDER BY t.typname;
    `);
    
    if (typeCheck.rows.length === 0) {
      throw new Error('VerificationMethod enum type not found in database. Have you run Prisma migrations?');
    }
    
    console.log('Found enum types:');
    typeCheck.rows.forEach(row => {
      console.log(`   - ${row.schema}.${row.typename}`);
    });
    
    // Use the first matching type (should be VerificationMethod)
    const enumType = typeCheck.rows[0];
    const fullTypeName = `"${enumType.schema}"."${enumType.typename}"`;
    
    console.log(`\n📋 Current ${enumType.typename} enum values:`);
    // Query pg_enum directly using the oid
    const checkResult = await client.query(`
      SELECT e.enumlabel 
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = $1 AND t.typname = $2
      ORDER BY e.enumlabel;
    `, [enumType.schema, enumType.typename]);
    
    checkResult.rows.forEach((row) => {
      console.log(`   - ${row.enumlabel}`);
    });

    // Check if ZOOM_WEBHOOK already exists
    const hasZoomWebhook = checkResult.rows.some((row) => row.enumlabel === 'ZOOM_WEBHOOK');

    if (hasZoomWebhook) {
      console.log('\n✅ ZOOM_WEBHOOK already exists in the enum!');
      console.log('No migration needed.');
    } else {
      console.log('\n🔧 Adding ZOOM_WEBHOOK to enum...');
      
      // Add the new enum value using the correct schema-qualified name
      // Note: Cannot use parameterized query for ALTER TYPE
      const alterQuery = `ALTER TYPE "${enumType.schema}"."${enumType.typename}" ADD VALUE IF NOT EXISTS 'ZOOM_WEBHOOK';`;
      await client.query(alterQuery);

      console.log('✅ Successfully added ZOOM_WEBHOOK to enum!');

      // Verify it was added
      console.log(`\n📋 Updated ${enumType.typename} enum values:`);
      const verifyResult = await client.query(`
        SELECT e.enumlabel 
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = $1 AND t.typname = $2
        ORDER BY e.enumlabel;
      `, [enumType.schema, enumType.typename]);
      
      verifyResult.rows.forEach((row) => {
        console.log(`   - ${row.enumlabel}`);
      });
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n🎉 You can now test your Zoom webhook tracking!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
addZoomWebhookEnum();

