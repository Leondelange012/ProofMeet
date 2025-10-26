# ProofMeet Installation Guide

## Quick Start

### Option 1: Docker (Recommended)
```bash
# Clone the repository
git clone https://github.com/your-org/proofmeet.git
cd proofmeet

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: localhost:5432

### Option 2: Manual Installation

#### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git

#### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Set up database
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Configuration

### Environment Variables

#### Backend (.env)
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/proofmeet"

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="24h"

# Zoom Integration
ZOOM_API_KEY="your-zoom-api-key"
ZOOM_API_SECRET="your-zoom-api-secret"

# Court System Integration
COURT_API_ENDPOINT="https://court-api.example.com"
COURT_API_KEY="your-court-api-key"
```

#### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

### Database Setup

#### Using Docker
```bash
# Start PostgreSQL
docker-compose up postgres

# Run migrations
docker-compose exec backend npx prisma migrate dev
```

#### Using Local PostgreSQL
```bash
# Create database
createdb proofmeet

# Run migrations
cd backend
npx prisma migrate dev
```

## Production Deployment

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Production
```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd ../backend
npm run build

# Start production server
npm start
```

## Verification

### Health Checks
```bash
# Backend health
curl http://localhost:5000/health

# Frontend
curl http://localhost:3000
```

### Database Connection
```bash
# Test database connection
docker-compose exec backend npx prisma db pull
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
lsof -ti:5432 | xargs kill -9
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up postgres
```

#### Frontend Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run build
```

#### Backend API Issues
```bash
# Check API logs
docker-compose logs backend

# Test API endpoints
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","courtId":"CA-12345","state":"CA","courtCaseNumber":"CASE-001"}'
```

### Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs postgres
```

## Next Steps

1. **Configure Court Integration**: Set up court system API endpoints
2. **Set up Zoom Integration**: Configure Zoom API credentials
3. **Configure Email**: Set up email service for notifications
4. **Set up Monitoring**: Configure logging and monitoring
5. **Security Review**: Conduct security audit
6. **User Training**: Train court staff and meeting hosts

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/proofmeet/issues)
- **Email**: support@proofmeet.com

---

*Last Updated: January 2024*
*Version: 1.0.0*
