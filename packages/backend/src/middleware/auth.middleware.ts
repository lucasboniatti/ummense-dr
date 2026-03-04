import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getRequiredEnvVar } from '../config/env';

export interface AuthRequest extends Request {
  user?: { id: number; email: string };
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

    const decoded = jwt.verify(token, getRequiredEnvVar('JWT_SECRET')) as {
      id: number;
      email: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
