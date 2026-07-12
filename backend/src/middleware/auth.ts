import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { AppError } from '../lib/errors';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError(401, 'Unauthorized: missing or invalid authorization header'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(new AppError(401, 'Unauthorized: missing token'));
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return next(new AppError(401, 'Unauthorized: invalid or expired token'));
    }

    req.user = {
      id: user.id,
      role: (user.app_metadata?.role as string) || 'employee',
    };

    next();
  } catch (err) {
    next(err);
  }
}
