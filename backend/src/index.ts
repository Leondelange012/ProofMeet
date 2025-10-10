import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

// V2 Routes (Court Compliance System)
import { authV2Routes } from './routes/auth-v2';
import { courtRepRoutes } from './routes/court-rep';
import { participantRoutes } from './routes/participant';
import { adminRoutes } from './routes/admin';

// V1 Routes (Phase 1 - for backward compatibility during migration)
import { authRoutes } from './routes/auth';
import { meetingRoutes } from './routes/meetings';
import { attendanceRoutes } from './routes/attendance';
import { complianceRoutes } from './routes/compliance';
import { qrRoutes } from './routes/qr';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma
export const prisma = new PrismaClient();

logger.info('ProofMeet Version 2.0 - Court Compliance System');
logger.info('===============================================');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      version: '2.0.1', // Updated to force redeploy
      system: 'Court Compliance'
    });
  });

// API routes - Version 2.0 (Primary)
app.use('/api/v2/auth', authV2Routes);
app.use('/api/v2/court-rep', courtRepRoutes);
app.use('/api/v2/participant', participantRoutes);
app.use('/api/v2/admin', adminRoutes);
app.use('/api/auth', authV2Routes); // Default to V2
app.use('/api/court-rep', courtRepRoutes); // Default to V2
app.use('/api/participant', participantRoutes); // Default to V2
app.use('/api/admin', adminRoutes); // Default to V2

// API routes - Version 1.0 (Backward compatibility)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/qr', qrRoutes);

// Phase 1 routes (still accessible during migration)
app.use('/api/meetings', meetingRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/qr', qrRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
