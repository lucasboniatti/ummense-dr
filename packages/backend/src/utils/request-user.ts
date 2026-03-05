import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from './errors';

export function getAuthenticatedUserId(req: AuthRequest): string {
  const user = req.user;
  const userId = user?.id ?? user?.sub ?? user?.user_id ?? user?.uid;

  if (userId === undefined || userId === null || String(userId).trim() === '') {
    throw new AppError('Unauthorized', 401);
  }

  return String(userId);
}
