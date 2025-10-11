import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { logger } from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        userType: 'COURT_REP' | 'PARTICIPANT';
        firstName: string;
        lastName: string;
      };
    }
  }
}

/**
 * Verify JWT token and attach user to request
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
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

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        userType: true,
        firstName: true,
        lastName: true,
        courtRepId: true,
        courtName: true,
        badgeNumber: true,
        caseNumber: true,
        isActive: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive',
      });
    }

    // Attach user to request with proper typing
    req.user = user as any;
    
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }

    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Require Court Representative role
 */
export function requireCourtRep(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (req.user.userType !== 'COURT_REP') {
    return res.status(403).json({
      success: false,
      error: 'Court Representative access required',
    });
  }

  next();
}

/**
 * Require Participant role
 */
export function requireParticipant(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (req.user.userType !== 'PARTICIPANT') {
    return res.status(403).json({
      success: false,
      error: 'Participant access required',
    });
  }

  next();
}

/**
 * Optional authentication (doesn't fail if no token)
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev-secret-change-in-production'
    ) as { userId: string; userType: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        userType: true,
        firstName: true,
        lastName: true,
        courtRepId: true,
        courtName: true,
        badgeNumber: true,
        caseNumber: true,
        isActive: true,
        isEmailVerified: true,
      },
    });

    if (user && user.isActive) {
      req.user = user as any;
    }

    next();
  } catch (error) {
    // Token invalid, continue without user
    next();
  }
}

