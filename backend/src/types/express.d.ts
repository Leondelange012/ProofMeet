import { UserType } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      userType: UserType;
      firstName: string;
      lastName: string;
      courtRepId?: string | null;
      courtName?: string | null;
      badgeNumber?: string | null;
      caseNumber?: string | null;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};

