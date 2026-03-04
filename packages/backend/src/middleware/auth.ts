import { NextFunction, Request, Response } from 'express';
import { authMiddleware } from './auth.middleware';

export const authenticate = authMiddleware;

export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  authMiddleware(req as any, res, next);
}
