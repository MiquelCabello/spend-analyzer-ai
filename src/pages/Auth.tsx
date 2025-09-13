import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Eye, EyeOff, ArrowLeft, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Logger } from "@/lib/logger";
import { ClientRateLimiter } from "@/lib/rate-limiter";
import { SecurityUtils } from "@/lib/security";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!ClientRateLimiter.isAllowed('/auth/signin', ClientRateLimiter.configs.auth)) {
      const remainingTime = Math.ceil(ClientRateLimiter.getRemainingTime('/auth/signin') / 1000 / 60);
      setError(`Demasiados intentos de login. Intenta en ${remainingTime} minutos.`);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      Logger.info('Attempting sign in', { email: formData.email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: SecurityUtils.sanitizeInput(formData.email),
        password: formData.password,
      });

      if (error) {
        Logger.warn('Sign in failed', { error: error.message, email: formData.email });
        if (error.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos');
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user) {
        Logger.info('Sign in successful', { userId: data.user.id });
        toast({
          title: "¡Bienvenido!",
          description: "Has iniciado sesión correctamente",
        });
        navigate('/dashboard');
      }
    } catch (err) {
      Logger.error('Sign in error', err, { email: formData.email });
      setError('Error inesperado. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Rate limiting check
    if (!ClientRateLimiter.isAllowed('/auth/signup', ClientRateLimiter.configs.auth)) {
      const remainingTime = Math.ceil(ClientRateLimiter.getRemainingTime('/auth/signup') / 1000 / 60);
      setError(`Demasiados intentos de registro. Intenta en ${remainingTime} minutos.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      Logger.info('Attempting sign up', { email: formData.email, name: formData.name });
      
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.auth.signUp({
        email: SecurityUtils.sanitizeInput(formData.email),
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: SecurityUtils.sanitizeInput(formData.name),
            role: 'EMPLOYEE'
          }
        }
      });

      if (error) {
        Logger.warn('Sign up failed', { error: error.message, email: formData.email });
        if (error.message.includes('User already registered')) {
          setError('Ya existe una cuenta con este email');
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user && !data.session) {
        Logger.info('Sign up successful, email confirmation required', { userId: data.user.id });
        toast({
          title: "¡Registro exitoso!",
          description: "Verifica tu email para completar el registro",
        });
      } else if (data.session) {
        Logger.info('Sign up successful with session', { userId: data.user?.id });
        toast({
          title: "¡Cuenta creada!",
          description: "Tu cuenta ha sido creada exitosamente",
        });
        navigate('/dashboard');
      }
    } catch (err) {
      Logger.error('Sign up error', err, { email: formData.email });
      setError('Error inesperado. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/5 to-transparent rounded-full transform rotate-12"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/5 to-transparent rounded-full transform -rotate-12"></div>
      </div>

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-primary hover:text-primary-dark transition-colors mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Receipt className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">ExpenseAI</h1>
          </div>
          <p className="text-slate-600">
            Accede a tu cuenta para gestionar gastos empresariales
          </p>
        </div>

        {/* Auth Card */}
        <Card className="card-corporate shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center text-slate-900">
              Acceso a la Plataforma
            </CardTitle>
            <CardDescription className="text-center text-slate-600">
              Inicia sesión o crea una nueva cuenta
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Sign In Form */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email corporativo</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="input-corporate pl-10"
                        placeholder="tu@empresa.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        className="input-corporate pr-10"
                        placeholder="Tu contraseña"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-corporate mt-6"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up Form */}
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre completo</Label>
                    <Input
                      id="signup-name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="input-corporate"
                      placeholder="Tu nombre completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email corporativo</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="input-corporate pl-10"
                        placeholder="tu@empresa.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        className="input-corporate pr-10"
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirmar contraseña</Label>
                    <Input
                      id="signup-confirm-password"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="input-corporate"
                      placeholder="Repite tu contraseña"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-corporate mt-6"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      'Crear Cuenta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-slate-500">
          <p>
            Al crear una cuenta, aceptas nuestros{" "}
            <a href="#" className="text-primary hover:underline">
              Términos de Servicio
            </a>{" "}
            y{" "}
            <a href="#" className="text-primary hover:underline">
              Política de Privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;