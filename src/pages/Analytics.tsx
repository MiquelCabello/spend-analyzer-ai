import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Euro, 
  Calendar,
  Users,
  Download,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AnalyticsData {
  totalExpenses: number;
  totalAmount: number;
  avgExpenseAmount: number;
  monthlyTrend: Array<{ month: string; amount: number; count: number }>;
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number }>;
  topVendors: Array<{ vendor: string; amount: number; count: number }>;
  employeeLeaderboard: Array<{ employee: string; amount: number; count: number }>;
  statusDistribution: Array<{ status: string; count: number; percentage: number }>;
}

interface Profile {
  id: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

const Analytics = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('12_months');
  const [statusFilter, setStatusFilter] = useState('APPROVED');
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (profile) {
      loadAnalytics();
    }
  }, [profile, timeRange, statusFilter]);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setProfile(profileData);
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case '1_month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3_months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '6_months':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case '12_months':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'year_to_date':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Build query based on user role
      let query = supabase
        .from('expenses')
        .select(`
          *,
          profiles!expenses_employee_id_fkey(name),
          categories(name)
        `)
        .gte('expense_date', startDate.toISOString().split('T')[0]);

      // Filter by status if not 'ALL'
      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter as 'PENDING' | 'APPROVED' | 'REJECTED');
      }

      // If employee, only show their expenses
      if (profile?.role === 'EMPLOYEE') {
        query = query.eq('employee_id', profile.id);
      }

      const { data: expenses, error } = await query;

      if (error) throw error;

      // Process analytics data
      const analyticsData = processAnalyticsData(expenses || []);
      setAnalytics(analyticsData);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las analíticas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (expenses: any[]): AnalyticsData => {
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount_gross), 0);
    const avgExpenseAmount = totalAmount / Math.max(totalExpenses, 1);

    // Monthly trend
    const monthlyData = new Map();
    expenses.forEach(expense => {
      const month = new Date(expense.expense_date).toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short' 
      });
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { amount: 0, count: 0 });
      }
      const current = monthlyData.get(month);
      current.amount += Number(expense.amount_gross);
      current.count += 1;
    });

    const monthlyTrend = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      amount: data.amount,
      count: data.count
    })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    // Category breakdown
    const categoryData = new Map();
    expenses.forEach(expense => {
      const category = expense.categories?.name || 'Sin categoría';
      categoryData.set(category, (categoryData.get(category) || 0) + Number(expense.amount_gross));
    });

    const categoryBreakdown = Array.from(categoryData.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalAmount) * 100
    })).sort((a, b) => b.amount - a.amount);

    // Top vendors
    const vendorData = new Map();
    expenses.forEach(expense => {
      const vendor = expense.vendor;
      if (!vendorData.has(vendor)) {
        vendorData.set(vendor, { amount: 0, count: 0 });
      }
      const current = vendorData.get(vendor);
      current.amount += Number(expense.amount_gross);
      current.count += 1;
    });

    const topVendors = Array.from(vendorData.entries()).map(([vendor, data]) => ({
      vendor,
      amount: data.amount,
      count: data.count
    })).sort((a, b) => b.amount - a.amount).slice(0, 10);

    // Employee leaderboard (only for admin)
    const employeeData = new Map();
    if (profile?.role === 'ADMIN') {
      expenses.forEach(expense => {
        const employee = expense.profiles?.name || 'Sin nombre';
        if (!employeeData.has(employee)) {
          employeeData.set(employee, { amount: 0, count: 0 });
        }
        const current = employeeData.get(employee);
        current.amount += Number(expense.amount_gross);
        current.count += 1;
      });
    }

    const employeeLeaderboard = Array.from(employeeData.entries()).map(([employee, data]) => ({
      employee,
      amount: data.amount,
      count: data.count
    })).sort((a, b) => b.amount - a.amount).slice(0, 10);

    // Status distribution
    const statusData = new Map();
    expenses.forEach(expense => {
      statusData.set(expense.status, (statusData.get(expense.status) || 0) + 1);
    });

    const statusDistribution = Array.from(statusData.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: (count / totalExpenses) * 100
    }));

    return {
      totalExpenses,
      totalAmount,
      avgExpenseAmount,
      monthlyTrend,
      categoryBreakdown,
      topVendors,
      employeeLeaderboard,
      statusDistribution
    };
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendiente';
      case 'APPROVED': return 'Aprobado';
      case 'REJECTED': return 'Rechazado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analíticas Financieras</h1>
          <p className="text-slate-600 mt-1">
            Análisis detallado de los gastos empresariales
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="card-dashboard">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Período de Tiempo</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_month">Último mes</SelectItem>
                  <SelectItem value="3_months">Últimos 3 meses</SelectItem>
                  <SelectItem value="6_months">Últimos 6 meses</SelectItem>
                  <SelectItem value="12_months">Últimos 12 meses</SelectItem>
                  <SelectItem value="year_to_date">Año actual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Estado de Gastos</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los estados</SelectItem>
                  <SelectItem value="APPROVED">Solo aprobados</SelectItem>
                  <SelectItem value="PENDING">Solo pendientes</SelectItem>
                  <SelectItem value="REJECTED">Solo rechazados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="card-dashboard">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Total de Gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {analytics.totalExpenses.toLocaleString('es-ES')}
                </div>
                <p className="text-xs text-slate-600 mt-1">gastos registrados</p>
              </CardContent>
            </Card>

            <Card className="card-dashboard">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
                  <Euro className="w-4 h-4 mr-2" />
                  Importe Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {analytics.totalAmount.toLocaleString('es-ES', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  })}
                </div>
                <p className="text-xs text-slate-600 mt-1">en gastos totales</p>
              </CardContent>
            </Card>

            <Card className="card-dashboard">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Gasto Promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {analytics.avgExpenseAmount.toLocaleString('es-ES', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  })}
                </div>
                <p className="text-xs text-slate-600 mt-1">por gasto</p>
              </CardContent>
            </Card>

            <Card className="card-dashboard">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Gasto Mensual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {(analytics.totalAmount / Math.max(analytics.monthlyTrend.length, 1)).toLocaleString('es-ES', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  })}
                </div>
                <p className="text-xs text-slate-600 mt-1">promedio mensual</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Gastos por Categoría
                </CardTitle>
                <CardDescription>
                  Distribución del gasto por categorías
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.categoryBreakdown.slice(0, 6).map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: `hsl(${(index * 60) % 360}, 70%, 60%)` }}
                        />
                        <span className="text-sm font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {category.amount.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          })}
                        </div>
                        <div className="text-xs text-slate-600">
                          {category.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Vendors */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Top Proveedores
                </CardTitle>
                <CardDescription>
                  Proveedores con mayor gasto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topVendors.slice(0, 8).map((vendor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{vendor.vendor}</p>
                        <p className="text-xs text-slate-600">{vendor.count} gastos</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {vendor.amount.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          })}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Employee Leaderboard (Admin only) */}
            {profile?.role === 'ADMIN' && analytics.employeeLeaderboard.length > 0 && (
              <Card className="card-dashboard">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Ranking de Empleados
                  </CardTitle>
                  <CardDescription>
                    Empleados con mayor gasto en el período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.employeeLeaderboard.slice(0, 8).map((employee, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{employee.employee}</p>
                            <p className="text-xs text-slate-600">{employee.count} gastos</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {employee.amount.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          })}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Distribution */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Estado de Gastos
                </CardTitle>
                <CardDescription>
                  Distribución por estado de aprobación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.statusDistribution.map((status, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ 
                            backgroundColor: status.status === 'APPROVED' ? '#22c55e' : 
                                           status.status === 'PENDING' ? '#f59e0b' : '#ef4444'
                          }}
                        />
                        <span className="text-sm font-medium">{getStatusText(status.status)}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{status.count} gastos</div>
                        <div className="text-xs text-slate-600">
                          {status.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Evolución Mensual
              </CardTitle>
              <CardDescription>
                Tendencia de gastos a lo largo del tiempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.monthlyTrend.map((month, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                    <div>
                      <p className="font-medium">{month.month}</p>
                      <p className="text-sm text-slate-600">{month.count} gastos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {month.amount.toLocaleString('es-ES', { 
                          style: 'currency', 
                          currency: 'EUR' 
                        })}
                      </p>
                      <p className="text-xs text-slate-600">
                        Promedio: {(month.amount / Math.max(month.count, 1)).toLocaleString('es-ES', { 
                          style: 'currency', 
                          currency: 'EUR' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Analytics;