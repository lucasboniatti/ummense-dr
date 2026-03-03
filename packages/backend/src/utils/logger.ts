/**
 * Simple logger utility for application logging
 * Supports: debug, info, warn, error levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: any;
}

class Logger {
  private isDev = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: any): void {
    if (this.isDev) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: any): void {
    console.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: any): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, context?: any): void {
    console.error(this.formatMessage('error', message, context));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };
