# ProofMeet Testing Guide

## 🚀 Quick Testing Options

Since we encountered some Docker build issues, here are multiple ways to test the ProofMeet system:

## Option 1: Manual Browser Testing (Recommended for Quick Start)

### Step 1: Start Just the Database
```bash
# Start only PostgreSQL
docker-compose up postgres -d

# Check if it's running
docker-compose ps
```

### Step 2: Install Node.js (if not installed)
1. Download Node.js from https://nodejs.org/
2. Install version 18 or higher
3. Restart your terminal

### Step 3: Start Backend Manually
```bash
cd backend

# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Start the server
npm run dev
```

### Step 4: Start Frontend Manually
```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Step 5: Test in Browser
1. Open http://localhost:3000 in your browser
2. You should see the ProofMeet login page

## Option 2: Simplified Docker Testing

### Fix Docker Issues First
```bash
# Clean up
docker-compose down -v
docker system prune -f

# Remove problematic build steps temporarily
# Edit backend/Dockerfile and comment out the build step
```

### Start Services One by One
```bash
# Start database first
docker-compose up postgres -d

# Wait for database to be ready
timeout /t 10

# Start backend (if Docker build works)
docker-compose up backend -d

# Start frontend
docker-compose up frontend -d
```

## Option 3: API Testing with cURL (No Node.js Required)

### Test Backend Health
```bash
curl http://localhost:5000/health
```

### Test User Registration
```bash
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"courtId\":\"CA-12345\",\"state\":\"CA\",\"courtCaseNumber\":\"CASE-001\"}"
```

### Test User Verification
```bash
curl -X POST http://localhost:5000/api/auth/verify ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"verified\":true}"
```

### Test User Login
```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\"}"
```

## Testing Checklist

### ✅ Basic Functionality Tests

#### Database Connection
- [ ] PostgreSQL starts successfully
- [ ] Database migrations run without errors
- [ ] Prisma client generates successfully

#### Backend API Tests
- [ ] Health check endpoint responds
- [ ] User registration works
- [ ] User verification works
- [ ] User login returns JWT token
- [ ] Protected endpoints require authentication

#### Frontend Tests
- [ ] Login page loads
- [ ] Dashboard loads after login
- [ ] Navigation works
- [ ] Responsive design works on mobile

#### Integration Tests
- [ ] Frontend can communicate with backend
- [ ] Authentication flow works end-to-end
- [ ] Meeting creation works
- [ ] Attendance tracking works

### 🔍 Detailed Testing Scenarios

#### Scenario 1: Participant Journey
1. Register as a participant
2. Get verified by court
3. Log in to the system
4. View dashboard
5. Join a meeting
6. Check attendance records

#### Scenario 2: Host Journey
1. Register as a host
2. Get verified by court
3. Log in to the system
4. Create a meeting
5. Generate QR code (for in-person)
6. Approve participant attendance

#### Scenario 3: Court Official Journey
1. Access court dashboard
2. View compliance reports
3. Generate reports
4. Monitor user compliance

## Troubleshooting

### Common Issues

#### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

#### "npm not found"
1. Install Node.js from nodejs.org
2. Restart your terminal
3. Run `node --version` to verify

#### "Port already in use"
```bash
# Kill processes on ports
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :5432

# Kill specific process (replace PID)
taskkill /PID <PID> /F
```

#### "Prisma client not generated"
```bash
cd backend
npx prisma generate
```

#### Frontend won't start
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

## Manual Testing Scripts

### PowerShell Testing Script
```powershell
# test-api.ps1
$baseUrl = "http://localhost:5000/api"

# Test health check
Write-Host "Testing health check..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get
    Write-Host "✅ Health check passed: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test user registration
Write-Host "Testing user registration..."
$userData = @{
    email = "test@example.com"
    courtId = "CA-12345"
    state = "CA"
    courtCaseNumber = "CASE-001"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $userData -ContentType "application/json"
    Write-Host "✅ User registration successful" -ForegroundColor Green
} catch {
    Write-Host "❌ User registration failed: $($_.Exception.Message)" -ForegroundColor Red
}
```

### Batch Testing Script
```batch
@echo off
echo Testing ProofMeet API...

echo Testing health check...
curl -s http://localhost:5000/health

echo Testing user registration...
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"courtId\":\"CA-12345\",\"state\":\"CA\",\"courtCaseNumber\":\"CASE-001\"}"

echo Testing complete.
pause
```

## Next Steps After Testing

1. **If tests pass**: Continue with feature development
2. **If tests fail**: Check the troubleshooting section
3. **For production**: Set up proper environment variables and security
4. **For deployment**: Configure production Docker images

## Getting Help

- Check the logs: `docker-compose logs [service-name]`
- Review the MEMORY_BANK.md for development decisions
- Check the API documentation in docs/DEVELOPER_GUIDE.md
- Create issues in the repository for bugs found during testing

---

*Last Updated: September 2024*
*Version: 1.0.0*
