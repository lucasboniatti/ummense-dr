import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';
import { validatePassword } from '../utils/password';
import { AuthPayload } from '../types/user';
import { supabase, supabaseAuth } from '../lib/supabase';
import { getRequiredEnvVar } from '../config/env';

const JWT_SECRET = getRequiredEnvVar('JWT_SECRET');
const JWT_EXPIRATION = '24h';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getFrontendBaseUrl(): string {
  return (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://127.0.0.1:3000'
  );
}

function issueToken(id: string, email: string): string {
  return jwt.sign({ id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Internal server error';
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') {
      return status;
    }
  }

  return undefined;
}

export async function signup(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body as AuthPayload;
    const normalizedEmail = normalizeEmail(email || '');

    // Validate input
    if (!normalizedEmail || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({ errors: passwordValidation.errors });
      return;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      const message = getErrorMessage(error);
      const status = getErrorStatus(error);
      const lowered = message.toLowerCase();
      const isDuplicate =
        lowered.includes('already') ||
        lowered.includes('registered') ||
        status === 422;

      res.status(isDuplicate ? 409 : status || 500).json({
        error: isDuplicate ? 'Email already registered' : message,
      });
      return;
    }

    const user = data.user;
    const token = issueToken(user.id, user.email ?? normalizedEmail);
    setAuthCookie(res, token);

    res.status(201).json({
      id: user.id,
      email: user.email ?? normalizedEmail,
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body as AuthPayload;
    const normalizedEmail = normalizeEmail(email || '');

    if (!normalizedEmail || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      const message = getErrorMessage(error);
      const status = getErrorStatus(error);
      const lowered = message.toLowerCase();
      const isInvalidCredentials =
        lowered.includes('invalid login credentials') ||
        lowered.includes('invalid credentials') ||
        status === 400 ||
        status === 401;

      res.status(isInvalidCredentials ? 401 : status || 500).json({
        error: isInvalidCredentials ? 'Invalid credentials' : message,
      });
      return;
    }

    const user = data.user;
    if (!user.email) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const token = issueToken(user.id, user.email);
    setAuthCookie(res, token);

    res.status(200).json({
      id: user.id,
      email: user.email,
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.status(200).json({
    id: String(req.user.id),
    email: req.user.email,
  });
}

export function logout(req: AuthRequest, res: Response): void {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
}

export async function requestPasswordReset(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    const normalizedEmail = normalizeEmail(email || '');

    if (!normalizedEmail) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    const { error } = await supabaseAuth.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${getFrontendBaseUrl()}/auth/reset-password`,
      }
    );

    if (error) {
      res.status(500).json({ error: getErrorMessage(error) });
      return;
    }

    res.status(200).json({
      message:
        'If the email exists, we sent a password reset link.',
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resetPassword(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { accessToken, password } = req.body as {
      accessToken?: string;
      password?: string;
    };

    if (!accessToken || !password) {
      res.status(400).json({ error: 'Access token and password required' });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({ errors: passwordValidation.errors });
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !user) {
      res.status(401).json({ error: 'Invalid or expired recovery link' });
      return;
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
    });

    if (error) {
      res.status(500).json({ error: getErrorMessage(error) });
      return;
    }

    res.status(200).json({ message: 'Password updated successfully' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
