/**
 * Authentication Service
 * Validates JWT tokens and extracts user information from WebSocket requests
 */

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

    // Extract token from "Bearer {token}" format
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      logger.warn('[Auth] Empty authorization token');
      return null;
    }

    // TODO: Validate JWT token against Supabase or other auth provider
    // For now, extract user ID from token payload
    // In production, use: supabase.auth.getUser(token)

    // Placeholder: Extract user ID from custom header or token
    const userId = req.headers['x-user-id'] || extractUserIdFromToken(token);

    if (!userId) {
      logger.warn('[Auth] Invalid token: no user ID found');
      return null;
    }

    logger.debug(`[Auth] Authenticated user: ${userId}`);
    return userId;
  } catch (error) {
    logger.error('[Auth] Authentication error:', error);
    return null;
  }
}

/**
 * Extract user ID from JWT token payload
 * Assumes standard JWT structure: header.payload.signature
 *
 * @param token JWT token
 * @returns User ID or null
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (second part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    // Try common user ID fields
    return payload.sub || payload.user_id || payload.uid || null;
  } catch (error) {
    logger.debug('[Auth] Failed to extract user ID from token:', error);
    return null;
  }
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
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Check expiration
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      logger.warn('[Auth] Token expired');
      return false;
    }

    // TODO: Verify signature with secret key
    return true;
  } catch (error) {
    logger.debug('[Auth] Token validation failed:', error);
    return false;
  }
}
