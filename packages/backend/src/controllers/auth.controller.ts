import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';
import { hashPassword, comparePasswords, validatePassword } from '../utils/password';
import { AuthPayload } from '../types/user';
import { supabase } from '../lib/supabase';
import { getRequiredEnvVar } from '../config/env';

const JWT_SECRET = getRequiredEnvVar('JWT_SECRET');
const JWT_EXPIRATION = '24h';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUserError) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const password_hash = await hashPassword(password);
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        password_hash,
      })
      .select('id,email')
      .single();

    if (insertError || !user) {
      const message = insertError?.code === '23505' ? 'Email already registered' : 'Internal server error';
      const status = insertError?.code === '23505' ? 409 : 500;
      res.status(status).json({ error: message });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
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

    const { data: user, error: selectError } = await supabase
      .from('users')
      .select('id,email,password_hash')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (selectError) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Compare password
    const isPasswordValid = await comparePasswords(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

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

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id,email')
      .eq('id', String(req.user?.id))
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      id: user.id,
      email: user.email,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function logout(req: AuthRequest, res: Response): void {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
}
