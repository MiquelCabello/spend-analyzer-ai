import { toast } from "@/components/ui/use-toast";
import { Logger } from '@/lib/logger';

export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
}

export class ErrorHandler {
  static handle(error: unknown, context?: string): AppError {
    Logger.error(`Error in ${context || 'application'}`, error);

    let message = 'Ha ocurrido un error inesperado';
    let code = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      message = error.message;
      code = error.name;
    } else if (typeof error === 'string') {
      message = error;
    }

    // Show user-friendly toast
    toast({
      title: "Error",
      description: message,
      variant: "destructive"
    });

    return { message, code, details: error };
  }

  static handleAuthError(error: unknown): AppError {
    Logger.warn('Authentication error', { error });
    
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const authError = error as { message: string };
      
      // Map Supabase auth errors to user-friendly messages
      const errorMappings: Record<string, string> = {
        'Invalid login credentials': 'Email o contraseña incorrectos',
        'User already registered': 'Ya existe una cuenta con este email',
        'Email not confirmed': 'Debes verificar tu email antes de iniciar sesión',
        'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres'
      };

      const userMessage = errorMappings[authError.message] || authError.message;
      
      toast({
        title: "Error de autenticación",
        description: userMessage,
        variant: "destructive"
      });

      return { message: userMessage, code: 'AUTH_ERROR', details: error };
    }

    return this.handle(error, 'authentication');
  }

  static handleDatabaseError(error: unknown): AppError {
    Logger.error('Database error', error);
    
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const dbError = error as { message: string };
      
      toast({
        title: "Error de base de datos",
        description: "Error al procesar la solicitud. Inténtalo de nuevo.",
        variant: "destructive"
      });

      return { message: dbError.message, code: 'DB_ERROR', details: error };
    }

    return this.handle(error, 'database');
  }
}