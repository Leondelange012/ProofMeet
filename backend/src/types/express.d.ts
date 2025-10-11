// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

