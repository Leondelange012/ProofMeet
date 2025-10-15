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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 5000;

// Initialize Prisma
export const prisma = new PrismaClient();

logger.info('ProofMeet - Court Compliance System');
logger.info('====================================');

// Security middleware
app.use(helmet());

// CORS configuration - allow all origins for now
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

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

// Default routes (no version prefix)
app.use('/api/auth', authV2Routes);
app.use('/api/court-rep', courtRepRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api/admin', adminRoutes);

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
