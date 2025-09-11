import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Pencil, MoreHorizontal, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Employee {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE';
  department?: string;
  region?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

const KPI_CARDS = [
  { title: "Total Empleados", value: "0", icon: Users },
  { title: "Gastos Registrados", value: "0", icon: Users },
  { title: "Gasto Total", value: "€0", icon: Users },
  { title: "Promedio por Empleado", value: "€0", icon: Users },
];

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    name: '',
    role: 'EMPLOYEE' as 'ADMIN' | 'EMPLOYEE',
    department: '',
    region: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addEmployee = async () => {
    if (!newEmployee.email || !newEmployee.name) {
      toast({
        title: "Error",
        description: "Email y nombre son obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real app, you would create the auth user first
      // For now, we'll just show a message
      toast({
        title: "Información",
        description: "La creación de empleados requiere configuración adicional de autenticación",
        variant: "default"
      });
      
      setDialogOpen(false);
      setNewEmployee({
        email: '',
        name: '',
        role: 'EMPLOYEE',
        department: '',
        region: ''
      });
    } catch (error) {
      console.error('Error creating employee:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el empleado",
        variant: "destructive"
      });
    }
  };

  const toggleEmployeeStatus = async (employeeId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', employeeId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Empleado ${newStatus === 'ACTIVE' ? 'activado' : 'desactivado'} correctamente`
      });

      loadEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del empleado",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Empleados</h1>
          <p className="text-muted-foreground">
            Gestión de empleados y permisos del sistema
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Empleado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => 
                    setNewEmployee(prev => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="empleado@empresa.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input
                  value={newEmployee.name}
                  onChange={(e) => 
                    setNewEmployee(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Juan Pérez"
                />
              </div>

              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={newEmployee.role}
                  onValueChange={(value: 'ADMIN' | 'EMPLOYEE') => 
                    setNewEmployee(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Empleado</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input
                  value={newEmployee.department}
                  onChange={(e) => 
                    setNewEmployee(prev => ({ ...prev, department: e.target.value }))
                  }
                  placeholder="Finanzas, Marketing, IT..."
                />
              </div>

              <div className="space-y-2">
                <Label>Región</Label>
                <Input
                  value={newEmployee.region}
                  onChange={(e) => 
                    setNewEmployee(prev => ({ ...prev, region: e.target.value }))
                  }
                  placeholder="Madrid, Barcelona..."
                />
              </div>

              <Button onClick={addEmployee} className="w-full">
                Crear Empleado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {KPI_CARDS.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {index === 0 ? employees.length : kpi.value}
                  </p>
                </div>
                <kpi.icon className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Empleados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Región</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Gastos (#)</TableHead>
                <TableHead>Total (€)</TableHead>
                <TableHead>Este mes (€)</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {employee.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.department || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={employee.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {employee.role === 'ADMIN' ? 'Administrador' : 'Empleado'}
                    </Badge>
                  </TableCell>
                  <TableCell>{employee.region || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={employee.status === 'ACTIVE' ? 'default' : 'destructive'}>
                      {employee.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>0</TableCell>
                  <TableCell>€0</TableCell>
                  <TableCell>€0</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleEmployeeStatus(employee.id, employee.status)}
                        >
                          {employee.status === 'ACTIVE' ? (
                            <>
                              <UserX className="w-4 h-4 mr-2" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Activar
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}