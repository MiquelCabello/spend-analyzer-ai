import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Check, 
  X, 
  Calendar,
  Euro,
  Receipt,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Expense {
  id: string;
  vendor: string;
  expense_date: string;
  amount_gross: number;
  amount_net: number;
  tax_vat: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  payment_method: string;
  notes: string;
  rejection_reason: string;
  created_at: string;
  profiles: { name: string } | null;
  categories: { name: string } | null;
  project_codes: { code: string; name: string } | null;
  files: { id: string; original_name: string } | null;
}

interface Profile {
  id: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    category: 'ALL',
    employee: 'ALL',
    dateFrom: '',
    dateTo: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (profile) {
      loadExpenses();
    }
  }, [profile]);

  useEffect(() => {
    applyFilters();
  }, [expenses, filters]);

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

  const loadExpenses = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('expenses')
        .select(`
          *,
          profiles!expenses_employee_id_fkey(name),
          categories(name),
          project_codes(code, name),
          files(id, original_name)
        `);

      // If employee, only show their expenses
      if (profile?.role === 'EMPLOYEE') {
        query = query.eq('employee_id', profile.id);
      }

      const { data, error } = await query.order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los gastos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...expenses];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(expense =>
        expense.vendor.toLowerCase().includes(searchLower) ||
        expense.profiles?.name.toLowerCase().includes(searchLower) ||
        expense.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(expense => expense.status === filters.status);
    }

    // Date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(expense => expense.expense_date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(expense => expense.expense_date <= filters.dateTo);
    }

    setFilteredExpenses(filtered);
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'APPROVED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Aprobado</Badge>;
      case 'REJECTED':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rechazado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'CARD': return 'Tarjeta';
      case 'CASH': return 'Efectivo';
      case 'TRANSFER': return 'Transferencia';
      case 'OTHER': return 'Otro';
      default: return method;
    }
  };

  const approveExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'APPROVED',
          approver_id: profile?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Gasto aprobado",
        description: "El gasto ha sido aprobado correctamente",
      });

      loadExpenses();
    } catch (error) {
      console.error('Error approving expense:', error);
      toast({
        title: "Error",
        description: "No se pudo aprobar el gasto",
        variant: "destructive"
      });
    }
  };

  const rejectExpense = async () => {
    if (!selectedExpense || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Debe proporcionar un motivo de rechazo",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'REJECTED',
          approver_id: profile?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', selectedExpense.id);

      if (error) throw error;

      toast({
        title: "Gasto rechazado",
        description: "El gasto ha sido rechazado",
      });

      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedExpense(null);
      loadExpenses();
    } catch (error) {
      console.error('Error rejecting expense:', error);
      toast({
        title: "Error",
        description: "No se pudo rechazar el gasto",
        variant: "destructive"
      });
    }
  };

  const downloadReceipt = async (fileId: string) => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('storage_key')
        .eq('id', fileId)
        .single();

      if (error) throw error;

      const { data: urlData } = await supabase.storage
        .from('receipts')
        .createSignedUrl(data.storage_key, 60);

      if (urlData?.signedUrl) {
        window.open(urlData.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el recibo",
        variant: "destructive"
      });
    }
  };

  const exportExpenses = async (format: 'csv' | 'xlsx' | 'json') => {
    try {
      const dataToExport = filteredExpenses.map(expense => ({
        fecha: expense.expense_date,
        empleado: expense.profiles?.name || 'N/A',
        comercio: expense.vendor,
        categoria: expense.categories?.name || 'N/A',
        proyecto: expense.project_codes ? `${expense.project_codes.code} - ${expense.project_codes.name}` : 'N/A',
        importe_neto: expense.amount_net,
        iva: expense.tax_vat,
        importe_total: expense.amount_gross,
        moneda: expense.currency,
        metodo_pago: getPaymentMethodText(expense.payment_method),
        estado: expense.status,
        notas: expense.notes || ''
      }));

      // Convert to CSV for now (would implement other formats in production)
      if (format === 'csv') {
        const headers = Object.keys(dataToExport[0] || {});
        const csvContent = [
          headers.join(','),
          ...dataToExport.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gastos_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast({
          title: "Exportación completada",
          description: `Se han exportado ${dataToExport.length} gastos`,
        });
      }
    } catch (error) {
      console.error('Error exporting expenses:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar los datos",
        variant: "destructive"
      });
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentExpenses = filteredExpenses.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Gastos</h1>
          <p className="text-slate-600 mt-1">
            {profile?.role === 'ADMIN' 
              ? 'Gestiona y aprueba todos los gastos de la empresa'
              : 'Consulta y gestiona tus gastos'
            }
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => exportExpenses('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="card-dashboard">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  id="search"
                  placeholder="Comercio, empleado..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Estado</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                  <SelectItem value="APPROVED">Aprobados</SelectItem>
                  <SelectItem value="REJECTED">Rechazados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Desde</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Hasta</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({
                  search: '',
                  status: 'ALL',
                  category: 'ALL',
                  employee: 'ALL',
                  dateFrom: '',
                  dateTo: '',
                })}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="card-dashboard">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Gastos ({filteredExpenses.length})
            </CardTitle>
            <div className="text-sm text-slate-600">
              Página {currentPage} de {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  {profile?.role === 'ADMIN' && <TableHead>Empleado</TableHead>}
                  <TableHead>Comercio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {new Date(expense.expense_date).toLocaleDateString('es-ES')}
                      </div>
                    </TableCell>
                    {profile?.role === 'ADMIN' && (
                      <TableCell>{expense.profiles?.name || 'N/A'}</TableCell>
                    )}
                    <TableCell className="font-medium">{expense.vendor}</TableCell>
                    <TableCell>{expense.categories?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Euro className="w-4 h-4 mr-1 text-slate-400" />
                        {expense.amount_gross.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(expense.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedExpense(expense)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {expense.files && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReceipt(expense.files!.id)}
                          >
                            <Receipt className="w-4 h-4" />
                          </Button>
                        )}
                        {profile?.role === 'ADMIN' && expense.status === 'PENDING' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => approveExpense(expense.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setShowRejectDialog(true);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-slate-600">
                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredExpenses.length)} de {filteredExpenses.length} gastos
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Detail Dialog */}
      {selectedExpense && (
        <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle del Gasto</DialogTitle>
              <DialogDescription>
                Información completa del gasto seleccionado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-600">Comercio</Label>
                  <p className="font-medium">{selectedExpense.vendor}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Fecha</Label>
                  <p>{new Date(selectedExpense.expense_date).toLocaleDateString('es-ES')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Empleado</Label>
                  <p>{selectedExpense.profiles?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Categoría</Label>
                  <p>{selectedExpense.categories?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Proyecto</Label>
                  <p>{selectedExpense.project_codes 
                    ? `${selectedExpense.project_codes.code} - ${selectedExpense.project_codes.name}`
                    : 'Sin proyecto'
                  }</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Método de Pago</Label>
                  <p>{getPaymentMethodText(selectedExpense.payment_method)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Importe Neto</Label>
                  <p className="font-medium">
                    {selectedExpense.amount_net.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedExpense.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">IVA</Label>
                  <p>
                    {selectedExpense.tax_vat.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedExpense.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Importe Total</Label>
                  <p className="font-bold text-lg text-primary">
                    {selectedExpense.amount_gross.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedExpense.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Estado</Label>
                  <div>{getStatusBadge(selectedExpense.status)}</div>
                </div>
              </div>
              
              {selectedExpense.notes && (
                <div>
                  <Label className="text-sm font-medium text-slate-600">Notas</Label>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedExpense.notes}</p>
                </div>
              )}

              {selectedExpense.rejection_reason && (
                <div>
                  <Label className="text-sm font-medium text-slate-600">Motivo de Rechazo</Label>
                  <p className="text-sm bg-red-50 p-3 rounded-lg text-red-800">
                    {selectedExpense.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Gasto</AlertDialogTitle>
            <AlertDialogDescription>
              Proporciona un motivo para rechazar este gasto. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Motivo del rechazo</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explica por qué se rechaza este gasto..."
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectionReason('');
              setSelectedExpense(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={rejectExpense}
              className="bg-red-600 hover:bg-red-700"
            >
              Rechazar Gasto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Expenses;