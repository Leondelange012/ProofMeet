# Database Migration Guide: Phase 1 → Version 2.0

## 📋 Overview

This guide helps you migrate from ProofMeet Phase 1 to Version 2.0 (Court Compliance System).

---

## 🚀 Quick Start (Fresh Installation)

If you're starting fresh with no existing data:

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL

# 3. Generate Prisma client
npx prisma generate

# 4. Create and apply migrations
npx prisma migrate dev --name init_v2

# 5. Seed initial data
npm run seed

# 6. Start the server
npm run dev
```

**Test Accounts Created:**
- Court Rep: `test.officer@probation.ca.gov` / `Test123!`
- Participant: `test.participant@example.com` / `Test123!`

---

## 🔄 Migration from Existing Phase 1 System

### Step 1: Backup Your Database

**CRITICAL: Always backup before migrating!**

```bash
# For PostgreSQL
pg_dump your_database_name > backup_phase1_$(date +%Y%m%d).sql

# For Railway/Cloud
# Use their backup feature or pg_dump with connection string
```

### Step 2: Install New Dependencies

```bash
cd backend
npm install
```

### Step 3: Update Environment Variables

Add these new variables to your `.env`:

```bash
# Existing DATABASE_URL stays the same
DATABASE_URL=postgresql://...

# New required variables
JWT_SECRET=your-secure-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
BCRYPT_ROUNDS=12

# Email service (SendGrid recommended)
SENDGRID_API_KEY=your-sendgrid-api-key

# CORS origins
CORS_ORIGIN=http://localhost:3000,https://your-frontend.vercel.app
```

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

### Step 5: Create Migration

```bash
# This creates the new schema
npx prisma migrate dev --name upgrade_to_v2

# If prompted about data loss, review carefully
# The old schema will be modified
```

### Step 6: Run Data Migration Script

```bash
npm run migrate:v2
```

This script will:
1. Check database state
2. Offer migration options:
   - **Convert existing users** (keeps data, converts to new format)
   - **Fresh start** (clears all data, starts clean)
3. Guide you through the process

**Recommended:** Choose "Fresh start" for MVP testing.

### Step 7: Seed Approved Court Domains

```bash
npm run seed
```

This adds:
- Approved court email domains (CA, TX, NY)
- Sample external meetings
- Test accounts (if in development mode)

### Step 8: Verify Migration

```bash
# Open Prisma Studio to inspect data
npm run db:studio

# Check that tables exist:
# - users (with new fields: user_type, court_rep_id, etc.)
# - external_meetings
# - attendance_records
# - court_cards
# - etc.
```

### Step 9: Test the API

```bash
# Start the server
npm run dev

# Test registration endpoint
curl -X POST http://localhost:5000/api/auth/register/court-rep \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@probation.ca.gov",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "Officer"
  }'

# Should get success response
```

---

## 📊 Schema Changes Summary

### New Tables
- `external_meetings` - Recovery program meetings from APIs
- `meeting_requirements` - Court Rep assigned requirements
- `court_cards` - Legal proof of attendance
- `daily_digest_queue` - Email notification queue
- `approved_court_domains` - Whitelisted court emails
- `audit_logs` - System activity logs
- `system_config` - Configuration storage

### Modified Tables
- `users` - Now has `user_type`, `court_rep_id`, `case_number`, etc.
- `attendance_records` - Enhanced with activity tracking, court card linkage

### Removed Tables (from Phase 1)
- `meetings` - Replaced by `external_meetings`
- `auth_tokens` - Now using JWT tokens

---

## 🔧 Troubleshooting

### Error: "Migration conflicts detected"

```bash
# Reset migrations and start fresh
npx prisma migrate reset
# WARNING: This deletes all data!

# Then run
npx prisma migrate dev --name init_v2
npm run seed
```

### Error: "Prisma Client generation failed"

```bash
# Clear generated files and regenerate
rm -rf node_modules/.prisma
npx prisma generate
```

### Error: "Database connection failed"

Check your `DATABASE_URL` format:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

### Error: "Seed script fails"

```bash
# Check if bcryptjs is installed
npm install bcryptjs

# Run seed with verbose output
npm run seed 2>&1 | tee seed.log
```

---

## 📝 Rollback Plan

If you need to rollback to Phase 1:

### Option 1: Restore from Backup

```bash
# Stop the server
# Restore from backup
psql your_database_name < backup_phase1_YYYYMMDD.sql

# Checkout Phase 1 code
git checkout phase1-branch

# Restart server
npm run dev
```

### Option 2: Keep Both Versions

- Deploy V2.0 to a new database
- Keep Phase 1 running on old database
- Gradually migrate users

---

## ✅ Post-Migration Checklist

- [ ] Database backup created
- [ ] New dependencies installed
- [ ] Environment variables updated
- [ ] Prisma client generated
- [ ] Migrations applied successfully
- [ ] Data migration completed
- [ ] Seed data loaded
- [ ] Test accounts working
- [ ] API endpoints responding
- [ ] Frontend can connect to new API
- [ ] Old Phase 1 system documented/archived

---

## 🆘 Need Help?

**Common Commands:**

```bash
# View database in browser
npm run db:studio

# Check migration status
npx prisma migrate status

# View current schema
npx prisma db pull

# Generate new migration
npx prisma migrate dev --name your_migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (dev only!)
npx prisma migrate reset
```

**Useful SQL Queries:**

```sql
-- Check user types
SELECT user_type, COUNT(*) FROM users GROUP BY user_type;

-- Check court rep linkages
SELECT 
  p.email as participant_email,
  p.case_number,
  cr.email as court_rep_email
FROM users p
LEFT JOIN users cr ON p.court_rep_id = cr.id
WHERE p.user_type = 'PARTICIPANT';

-- Check approved domains
SELECT * FROM approved_court_domains;

-- Check external meetings
SELECT program, COUNT(*) FROM external_meetings GROUP BY program;
```

---

## 📚 Additional Resources

- [Prisma Migration Guide](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate)
- [ProofMeet SYSTEM_REDESIGN.md](../SYSTEM_REDESIGN.md)
- [ProofMeet MIGRATION_PLAN.md](../MIGRATION_PLAN.md)
- [API Documentation](../docs/API_DOCUMENTATION.md)

---

*Last Updated: October 7, 2024*
*Version: 2.0.0*

