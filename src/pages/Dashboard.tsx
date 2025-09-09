import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Euro, 
  Clock, 
  TrendingUp, 
  Calendar,
  Receipt,
  Users,
  PieChart,
  FileText,
  Upload,
  Settings,
  LogOut,
  BarChart3,
  DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Profile {
  id: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE';
  department: string | null;
}

interface DashboardStats {
  totalExpenses: number;
  pendingExpenses: number;
  pendingCount: number;
  topCategory: string;
  dailyAverage: number;
  thisMonthExpenses: number;
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    pendingExpenses: 0,
    pendingCount: 0,
    topCategory: 'Cargando...',
    dailyAverage: 0,
    thisMonthExpenses: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast({
          title: "Error",
          description: "No se pudo cargar tu perfil",
          variant: "destructive"
        });
        return;
      }

      setProfile(profileData);
      await loadDashboardStats(profileData);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async (userProfile: Profile) => {
    try {
      // Calculate date ranges
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Build query based on user role
      let query = supabase
        .from('expenses')
        .select(`
          amount_gross,
          status,
          expense_date,
          categories(name),
          profiles(name)
        `);

      // If employee, only show their expenses
      if (userProfile.role === 'EMPLOYEE') {
        query = query.eq('employee_id', userProfile.id);
      }

      const { data: expenses, error } = await query
        .gte('expense_date', startOfYear.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching expenses:', error);
        return;
      }

      if (!expenses) return;

      // Calculate statistics
      const totalExpenses = expenses
        .filter(exp => exp.status === 'APPROVED')
        .reduce((sum, exp) => sum + Number(exp.amount_gross), 0);

      const pendingExpenses = expenses
        .filter(exp => exp.status === 'PENDING')
        .reduce((sum, exp) => sum + Number(exp.amount_gross), 0);

      const pendingCount = expenses.filter(exp => exp.status === 'PENDING').length;

      const thisMonthExpenses = expenses
        .filter(exp => {
          const expDate = new Date(exp.expense_date);
          return expDate >= startOfMonth && exp.status === 'APPROVED';
        })
        .reduce((sum, exp) => sum + Number(exp.amount_gross), 0);

      // Calculate daily average (this month)
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dailyAverage = thisMonthExpenses / Math.max(now.getDate(), 1);

      // Find top category
      const categoryTotals = expenses.reduce((acc, exp) => {
        if (exp.status === 'APPROVED' && exp.categories?.name) {
          acc[exp.categories.name] = (acc[exp.categories.name] || 0) + Number(exp.amount_gross);
        }
        return acc;
      }, {} as Record<string, number>);

      const topCategory = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Sin datos';

      setStats({
        totalExpenses,
        pendingExpenses,
        pendingCount,
        topCategory,
        dailyAverage,
        thisMonthExpenses
      });

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <header className="nav-corporate">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Receipt className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold text-primary">ExpenseAI</h1>
              </div>
              
              <nav className="hidden md:flex space-x-6">
                <Button variant="ghost" className="text-slate-600 hover:text-primary">
                  Dashboard
                </Button>
                <Button variant="ghost" className="text-slate-600 hover:text-primary">
                  <Receipt className="w-4 h-4 mr-2" />
                  Gastos
                </Button>
                <Button variant="ghost" className="text-slate-600 hover:text-primary">
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Ticket
                </Button>
                <Button variant="ghost" className="text-slate-600 hover:text-primary">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analíticas
                </Button>
                {profile?.role === 'ADMIN' && (
                  <Button variant="ghost" className="text-slate-600 hover:text-primary">
                    <Users className="w-4 h-4 mr-2" />
                    Empleados
                  </Button>
                )}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{profile?.name}</p>
                <Badge variant={profile?.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
                  {profile?.role === 'ADMIN' ? 'Administrador' : 'Empleado'}
                </Badge>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            ¡Bienvenido/a, {profile?.name}! 👋
          </h2>
          <p className="text-slate-600 text-lg">
            {profile?.role === 'ADMIN' 
              ? 'Aquí tienes un resumen de la actividad financiera de tu empresa'
              : 'Aquí tienes un resumen de tus gastos y actividad reciente'
            }
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Gastos Totales {new Date().getFullYear()}
              </CardTitle>
              <Euro className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stats.totalExpenses.toLocaleString('es-ES', { 
                  style: 'currency', 
                  currency: 'EUR' 
                })}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Gastos aprobados este año
              </p>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Pendientes de Aprobación
              </CardTitle>
              <Clock className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {stats.pendingExpenses.toLocaleString('es-ES', { 
                  style: 'currency', 
                  currency: 'EUR' 
                })}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {stats.pendingCount} gastos pendientes
              </p>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Categoría Principal
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 truncate">
                {stats.topCategory}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Mayor gasto por categoría
              </p>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Promedio Diario
              </CardTitle>
              <Calendar className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stats.dailyAverage.toLocaleString('es-ES', { 
                  style: 'currency', 
                  currency: 'EUR' 
                })}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Promedio este mes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Monthly Progress */}
          <Card className="card-dashboard lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                Progreso Mensual
              </CardTitle>
              <CardDescription>
                Gastos del mes actual comparado con el promedio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Gastos este mes</span>
                  <span className="font-medium">
                    {stats.thisMonthExpenses.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    })}
                  </span>
                </div>
                <Progress 
                  value={Math.min((stats.thisMonthExpenses / (stats.totalExpenses / 12)) * 100, 100)} 
                  className="h-3"
                />
                <p className="text-xs text-slate-600">
                  {Math.round((stats.thisMonthExpenses / (stats.totalExpenses / 12)) * 100)}% del promedio mensual
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-4 bg-success/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-success mx-auto mb-2" />
                  <p className="text-2xl font-bold text-success">
                    {stats.thisMonthExpenses.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    })}
                  </p>
                  <p className="text-xs text-slate-600">Este Mes</p>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-primary">
                    {(stats.totalExpenses / 12).toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    })}
                  </p>
                  <p className="text-xs text-slate-600">Promedio Mensual</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>
                Accesos directos a las funciones más utilizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full btn-corporate">
                <Upload className="w-4 h-4 mr-2" />
                Subir Nuevo Ticket
              </Button>
              
              <Button variant="outline" className="w-full">
                <Receipt className="w-4 h-4 mr-2" />
                Ver Mis Gastos
              </Button>
              
              <Button variant="outline" className="w-full">
                <PieChart className="w-4 h-4 mr-2" />
                Analíticas
              </Button>
              
              {profile?.role === 'ADMIN' && (
                <>
                  <Button variant="outline" className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Gestionar Empleados
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar Datos
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="card-dashboard">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              {profile?.role === 'ADMIN' 
                ? 'Últimos movimientos de gastos en la empresa'
                : 'Tus últimos gastos registrados'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Placeholder for recent expenses */}
              <div className="text-center py-8 text-slate-500">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium mb-2">No hay actividad reciente</p>
                <p className="text-sm">Los gastos aparecerán aquí cuando se registren</p>
                <Button className="mt-4 btn-corporate">
                  <Upload className="w-4 h-4 mr-2" />
                  Subir tu Primer Ticket
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;