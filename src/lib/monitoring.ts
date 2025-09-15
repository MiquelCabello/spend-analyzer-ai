/**
 * Error monitoring and alerting system
 * Sentry integration for production error tracking
 */

import * as Sentry from '@sentry/react';
import { Logger } from './logger';

interface MonitoringConfig {
  dsn?: string;
  environment: 'development' | 'staging' | 'production';
  release?: string;
  userId?: string;
  email?: string;
}

export class ErrorMonitoring {
  private static initialized = false;

  /**
   * Initialize Sentry error monitoring
   */
  static initialize(config: MonitoringConfig): void {
    if (this.initialized) return;

    if (config.dsn && config.environment === 'production') {
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release,
        
        // Performance monitoring
        tracesSampleRate: config.environment === 'production' ? 0.1 : 1.0,
        
        // Session replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
          Sentry.feedbackIntegration({
            colorScheme: "system",
            showBranding: false,
          }),
        ],

        beforeSend: (event) => {
          // Filter out development errors
          if (config.environment !== 'production' && event.exception) {
            Logger.error('Error intercepted by Sentry', event);
            return null;
          }
          return event;
        },

        beforeSendTransaction: (event) => {
          // Sample transactions in production
          if (config.environment === 'production' && Math.random() > 0.1) {
            return null;
          }
          return event;
        },
      });

      // Set user context
      if (config.userId) {
        Sentry.setUser({
          id: config.userId,
          email: config.email,
        });
      }

      Logger.info('Sentry monitoring initialized', { environment: config.environment });
    } else {
      Logger.info('Sentry monitoring disabled', { environment: config.environment });
    }

    this.initialized = true;
  }

  /**
   * Capture error with context
   */
  static captureError(error: Error, context?: Record<string, any>): string {
    const eventId = Sentry.captureException(error, {
      contexts: context ? { custom: context } : undefined,
    });

    Logger.error('Error captured by monitoring', {
      error: error.message,
      eventId,
      context,
    });

    return eventId;
  }

  /**
   * Capture message with level
   */
  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): string {
    const eventId = Sentry.captureMessage(message, level);
    
    Logger.info('Message captured by monitoring', {
      message,
      level,
      eventId,
    });

    return eventId;
  }

  /**
   * Add breadcrumb for debugging context
   */
  static addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void {
    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      level: 'info',
      data,
    });
  }

  /**
   * Set user context
   */
  static setUser(userId: string, email?: string, role?: string): void {
    Sentry.setUser({
      id: userId,
      email,
      role,
    });
  }

  /**
   * Set custom context
   */
  static setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context);
  }

  /**
   * Start performance transaction
   */
  static startTransaction(name: string, operation: string = 'navigation') {
    return Sentry.startSpan({
      name,
      op: operation,
    }, (span) => span);
  }

  /**
   * Show user report dialog
   */
  static showReportDialog(eventId?: string): void {
    Sentry.showReportDialog({
      eventId,
      title: 'Reportar Error',
      subtitle: 'Ayúdanos a mejorar reportando este error',
      subtitle2: 'Tu reporte será enviado al equipo de desarrollo',
      labelName: 'Nombre',
      labelEmail: 'Email',
      labelComments: 'Describe lo que estabas haciendo cuando ocurrió el error',
      labelSubmit: 'Enviar Reporte',
      labelClose: 'Cerrar',
      successMessage: '¡Gracias! Tu reporte ha sido enviado.',
    });
  }

  /**
   * Flush pending events (useful before page unload)
   */
  static async flush(timeout: number = 2000): Promise<boolean> {
    return await Sentry.flush(timeout);
  }
}

/**
 * Performance monitoring
 */
export class PerformanceMonitoring {
  /**
   * Monitor React component performance
   */
  static withPerformanceMonitoring<P extends object>(
    Component: React.ComponentType<P>,
    componentName?: string
  ) {
    return Sentry.withProfiler(Component, {
      name: componentName || Component.displayName || Component.name,
    });
  }

  /**
   * Monitor async operations
   */
  static async monitorAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    return await Sentry.withActiveSpan(null, async () => {
      if (context) {
        ErrorMonitoring.setContext('operation', context);
      }

      try {
        const result = await operation();
        return result;
      } catch (error) {
        ErrorMonitoring.captureError(error as Error, {
          operation: operationName,
          ...context,
        });
        throw error;
      }
    });
  }

  /**
   * Monitor database queries
   */
  static monitorDatabaseQuery<T>(
    queryName: string,
    query: () => Promise<T>,
    queryText?: string
  ): Promise<T> {
    return this.monitorAsyncOperation(
      `db.query.${queryName}`,
      query,
      { queryText }
    );
  }

  /**
   * Monitor API calls
   */
  static monitorApiCall<T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    return this.monitorAsyncOperation(
      `api.${method.toLowerCase()}.${endpoint.replace(/\//g, '.')}`,
      apiCall,
      { endpoint, method }
    );
  }
}

/**
 * React Error Boundary with Sentry integration
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Health check monitoring
 */
export class HealthMonitoring {
  private static checks: Map<string, () => Promise<boolean>> = new Map();

  /**
   * Register health check
   */
  static registerCheck(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  static async runHealthChecks(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, check] of this.checks.entries()) {
      try {
        results[name] = await check();
      } catch (error) {
        results[name] = false;
        ErrorMonitoring.captureError(error as Error, {
          healthCheck: name,
        });
      }
    }

    Logger.info('Health check completed', results);
    return results;
  }

  /**
   * Database connectivity check
   */
  static async checkDatabase(): Promise<boolean> {
    try {
      // Simple query to test database connection
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * API endpoint health check
   */
  static async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch('/health');
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Initialize default health checks
HealthMonitoring.registerCheck('database', HealthMonitoring.checkDatabase);
HealthMonitoring.registerCheck('api', HealthMonitoring.checkApiHealth);