# ProofMeet V2.0 Quick Start Guide

**Get up and running in 5 minutes!**

---

## 🚀 Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install all required packages including TypeScript type definitions.

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings (minimum required):
nano .env
```

**Minimum configuration:**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/proofmeet_v2
JWT_SECRET=your-secret-key-change-in-production
BYPASS_EMAIL_VERIFICATION=true  # For development
```

### 3. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Create database schema
npx prisma migrate dev --name init_v2

# Seed initial data (approved domains + test accounts)
npm run seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

### 5. Test Authentication

```bash
# In a new terminal, run the test script
./test-auth-v2.sh
```

Or test manually:

```bash
# Health check
curl http://localhost:5000/health

# Login as test Court Rep
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.officer@probation.ca.gov",
    "password": "Test123!"
  }'
```

---

## 🧪 Test Accounts

Created by the seed script:

**Court Representative:**
- Email: `test.officer@probation.ca.gov`
- Password: `Test123!`

**Participant:**
- Email: `test.participant@example.com`
- Password: `Test123!`

---

## 📊 View Database

```bash
npm run db:studio
```

Opens Prisma Studio at `http://localhost:5555` to view/edit database records.

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run dev:old          # Start Phase 1 server

# Database
npm run db:migrate       # Create new migration
npm run db:generate      # Generate Prisma client
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio

# Migration
npm run migrate:v2       # Interactive migration from Phase 1

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Build
npm run build            # Build for production
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main server file
│   ├── routes/
│   │   ├── auth-v2.ts        # V2 authentication (NEW)
│   │   ├── auth.ts           # V1 authentication (legacy)
│   │   └── ...
│   ├── middleware/
│   │   ├── auth.ts           # JWT auth middleware (NEW)
│   │   └── errorHandler.ts
│   └── utils/
│       └── logger.ts
├── prisma/
│   ├── schema.prisma         # Database schema (V2.0)
│   ├── seed.ts               # Seed script
│   └── migrations/           # Migration history
├── scripts/
│   └── migrate-to-v2.ts      # Phase 1 → V2 migration
└── package.json
```

---

## 🔍 Troubleshooting

### Issue: TypeScript errors in scripts

**Solution:** Run `npm install` to install type definitions.

### Issue: Database connection failed

**Solution:** Check your `DATABASE_URL` in `.env`. Format should be:
```
postgresql://username:password@host:port/database
```

### Issue: Prisma Client not generated

**Solution:**
```bash
npx prisma generate
```

### Issue: Migration conflicts

**Solution:** Reset database (development only!):
```bash
npx prisma migrate reset
npm run seed
```

### Issue: Port 5000 already in use

**Solution:** Change port in `.env`:
```bash
PORT=5001
```

---

## 🎯 Next Steps

Once setup is complete:

1. ✅ Test authentication endpoints
2. ✅ Review API documentation in `/docs/API_DOCUMENTATION.md`
3. ✅ Check database structure in Prisma Studio
4. ⏭️ Start building Court Rep dashboard
5. ⏭️ Start building Participant dashboard

---

## 📚 Additional Resources

- **API Docs**: `../docs/API_DOCUMENTATION.md`
- **Migration Plan**: `../MIGRATION_PLAN.md`
- **System Design**: `../SYSTEM_REDESIGN.md`
- **Environment Setup**: `../ENVIRONMENT_SETUP.md`

---

## 🆘 Need Help?

- Check `DATABASE_MIGRATION_GUIDE.md` for detailed setup
- Review `IMPLEMENTATION_PROGRESS.md` for current status
- Run `./test-auth-v2.sh` to verify system health

---

**Last Updated**: October 7, 2024  
**Version**: 2.0.0

