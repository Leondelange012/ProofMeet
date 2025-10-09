# Setup Instructions - IMPORTANT!

## 🚨 Before Running the Server

The TypeScript errors you see in `court-rep.ts` and `participant.ts` are **expected** until you complete these setup steps:

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

This installs all required packages including `@types/node`.

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

**This is CRITICAL!** This regenerates the Prisma Client with the new V2.0 schema. Without this:
- TypeScript will see the old Phase 1 schema
- You'll get 50+ type errors in court-rep.ts
- The code won't compile

### Step 3: Run Migrations
```bash
npx prisma migrate dev --name init_v2
```

Creates the database schema.

### Step 4: Seed Database
```bash
npm run seed
```

Adds test data and approved court domains.

### Step 5: Start Server
```bash
npm run dev
```

---

## 🔧 Quick Setup (All-in-One)

```bash
cd backend
npm install && npx prisma generate && npx prisma migrate dev --name init_v2 && npm run seed && npm run dev
```

---

## ✅ Verification

After setup, all TypeScript errors should disappear. You should see:

```bash
# Check for errors
npx tsc --noEmit

# Should return with no errors
```

---

## 🐛 If You Still See Errors

### Error: "Cannot find module '@prisma/client'"
**Solution:** Run `npm install`

### Error: "Property 'attendanceRecord' does not exist"
**Solution:** Run `npx prisma generate`

### Error: "Cannot find module 'readline'"
**Solution:** Run `npm install` (installs @types/node)

### Error: Database connection failed
**Solution:** Check your DATABASE_URL in `.env`

---

## 📝 Why This Happens

1. **Prisma Client is generated code** - It doesn't exist until you run `npx prisma generate`
2. **TypeScript needs type definitions** - Installed via `npm install`
3. **Schema changes require regeneration** - Old client has old types

---

## 🎯 After Setup

Once setup is complete, you can:
- ✅ Run the server: `npm run dev`
- ✅ Test auth: `./test-auth-v2.sh`
- ✅ View database: `npm run db:studio`
- ✅ No TypeScript errors!

---

*Last Updated: October 7, 2024*

