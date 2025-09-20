import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { AuthToken, LoginRequest, RegisterRequest } from '@/types';

const router = Router();

// Register new user (court-verified email)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('courtId').isLength({ min: 3 }).trim(),
  body('state').isIn(['CA', 'TX', 'NY']),
  body('courtCaseNumber').isLength({ min: 1 }).trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, courtId, state, courtCaseNumber }: RegisterRequest = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Check if court ID already exists
    const existingCourtId = await prisma.user.findUnique({
      where: { courtId }
    });

    if (existingCourtId) {
      return res.status(400).json({
        success: false,
        error: 'User with this court ID already exists'
      });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        email,
        courtId,
        state,
        isVerified: false, // Will be verified by court system
      }
    });

    logger.info(`New user registered: ${email} (${courtId})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Awaiting court verification.',
      data: {
        userId: user.id,
        email: user.email,
        courtId: user.courtId,
        state: user.state
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email }: LoginRequest = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        error: 'Account not verified by court system'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.isHost ? 'host' : 'user',
        courtId: user.courtId
      } as AuthToken,
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          courtId: user.courtId,
          state: user.state,
          isHost: user.isHost,
          isVerified: user.isVerified
        }
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Verify user (court system endpoint)
router.post('/verify', [
  body('email').isEmail().normalizeEmail(),
  body('verified').isBoolean(),
], async (req, res) => {
  try {
    const { email, verified } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: verified }
    });

    logger.info(`User verification updated: ${email} - ${verified}`);

    res.json({
      success: true,
      message: `User ${verified ? 'verified' : 'unverified'} successfully`
    });

  } catch (error) {
    logger.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as authRoutes };
