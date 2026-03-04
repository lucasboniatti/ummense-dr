/**
 * Authentication Service
 * Validates JWT tokens and extracts user information from WebSocket requests
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import { getRequiredEnvVar } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Authenticate user from WebSocket request headers
 * Extracts user ID from JWT token in Authorization header
 *
 * @param req HTTP request object with headers
 * @returns User ID if valid, null otherwise
 */
export async function authenticateUser(req: any): Promise<string | null> {
  try {
    const authHeader = req.headers?.authorization;

    if (!authHeader) {
      logger.warn('[Auth] Missing authorization header');
      return null;
    }

    const token = extractBearerToken(authHeader);

    if (!token) {
      logger.warn('[Auth] Invalid authorization header format');
      return null;
    }

    const payload = jwt.verify(token, getRequiredEnvVar('JWT_SECRET')) as JwtPayload & {
      id?: string | number;
      user_id?: string;
      uid?: string;
    };

    const userId = payload.id || payload.sub || payload.user_id || payload.uid;

    if (!userId) {
      logger.warn('[Auth] Invalid token: no user ID found');
      return null;
    }

    logger.debug(`[Auth] Authenticated user: ${String(userId)}`);
    return String(userId);
  } catch (error) {
    logger.error('[Auth] Authentication error:', error);
    return null;
  }
}

/**
 * Extract token from standard Authorization header
 *
 * @param authHeader Authorization header value
 * @returns Bearer token or null
 */
function extractBearerToken(authHeader: string): string | null {
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
}

/**
 * Validate JWT token signature and expiration
 * TODO: Implement proper JWT validation with secret key
 *
 * @param token JWT token
 * @returns true if valid
 */
export function validateToken(token: string): boolean {
  try {
    jwt.verify(token, getRequiredEnvVar('JWT_SECRET'));
    return true;
  } catch (error) {
    logger.debug('[Auth] Token validation failed:', error);
    return false;
  }
}
