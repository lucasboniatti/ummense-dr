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
    const token = extractTokenFromRequest(req);

    if (!token) {
      logger.warn('[Auth] Missing or invalid authentication token');
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

function extractTokenFromRequest(req: any): string | null {
  const authHeader = req.headers?.authorization;
  const bearerToken = typeof authHeader === 'string' ? extractBearerToken(authHeader) : null;

  if (bearerToken) {
    return bearerToken;
  }

  const requestUrl = typeof req.url === 'string' ? req.url : '';

  if (!requestUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(requestUrl, 'http://localhost');
    const queryToken = parsedUrl.searchParams.get('token');
    return queryToken?.trim() || null;
  } catch (error) {
    logger.debug('[Auth] Failed to parse request URL for token extraction:', error);
    return null;
  }
}

/**
 * Validate JWT token signature and expiration.
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
