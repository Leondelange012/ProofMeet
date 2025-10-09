#!/bin/bash

# ProofMeet V2.0 - Automated Setup Script
# This script sets up the backend environment from scratch

set -e  # Exit on error

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ProofMeet V2.0 - Backend Setup                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install Dependencies
echo -e "${BLUE}Step 1/5: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Generate Prisma Client
echo -e "${BLUE}Step 2/5: Generating Prisma Client (V2.0 schema)...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma Client generated${NC}"
echo ""

# Step 3: Check for .env file
if [ ! -f .env ]; then
  echo -e "${YELLOW}Warning: No .env file found${NC}"
  echo "Creating .env from example..."
  
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ .env created from example${NC}"
    echo -e "${YELLOW}⚠  Please edit .env with your DATABASE_URL${NC}"
  else
    echo -e "${YELLOW}⚠  No .env.example found. Please create .env manually${NC}"
  fi
  echo ""
fi

# Step 4: Run Migrations
echo -e "${BLUE}Step 3/5: Running database migrations...${NC}"
echo "This will create the V2.0 schema in your database"
npx prisma migrate dev --name init_v2
echo -e "${GREEN}✓ Database migrations complete${NC}"
echo ""

# Step 5: Seed Database
echo -e "${BLUE}Step 4/5: Seeding database with test data...${NC}"
npm run seed
echo -e "${GREEN}✓ Database seeded${NC}"
echo ""

# Step 6: Verify Setup
echo -e "${BLUE}Step 5/5: Verifying setup...${NC}"
npx tsc --noEmit 2>&1 | grep -q "error" && echo -e "${YELLOW}⚠  TypeScript errors detected (this may be expected)${NC}" || echo -e "${GREEN}✓ No TypeScript errors${NC}"
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════╗"
echo "║  Setup Complete!                                       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Test Accounts Created:"
echo "  Court Rep:"
echo "    Email: test.officer@probation.ca.gov"
echo "    Password: Test123!"
echo ""
echo "  Participant:"
echo "    Email: test.participant@example.com"
echo "    Password: Test123!"
echo ""
echo "Next Steps:"
echo "  1. Start server:  npm run dev"
echo "  2. Test auth:     ./test-auth-v2.sh"
echo "  3. View database: npm run db:studio"
echo ""
echo "API will be available at: http://localhost:5000"
echo ""

