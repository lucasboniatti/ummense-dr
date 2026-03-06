import express, { Express, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { webhookRoutes } from './routes/webhook.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import authRoutes from './routes/auth';
import { automationRoutes } from './routes/automation.routes';
import flowRoutes from './routes/flows';
import cardRoutes from './routes/cards';
import taskRoutes from './routes/tasks';
import tagRoutes from './routes/tags';
import eventRoutes from './routes/events';
import panelRoutes from './routes/panel';
import { authMiddleware } from './middleware/auth.middleware';
import { controlRoutes } from './api/automations/control.routes';
import { statusRoutes } from './api/status/status.routes';
import webhookDeliveryRoutes from './api/webhooks/webhook-delivery.routes';
import { createHistoryRoutes } from './automations/history/history.routes';
import { ExecutionHistoryService } from './automations/history/history.service';
import { supabase } from './lib/supabase';
import { AppError } from './utils/errors';

const app: Express = express();
const historyService = new ExecutionHistoryService(supabase as any);
const historyRoutes = createHistoryRoutes(historyService);

const localCorsDefaults = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3010',
  'http://127.0.0.1:3010',
];

function getAllowedOrigins(): string[] {
  const configured = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  return process.env.NODE_ENV === 'production' ? [] : localCorsDefaults;
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    if (!origin) {
      // Allow non-browser clients (curl, health checks, internal calls).
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/flows', flowRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/panel', panelRoutes);
app.use('/api/status', statusRoutes);

// Unified automations surface consumed by frontend pages/services.
app.use('/api/automations', authMiddleware, controlRoutes);
app.use('/api/automations', authMiddleware, automationRoutes);
app.use('/api/automations', authMiddleware, historyRoutes);

// DLQ endpoints under /api/automations/:automationId/webhooks/*
app.use('/api', authMiddleware, webhookDeliveryRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Error handler middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);

  const status = err instanceof AppError ? err.status : err.status || 500;
  const message = err instanceof AppError ? err.message : err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    status,
    timestamp: new Date().toISOString(),
  });
});

export default app;
