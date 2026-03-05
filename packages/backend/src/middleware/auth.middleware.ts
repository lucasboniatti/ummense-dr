import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { getRequiredEnvVar } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: string | number;
    email?: string;
    [key: string]: unknown;
  };
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Try to get token from cookie first, then from Authorization header
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const decoded = jwt.verify(token, getRequiredEnvVar('JWT_SECRET')) as JwtPayload & {
      id?: string | number;
      email?: string;
      user_id?: string;
      uid?: string;
    };

    const userId = decoded.id ?? decoded.sub ?? decoded.user_id ?? decoded.uid;

    if (!userId) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = {
      id: userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
