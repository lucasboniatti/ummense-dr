import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { webhookRoutes } from './routes/webhook.routes';
import { analyticsRoutes } from './routes/analytics.routes';

const app: Express = express();

// Middleware
app.use(express.json());
app.use(cors());

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
app.use('/api/webhooks', webhookRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Error handler middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    status,
    timestamp: new Date().toISOString(),
  });
});

export default app;
