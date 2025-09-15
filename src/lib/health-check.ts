import { supabase } from '@/integrations/supabase/client';
import { Logger } from './logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: {
    database: boolean;
    auth: boolean;
    storage: boolean;
  };
  metrics: {
    responseTime: number;
    memoryUsage?: number;
  };
}

class HealthChecker {
  private static instance: HealthChecker;
  private lastCheck: HealthStatus | null = null;
  private checkInterval: number = 30000; // 30 seconds

  static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = performance.now();
    
    try {
      Logger.info('Starting health check');

      const checks = {
        database: await this.checkDatabase(),
        auth: await this.checkAuth(),
        storage: await this.checkStorage(),
      };

      const allHealthy = Object.values(checks).every(check => check);
      const someHealthy = Object.values(checks).some(check => check);

      const responseTime = performance.now() - startTime;
      
      const status: HealthStatus = {
        status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
        timestamp: Date.now(),
        checks,
        metrics: {
          responseTime,
          memoryUsage: this.getMemoryUsage(),
        }
      };

      this.lastCheck = status;
      Logger.info('Health check completed', { status: status.status, responseTime });

      return status;
    } catch (error) {
      Logger.error('Health check failed', { error });
      
      const errorStatus: HealthStatus = {
        status: 'unhealthy',
        timestamp: Date.now(),
        checks: {
          database: false,
          auth: false,
          storage: false,
        },
        metrics: {
          responseTime: performance.now() - startTime,
        }
      };

      this.lastCheck = errorStatus;
      return errorStatus;
    }
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      // Try to query an existing table to check database connectivity
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      // Database is healthy if we can query (even if no data exists)
      return !error;
    } catch (error) {
      Logger.error('Database health check failed', { error });
      return false;
    }
  }

  private async checkAuth(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getSession();
      // Auth service is healthy if we can get session info (even if no user)
      return !error;
    } catch (error) {
      Logger.error('Auth health check failed', { error });
      return false;
    }
  }

  private async checkStorage(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      return !error;
    } catch (error) {
      Logger.error('Storage health check failed', { error });
      return false;
    }
  }

  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      // @ts-ignore - memory property exists in some browsers
      return (performance as any).memory?.usedJSHeapSize;
    }
    return undefined;
  }

  getLastHealthCheck(): HealthStatus | null {
    return this.lastCheck;
  }

  startPeriodicHealthChecks(): void {
    // Perform initial check
    this.performHealthCheck();
    
    // Set up periodic checks
    setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);

    Logger.info('Periodic health checks started', { interval: this.checkInterval });
  }

  setCheckInterval(interval: number): void {
    this.checkInterval = interval;
    Logger.info('Health check interval updated', { interval });
  }
}

export const healthChecker = HealthChecker.getInstance();