/// <reference path="../types/express.d.ts" />

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { sendVerificationEmail } from '../services/emailService';

const router = Router();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate JWT token
 */
function generateToken(userId: string, userType: string): string {
  const secret: string = process.env['JWT_SECRET'] || 'dev-secret-change-in-production';
  return jwt.sign(
    { userId, userType },
    secret,
    { expiresIn: '7d' }
  );
}

/**
 * Generate email verification token
 */
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if email domain is approved for Court Reps
 */
async function isApprovedCourtDomain(email: string): Promise<boolean> {
  // Temporarily bypass domain check for testing
  // TODO: Re-enable domain verification in production
  return true;
  
  /*
  const domain = email.split('@')[1];
  
  const approvedDomain = await prisma.approvedCourtDomain.findFirst({
    where: {
      domain,
      isActive: true,
    },
  });
  
  return !!approvedDomain;
  */
}

// Email service imported from services/emailService.ts

// ============================================
// COURT REPRESENTATIVE REGISTRATION
// ============================================

router.post(
  '/register/court-rep',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('courtName').optional().trim(),
    body('badgeNumber').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password, firstName, lastName, courtName, badgeNumber } = req.body;

      // Check if email domain is approved
      const isApproved = await isApprovedCourtDomain(email);
      if (!isApproved) {
        const domain = email.split('@')[1];
        return res.status(400).json({
          success: false,
          error: 'Email domain not approved for Court Representatives',
          details: {
            domain,
            message: 'Please use your official court or probation email address',
          },
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email already registered',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

      // Generate verification token
      const verificationToken = generateVerificationToken();
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          userType: 'COURT_REP',
          firstName,
          lastName,
          courtDomain: email.split('@')[1],
          courtName,
          badgeNumber,
          verificationToken,
          verificationTokenExpiry,
          isEmailVerified: process.env.BYPASS_EMAIL_VERIFICATION === 'true',
          isActive: true,
        },
      });

      // Send verification email
      if (process.env.BYPASS_EMAIL_VERIFICATION !== 'true') {
        await sendVerificationEmail(email, verificationToken);
      }

      logger.info(`Court Rep registered: ${email}`);

      res.status(201).json({
        success: true,
        message: process.env.BYPASS_EMAIL_VERIFICATION === 'true'
          ? 'Court Representative registered successfully'
          : 'Court Representative registered successfully. Please verify your email.',
        data: {
          userId: user.id,
          email: user.email,
          userType: user.userType,
          verificationEmailSent: process.env.BYPASS_EMAIL_VERIFICATION !== 'true',
        },
      });
    } catch (error: any) {
      logger.error('Court Rep registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// ============================================
// PARTICIPANT REGISTRATION
// ============================================

router.post(
  '/register/participant',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('caseNumber').trim().notEmpty(),
    body('courtRepEmail').isEmail().normalizeEmail(),
    body('phoneNumber').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password, firstName, lastName, caseNumber, courtRepEmail, phoneNumber } = req.body;

      // Check if participant email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email already registered',
        });
      }

      // Find Court Representative by email
      const courtRep = await prisma.user.findFirst({
        where: {
          email: courtRepEmail,
          userType: 'COURT_REP',
        },
      });

      if (!courtRep) {
        return res.status(404).json({
          success: false,
          error: 'Court Representative not found',
          details: {
            courtRepEmail,
            message: 'Please verify the Court Representative email address',
          },
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

      // Generate verification token
      const verificationToken = generateVerificationToken();
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create participant
      const participant = await prisma.user.create({
        data: {
          email,
          passwordHash,
          userType: 'PARTICIPANT',
          firstName,
          lastName,
          caseNumber,
          courtRepId: courtRep.id,
          phoneNumber,
          verificationToken,
          verificationTokenExpiry,
          isEmailVerified: process.env.BYPASS_EMAIL_VERIFICATION === 'true',
          isActive: true,
        },
      });

      // Send verification email
      if (process.env.BYPASS_EMAIL_VERIFICATION !== 'true') {
        await sendVerificationEmail(email, verificationToken);
      }

      logger.info(`Participant registered: ${email}, Court Rep: ${courtRepEmail}`);

      res.status(201).json({
        success: true,
        message: process.env.BYPASS_EMAIL_VERIFICATION === 'true'
          ? 'Participant registered successfully'
          : 'Participant registered successfully. Please verify your email.',
        data: {
          userId: participant.id,
          email: participant.email,
          userType: participant.userType,
          caseNumber: participant.caseNumber,
          courtRepId: courtRep.id,
          courtRepName: `${courtRep.firstName} ${courtRep.lastName}`,
          verificationEmailSent: process.env.BYPASS_EMAIL_VERIFICATION !== 'true',
        },
      });
    } catch (error: any) {
      logger.error('Participant registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// ============================================
// EMAIL VERIFICATION
// ============================================

router.get('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
      });
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    logger.info(`Email verified: ${user.email}`);

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      data: {
        email: user.email,
        isEmailVerified: true,
      },
    });
  } catch (error: any) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================
// LOGIN
// ============================================

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          courtRep: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Check if email is verified
      if (!user.isEmailVerified && process.env.BYPASS_EMAIL_VERIFICATION !== 'true') {
        return res.status(403).json({
          success: false,
          error: 'Please verify your email before logging in',
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is inactive. Please contact support.',
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Generate token
      const token = generateToken(user.id, user.userType);

      logger.info(`User logged in: ${email} (${user.userType})`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            userType: user.userType,
            ...(user.userType === 'PARTICIPANT' && {
              caseNumber: user.caseNumber,
              courtRepId: user.courtRepId,
              courtRep: user.courtRep,
            }),
            ...(user.userType === 'COURT_REP' && {
              courtName: user.courtName,
              badgeNumber: user.badgeNumber,
            }),
          },
        },
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// ============================================
// GET CURRENT USER
// ============================================

router.get('/me', async (req: Request, res: Response) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev-secret-change-in-production'
    ) as { userId: string; userType: string };

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        courtRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        ...(user.userType === 'PARTICIPANT' && {
          caseNumber: user.caseNumber,
          courtRepId: user.courtRepId,
          courtRep: user.courtRep,
        }),
        ...(user.userType === 'COURT_REP' && {
          courtName: user.courtName,
          badgeNumber: user.badgeNumber,
        }),
      },
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    logger.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as authV2Routes };

