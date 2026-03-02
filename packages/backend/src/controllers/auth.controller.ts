import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';
import { hashPassword, comparePasswords, validatePassword } from '../utils/password';
import { User, AuthPayload } from '../types/user';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRATION = '24h';

// Mock database - replace with real DB
const users: Map<number, User> = new Map();
let nextId = 1;

export async function signup(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body as AuthPayload;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({ errors: passwordValidation.errors });
      return;
    }

    // Check if email already exists
    const userExists = Array.from(users.values()).some(u => u.email === email);
    if (userExists) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Hash password and create user
    const password_hash = await hashPassword(password);
    const user: User = {
      id: nextId++,
      email,
      password_hash,
      created_at: new Date(),
      updated_at: new Date(),
    };

    users.set(user.id, user);

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

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    // Find user
    const user = Array.from(users.values()).find(u => u.email === email);
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

export function getMe(req: AuthRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = users.get(req.user.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(200).json({
    id: user.id,
    email: user.email,
  });
}

export function logout(req: AuthRequest, res: Response): void {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
}
