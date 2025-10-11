declare global {
  namespace Express {
    interface User {
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

    interface Request {
      user?: User;
    }
  }
}

export {};

