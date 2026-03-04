declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string | number;
        email?: string;
        [key: string]: unknown;
      };
      session?: Record<string, unknown>;
      cookies?: Record<string, string>;
    }
  }
}

export {};
