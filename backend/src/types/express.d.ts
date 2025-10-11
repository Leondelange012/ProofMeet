// Custom user type for our application
export interface AuthUser {
  id: string;
  email: string;
  userType: 'COURT_REP' | 'PARTICIPANT';
  firstName: string;
  lastName: string;
  courtRepId?: string | null;
  courtName?: string | null;
  badgeNumber?: string | null;
  caseNumber?: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
}

// Extend Express Request to include our user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

