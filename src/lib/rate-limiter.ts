/**
 * Client-side Rate Limiter
 * Complementa el rate limiting del servidor
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (endpoint: string) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class ClientRateLimiter {
  private static storage = new Map<string, RateLimitEntry>();
  private static defaultConfig: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60000, // 1 minuto
  };

  static isAllowed(endpoint: string, config?: Partial<RateLimitConfig>): boolean {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = finalConfig.keyGenerator ? finalConfig.keyGenerator(endpoint) : endpoint;
    
    const now = Date.now();
    const entry = this.storage.get(key);

    // Si no hay entrada o ha expirado, crear nueva
    if (!entry || now > entry.resetTime) {
      this.storage.set(key, {
        count: 1,
        resetTime: now + finalConfig.windowMs,
      });
      return true;
    }

    // Si no ha alcanzado el límite, incrementar contador
    if (entry.count < finalConfig.maxRequests) {
      entry.count++;
      return true;
    }

    // Límite alcanzado
    return false;
  }

  static getRemainingTime(endpoint: string): number {
    const entry = this.storage.get(endpoint);
    if (!entry) return 0;
    
    return Math.max(0, entry.resetTime - Date.now());
  }

  static reset(endpoint?: string): void {
    if (endpoint) {
      this.storage.delete(endpoint);
    } else {
      this.storage.clear();
    }
  }

  // Configuraciones específicas por endpoint
  static readonly configs = {
    upload: { maxRequests: 5, windowMs: 60000 }, // 5 uploads por minuto
    auth: { maxRequests: 3, windowMs: 300000 }, // 3 intentos de login por 5 minutos
    api: { maxRequests: 30, windowMs: 60000 }, // 30 API calls por minuto
  };
}

export { ClientRateLimiter };