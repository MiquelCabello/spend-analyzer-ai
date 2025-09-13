/**
 * Security utilities and CSP configuration
 */

export class SecurityUtils {
  
  // Content Security Policy configuration
  static getCSPDirectives(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://owvtcgskljknkzggmrys.supabase.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://owvtcgskljknkzggmrys.supabase.co wss://owvtcgskljknkzggmrys.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ];
    
    return directives.join('; ');
  }

  // Security headers for API responses
  static getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': this.getCSPDirectives(),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-XSS-Protection': '1; mode=block'
    };
  }

  // Input sanitization
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // Validate file upload
  static validateFileUpload(file: File, allowedTypes: string[], maxSize: number): { valid: boolean; error?: string } {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de archivo no permitido. Tipos válidos: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Archivo demasiado grande. Máximo permitido: ${maxSize / (1024 * 1024)}MB`
      };
    }

    // Check file name
    const fileName = file.name.toLowerCase();
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.jar'];
    
    if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
      return {
        valid: false,
        error: 'Tipo de archivo potencialmente peligroso no permitido'
      };
    }

    return { valid: true };
  }

  // Generate nonce for inline scripts (if needed)
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Validate URL for redirects
  static isValidRedirectURL(url: string, allowedDomains: string[]): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check if domain is in allowed list
      return allowedDomains.some(domain => 
        urlObj.hostname === domain || 
        urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  // Rate limit check (client-side)
  static checkRateLimit(action: string, limit: number, windowMs: number): boolean {
    const key = `rateLimit_${action}`;
    const now = Date.now();
    
    const stored = localStorage.getItem(key);
    const data = stored ? JSON.parse(stored) : { count: 0, resetTime: now + windowMs };
    
    // Reset if window has passed
    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + windowMs;
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    }
    
    // Check if under limit
    if (data.count < limit) {
      data.count++;
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    }
    
    return false;
  }
}

// Security middleware for fetch requests
export function secureApiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const secureOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
      ...options.headers,
    },
    credentials: 'same-origin', // Include cookies for same-origin requests
  };

  return fetch(url, secureOptions);
}