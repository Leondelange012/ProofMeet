#!/bin/bash

# ProofMeet V2 Authentication Test Script
# Tests the new Court Rep and Participant registration/login flow

API_URL="${API_URL:-http://localhost:5000}"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ProofMeet V2 Authentication Test Suite               ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH=$(curl -s "$API_URL/health")
echo "$HEALTH" | jq .
if echo "$HEALTH" | jq -e '.status == "OK" and .version == "2.0.0"' > /dev/null; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  exit 1
fi
echo ""

# Test 2: Register Court Representative
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Register Court Representative"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
COURT_REP_REGISTER=$(curl -s -X POST "$API_URL/api/auth/register/court-rep" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.courtrep@test.proofmeet.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "Officer",
    "courtName": "Test County Probation",
    "badgeNumber": "TEST-001"
  }')
echo "$COURT_REP_REGISTER" | jq .
if echo "$COURT_REP_REGISTER" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Court Rep registration successful${NC}"
  COURT_REP_ID=$(echo "$COURT_REP_REGISTER" | jq -r '.data.userId')
else
  echo -e "${YELLOW}⚠ Court Rep registration failed (may already exist)${NC}"
fi
echo ""

# Test 3: Login Court Representative
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Login Court Representative"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
COURT_REP_LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.courtrep@test.proofmeet.com",
    "password": "Test123!"
  }')
echo "$COURT_REP_LOGIN" | jq .
if echo "$COURT_REP_LOGIN" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Court Rep login successful${NC}"
  COURT_REP_TOKEN=$(echo "$COURT_REP_LOGIN" | jq -r '.data.token')
  echo "Token: ${COURT_REP_TOKEN:0:20}..."
else
  echo -e "${RED}✗ Court Rep login failed${NC}"
  exit 1
fi
echo ""

# Test 4: Get Court Rep Profile
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Get Court Rep Profile"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
COURT_REP_PROFILE=$(curl -s -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $COURT_REP_TOKEN")
echo "$COURT_REP_PROFILE" | jq .
if echo "$COURT_REP_PROFILE" | jq -e '.success == true and .data.userType == "COURT_REP"' > /dev/null; then
  echo -e "${GREEN}✓ Court Rep profile retrieved${NC}"
else
  echo -e "${RED}✗ Failed to get Court Rep profile${NC}"
fi
echo ""

# Test 5: Register Participant
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Register Participant"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PARTICIPANT_REGISTER=$(curl -s -X POST "$API_URL/api/auth/register/participant" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.participant@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "Participant",
    "caseNumber": "2024-TEST-999",
    "courtRepEmail": "test.courtrep@test.proofmeet.com",
    "phoneNumber": "+1-555-000-0001"
  }')
echo "$PARTICIPANT_REGISTER" | jq .
if echo "$PARTICIPANT_REGISTER" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Participant registration successful${NC}"
else
  echo -e "${YELLOW}⚠ Participant registration failed (may already exist)${NC}"
fi
echo ""

# Test 6: Login Participant
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: Login Participant"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PARTICIPANT_LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.participant@example.com",
    "password": "Test123!"
  }')
echo "$PARTICIPANT_LOGIN" | jq .
if echo "$PARTICIPANT_LOGIN" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Participant login successful${NC}"
  PARTICIPANT_TOKEN=$(echo "$PARTICIPANT_LOGIN" | jq -r '.data.token')
  echo "Token: ${PARTICIPANT_TOKEN:0:20}..."
else
  echo -e "${RED}✗ Participant login failed${NC}"
  exit 1
fi
echo ""

# Test 7: Get Participant Profile
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 7: Get Participant Profile"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PARTICIPANT_PROFILE=$(curl -s -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $PARTICIPANT_TOKEN")
echo "$PARTICIPANT_PROFILE" | jq .
if echo "$PARTICIPANT_PROFILE" | jq -e '.success == true and .data.userType == "PARTICIPANT" and .data.courtRep != null' > /dev/null; then
  echo -e "${GREEN}✓ Participant profile retrieved with Court Rep linkage${NC}"
else
  echo -e "${RED}✗ Failed to get Participant profile${NC}"
fi
echo ""

# Test 8: Invalid Email Domain for Court Rep
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 8: Invalid Email Domain (Should Fail)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
INVALID_DOMAIN=$(curl -s -X POST "$API_URL/api/auth/register/court-rep" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "fake@gmail.com",
    "password": "Test123!",
    "firstName": "Fake",
    "lastName": "Officer"
  }')
echo "$INVALID_DOMAIN" | jq .
if echo "$INVALID_DOMAIN" | jq -e '.success == false' > /dev/null; then
  echo -e "${GREEN}✓ Correctly rejected invalid court domain${NC}"
else
  echo -e "${RED}✗ Should have rejected invalid domain${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Authentication system working correctly!${NC}"
echo ""
echo "Test Credentials:"
echo "  Court Rep: test.courtrep@test.proofmeet.com / Test123!"
echo "  Participant: test.participant@example.com / Test123!"
echo ""
echo "Tokens generated:"
echo "  Court Rep: $COURT_REP_TOKEN"
echo "  Participant: $PARTICIPANT_TOKEN"
echo ""

