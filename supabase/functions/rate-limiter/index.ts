import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface RateLimitConfig {
  [endpoint: string]: RateLimitRule;
}

// Configuraciones de rate limiting por endpoint
const rateLimitConfig: RateLimitConfig = {
  '/analyze-receipt': {
    windowMs: 60000, // 1 minuto
    maxRequests: 10,
    message: 'Demasiados análisis de recibos. Intenta en 1 minuto.'
  },
  '/auth/signup': {
    windowMs: 300000, // 5 minutos
    maxRequests: 3,
    message: 'Demasiados intentos de registro. Intenta en 5 minutos.'
  },
  '/auth/signin': {
    windowMs: 300000, // 5 minutos
    maxRequests: 5,
    message: 'Demasiados intentos de login. Intenta en 5 minutos.'
  },
  default: {
    windowMs: 60000,
    maxRequests: 30,
    message: 'Demasiadas solicitudes. Intenta más tarde.'
  }
};

// Almacén en memoria para rate limiting (en producción usar Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(clientIP: string, endpoint: string): string {
  return `${clientIP}:${endpoint}`;
}

function isRateLimited(clientIP: string, endpoint: string): { limited: boolean; message?: string; resetTime?: number } {
  const config = rateLimitConfig[endpoint] || rateLimitConfig.default;
  const key = getRateLimitKey(clientIP, endpoint);
  const now = Date.now();
  
  const entry = rateLimitStore.get(key);
  
  // Si no existe entrada o ha expirado, crear nueva
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return { limited: false };
  }
  
  // Si no ha alcanzado el límite, incrementar
  if (entry.count < config.maxRequests) {
    entry.count++;
    return { limited: false };
  }
  
  // Límite alcanzado
  return {
    limited: true,
    message: config.message,
    resetTime: entry.resetTime
  };
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const endpoint = url.pathname;
    
    // Obtener IP del cliente
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    
    // Verificar rate limit
    const rateLimitResult = isRateLimited(clientIP, endpoint);
    
    if (rateLimitResult.limited) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: rateLimitResult.message,
          retryAfter: Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': rateLimitConfig[endpoint]?.maxRequests.toString() || '30',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime!).toISOString()
          }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ allowed: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
    
  } catch (error) {
    console.error('Rate limiter error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Rate limiter service error',
        message: 'Internal server error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});