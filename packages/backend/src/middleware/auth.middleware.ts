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
    const cookieToken = extractCookieToken(req.headers.cookie);
    const bearerToken = req.headers.authorization?.replace('Bearer ', '');
    const token = cookieToken || bearerToken;

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

function extractCookieToken(cookieHeader?: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(';');
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part.startsWith('token=')) {
      continue;
    }

    const value = part.slice('token='.length).trim();
    if (!value) {
      return null;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}
