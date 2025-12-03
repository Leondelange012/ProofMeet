import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { websocketService } from './services/websocketService';
import { startMeetingFinalizationScheduler } from './services/meetingFinalizationService';

// Routes
import { authV2Routes } from './routes/auth-v2';
import { courtRepRoutes } from './routes/court-rep';
import { participantRoutes } from './routes/participant';
import { adminRoutes } from './routes/admin';
import { zoomWebhookRoutes } from './routes/zoom-webhooks';
import { verificationRoutes } from './routes/verification';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 5000;

// Initialize Prisma
export const prisma = new PrismaClient();

logger.info('ProofMeet - Court Compliance System');
logger.info('====================================');

// Trust proxy - required for Railway, Heroku, etc.
// This allows express-rate-limit to correctly identify client IPs behind proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration - allow all origins for now
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting - strict for auth endpoints only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Lenient rate limiter for authenticated API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Very high limit - 5000 requests per 15 minutes
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  skip: (req) => {
    // Skip rate limiting for authenticated users (they have a valid JWT)
    const authHeader = req.headers.authorization;
    return !!authHeader && authHeader.startsWith('Bearer ');
  },
});

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint with database test (no rate limiting)
app.get('/health', async (_req, res) => {
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      version: '2.0.6',
      system: 'Court Compliance',
      database: 'Connected',
      userCount
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      database: 'Disconnected'
    });
  }
});

// API routes with appropriate rate limiting
// Auth routes - strict rate limiting (20 attempts per 15 min)
app.use('/api/v2/auth', authLimiter, authV2Routes);
app.use('/api/auth', authLimiter, authV2Routes);

// Authenticated routes - lenient rate limiting (skipped for JWT users)
app.use('/api/v2/court-rep', apiLimiter, courtRepRoutes);
app.use('/api/v2/participant', apiLimiter, participantRoutes);
app.use('/api/v2/admin', apiLimiter, adminRoutes);
app.use('/api/v2/webhooks', zoomWebhookRoutes); // No rate limit for webhooks
app.use('/api/v2/verify', apiLimiter, verificationRoutes); // Public verification

// Default routes (no version prefix)
app.use('/api/court-rep', apiLimiter, courtRepRoutes);
app.use('/api/participant', apiLimiter, participantRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/webhooks', zoomWebhookRoutes); // No rate limit for webhooks
app.use('/api/verify', apiLimiter, verificationRoutes); // Public verification

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Create HTTP server (needed for WebSocket)
const httpServer = createServer(app);

// Initialize WebSocket service
websocketService.initialize(httpServer);

// Start meeting finalization scheduler (checks every 5 minutes)
startMeetingFinalizationScheduler();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  websocketService.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down server...');
  websocketService.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
  logger.info(`Environment: ${process.env['NODE_ENV']}`);
});

export default app;
