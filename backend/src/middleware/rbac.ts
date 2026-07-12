import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Unauthorized: user not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Forbidden: insufficient permissions'));
    }
    next();
  };
}
