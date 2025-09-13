/**
 * Centralized Logger
 * Production-safe logging with different levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private static isDevelopment = import.meta.env.DEV;
  private static isProduction = import.meta.env.PROD;

  private static formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `${prefix} ${message}${contextStr}`;
  }

  static debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  static info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  static warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  static error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error;

    const fullContext = { ...context, error: errorDetails };
    
    console.error(this.formatMessage('error', message, fullContext));
    
    // En producción, aquí se podría enviar a un servicio de monitoreo como Sentry
    if (this.isProduction) {
      this.sendToMonitoring(message, error, context);
    }
  }

  private static sendToMonitoring(message: string, error?: Error | unknown, context?: LogContext): void {
    // TODO: Integrar con Sentry o servicio de monitoreo
    // window.Sentry?.captureException(error, { extra: context });
  }

  // Helper para logging de performance
  static time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  static timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  // Helper para logging de eventos de usuario (analytics)
  static analytics(event: string, properties?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.debug(`Analytics Event: ${event}`, properties);
    }
    
    // TODO: Enviar a servicio de analytics en producción
  }
}

export { Logger };