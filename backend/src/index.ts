import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

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

// Rate limiting - more lenient for development/testing
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '500'), // Increased from 100 to 500
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Disable automatic header validation to prevent ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
  validate: false,
  
  // Provide a custom key generator that safely handles proxy scenarios
  keyGenerator: (req) => {
    try {
      // Try to get the real IP from various headers (Railway, Heroku, Cloudflare, etc.)
      const forwardedFor = req.headers['x-forwarded-for'];
      const realIp = req.headers['x-real-ip'];
      const cfConnectingIp = req.headers['cf-connecting-ip'];
      
      // Use the first IP from x-forwarded-for if available
      if (forwardedFor) {
        const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
        const firstIp = ips.split(',')[0].trim();
        if (firstIp) return firstIp;
      }
      
      // Fallback to other headers
      if (cfConnectingIp) return cfConnectingIp as string;
      if (realIp) return realIp as string;
      
      // Fallback to express IP detection
      if (req.ip) return req.ip;
      if (req.socket.remoteAddress) return req.socket.remoteAddress;
      
      // Final fallback
      return 'unknown';
    } catch (error) {
      // If anything goes wrong, return a safe default
      return 'unknown';
    }
  },
});

// Apply rate limiter to all routes except health check
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  return limiter(req, res, next);
});

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

  // Health check endpoint with database test
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$connect();
      const userCount = await prisma.user.count();
      
      res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '2.0.5',
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

// API routes
app.use('/api/v2/auth', authV2Routes);
app.use('/api/v2/court-rep', courtRepRoutes);
app.use('/api/v2/participant', participantRoutes);
app.use('/api/v2/admin', adminRoutes);
app.use('/api/v2/webhooks', zoomWebhookRoutes);
app.use('/api/v2/verify', verificationRoutes); // Public verification - no auth required

// Default routes (no version prefix)
app.use('/api/auth', authV2Routes);
app.use('/api/court-rep', courtRepRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', zoomWebhookRoutes);
app.use('/api/verify', verificationRoutes); // Public verification - no auth required

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
  logger.info(`Environment: ${process.env['NODE_ENV']}`);
});

export default app;
