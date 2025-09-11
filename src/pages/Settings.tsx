import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Euro, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  budget_monthly?: number;
}

interface ProjectCode {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function Settings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [projectCodes, setProjectCodes] = useState<ProjectCode[]>([]);
  const [settings, setSettings] = useState({
    darkMode: false,
    language: 'Español',
    timezone: 'Europe/Madrid',
    baseCurrency: 'EUR',
    defaultVat: 21,
    autoApprovalLimit: 100,
    sandboxMode: false
  });
  const [newCategory, setNewCategory] = useState({ name: '', budget: '' });
  const [newProject, setNewProject] = useState({ code: '', name: '' });
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
    loadProjectCodes();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('name');

    if (error) {
      console.error('Error loading categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const loadProjectCodes = async () => {
    const { data, error } = await supabase
      .from('project_codes')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('code');

    if (error) {
      console.error('Error loading project codes:', error);
      return;
    }

    setProjectCodes(data || []);
  };

  const addCategory = async () => {
    if (!newCategory.name.trim()) return;

    const { error } = await supabase
      .from('categories')
      .insert({
        name: newCategory.name.trim(),
        budget_monthly: newCategory.budget ? parseFloat(newCategory.budget) : null,
        status: 'ACTIVE'
      });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo añadir la categoría",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Éxito",
      description: "Categoría añadida correctamente"
    });

    setNewCategory({ name: '', budget: '' });
    setCategoryDialogOpen(false);
    loadCategories();
  };

  const addProject = async () => {
    if (!newProject.code.trim() || !newProject.name.trim()) return;

    const { error } = await supabase
      .from('project_codes')
      .insert({
        code: newProject.code.trim().toUpperCase(),
        name: newProject.name.trim(),
        status: 'ACTIVE'
      });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo añadir el proyecto",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Éxito", 
      description: "Proyecto añadido correctamente"
    });

    setNewProject({ code: '', name: '' });
    setProjectDialogOpen(false);
    loadProjectCodes();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">
          Personaliza las preferencias del sistema y configuración financiera
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Preferencias Generales */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-4">
            <SettingsIcon className="w-5 h-5 mr-2" />
            <CardTitle>Preferencias Generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Tema Oscuro</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Alternar entre tema claro y oscuro
                </span>
                <Switch 
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, darkMode: checked }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Idioma</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, language: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Español">Español</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Français">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Zona Horaria</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, timezone: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Configuración Financiera */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-4">
            <Euro className="w-5 h-5 mr-2" />
            <CardTitle>Configuración Financiera</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Moneda Base</Label>
              <Select
                value={settings.baseCurrency}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, baseCurrency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>IVA por Defecto (%)</Label>
              <Input
                type="number"
                value={settings.defaultVat}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, defaultVat: Number(e.target.value) }))
                }
                min="0"
                max="100"
              />
            </div>

            <div className="space-y-2">
              <Label>Límite Aprobación Automática (€)</Label>
              <Input
                type="number"
                value={settings.autoApprovalLimit}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, autoApprovalLimit: Number(e.target.value) }))
                }
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Gastos menores a este importe se aprueban automáticamente
              </p>
            </div>

            <div className="space-y-2">
              <Label>Modo Sandbox</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Activar para pruebas sin facturación real
                </span>
                <Switch 
                  checked={settings.sandboxMode}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, sandboxMode: checked }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gestión de Categorías */}
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Categorías Activas</h3>
                <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Añadir
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nueva Categoría</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input
                          value={newCategory.name}
                          onChange={(e) => 
                            setNewCategory(prev => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="Ej: Software, Viajes..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Presupuesto mensual (opcional)</Label>
                        <Input
                          type="number"
                          value={newCategory.budget}
                          onChange={(e) => 
                            setNewCategory(prev => ({ ...prev, budget: e.target.value }))
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <Button onClick={addCategory} className="w-full">
                        Crear Categoría
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between py-2 px-3 border rounded-lg">
                    <span>{category.name}</span>
                    <Button variant="ghost" size="sm">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Códigos de Proyecto */}
        <Card>
          <CardHeader>
            <CardTitle>Códigos de Proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Proyectos Activos</h3>
                <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Añadir Proyecto
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuevo Proyecto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Código</Label>
                        <Input
                          value={newProject.code}
                          onChange={(e) => 
                            setNewProject(prev => ({ ...prev, code: e.target.value }))
                          }
                          placeholder="PRJ-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input
                          value={newProject.name}
                          onChange={(e) => 
                            setNewProject(prev => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="Proyecto General"
                        />
                      </div>
                      <Button onClick={addProject} className="w-full">
                        Crear Proyecto
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="space-y-2">
                {projectCodes.map((project) => (
                  <div key={project.id} className="flex items-center justify-between py-2 px-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{project.code}</div>
                      <div className="text-xs text-muted-foreground">{project.name}</div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}