import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Camera, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  X,
  Eye,
  Receipt,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ExtractedData {
  vendor: string;
  expense_date: string;
  amount_gross: number;
  tax_vat: number;
  amount_net: number;
  currency: string;
  category_suggestion: string;
  payment_method_guess: string;
  project_code_guess?: string;
  notes?: string;
}

interface Category {
  id: string;
  name: string;
}

interface ProjectCode {
  id: string;
  code: string;
  name: string;
}

const ExpenseUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projectCodes, setProjectCodes] = useState<ProjectCode[]>([]);
  const [formData, setFormData] = useState({
    vendor: '',
    expense_date: '',
    amount_net: '',
    tax_vat: '',
    amount_gross: '',
    currency: 'EUR',
    category_id: '',
    project_code_id: '',
    payment_method: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
    loadProjectCodes();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProjectCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('project_codes')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('code');

      if (error) throw error;
      setProjectCodes(data || []);
    } catch (error) {
      console.error('Error loading project codes:', error);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Tipo de archivo no válido",
        description: "Solo se permiten archivos JPG, PNG y PDF",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: "El tamaño máximo permitido es 10MB",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const analyzeReceipt = async () => {
    if (!file) return;

    setAnalyzing(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload file first
      const formData = new FormData();
      formData.append('file', file);

      const response = await supabase.functions.invoke('analyze-receipt', {
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { data: result } = response;
      
      if (result.success && result.data) {
        setExtractedData(result.data);
        // Pre-fill form with extracted data
        setFormData(prev => ({
          ...prev,
          vendor: result.data.vendor || '',
          expense_date: result.data.expense_date || '',
          amount_net: result.data.amount_net?.toString() || '',
          tax_vat: result.data.tax_vat?.toString() || '',
          amount_gross: result.data.amount_gross?.toString() || '',
          currency: result.data.currency || 'EUR',
          payment_method: result.data.payment_method_guess || '',
          notes: result.data.notes || ''
        }));

        // Find matching category
        const matchingCategory = categories.find(cat => 
          cat.name.toLowerCase() === result.data.category_suggestion?.toLowerCase()
        );
        if (matchingCategory) {
          setFormData(prev => ({ ...prev, category_id: matchingCategory.id }));
        }

        // Find matching project code
        if (result.data.project_code_guess) {
          const matchingProject = projectCodes.find(proj => 
            proj.code.toLowerCase() === result.data.project_code_guess?.toLowerCase()
          );
          if (matchingProject) {
            setFormData(prev => ({ ...prev, project_code_id: matchingProject.id }));
          }
        }

        toast({
          title: "¡Análisis completado!",
          description: "Los datos del ticket han sido extraídos automáticamente",
        });
      } else {
        throw new Error(result.error || 'Error analizando el ticket');
      }
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      toast({
        title: "Error en el análisis",
        description: "No se pudo analizar el ticket. Completa los datos manualmente.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
      setProgress(0);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendor.trim()) {
      newErrors.vendor = 'El comercio es requerido';
    }

    if (!formData.expense_date) {
      newErrors.expense_date = 'La fecha es requerida';
    }

    if (!formData.amount_gross || parseFloat(formData.amount_gross) <= 0) {
      newErrors.amount_gross = 'El importe total debe ser mayor a 0';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'La categoría es requerida';
    }

    if (!formData.payment_method) {
      newErrors.payment_method = 'El método de pago es requerido';
    }

    // Validate financial coherence
    const gross = parseFloat(formData.amount_gross) || 0;
    const net = parseFloat(formData.amount_net) || 0;
    const vat = parseFloat(formData.tax_vat) || 0;

    if (Math.abs((net + vat) - gross) > 0.01) {
      newErrors.amount_gross = 'Los importes no cuadran: Neto + IVA debe igualar el Total';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveExpense = async () => {
    if (!validateForm()) {
      toast({
        title: "Errores en el formulario",
        description: "Por favor, corrige los errores marcados",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      let fileId = null;

      // Upload file to storage if present
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `receipts/${session.user.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save file record
        const { data: fileData, error: fileError } = await supabase
          .from('files')
          .insert({
            original_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            storage_key: uploadData.path,
            checksum_sha256: 'placeholder', // Would compute actual hash in production
            uploaded_by: session.user.id
          })
          .select()
          .single();

        if (fileError) throw fileError;
        fileId = fileData.id;
      }

      // Create expense record
      const expenseData = {
        employee_id: session.user.id,
        vendor: formData.vendor.trim(),
        expense_date: formData.expense_date,
        amount_net: parseFloat(formData.amount_net) || 0,
        tax_vat: parseFloat(formData.tax_vat) || 0,
        amount_gross: parseFloat(formData.amount_gross),
        currency: formData.currency,
        category_id: formData.category_id,
        project_code_id: formData.project_code_id && formData.project_code_id !== 'none' ? formData.project_code_id : null,
        payment_method: formData.payment_method as 'CARD' | 'CASH' | 'TRANSFER' | 'OTHER',
        notes: formData.notes || null,
        receipt_file_id: fileId,
        source: (extractedData ? 'AI_EXTRACTED' : 'MANUAL') as 'AI_EXTRACTED' | 'MANUAL',
        status: 'PENDING' as 'PENDING'
      };

      const { error: expenseError } = await supabase
        .from('expenses')
        .insert(expenseData);

      if (expenseError) throw expenseError;

      toast({
        title: "¡Gasto guardado!",
        description: "El gasto ha sido registrado y está pendiente de aprobación",
      });

      // Reset form
      setFile(null);
      setPreview('');
      setExtractedData(null);
      setFormData({
        vendor: '',
        expense_date: '',
        amount_net: '',
        tax_vat: '',
        amount_gross: '',
        currency: 'EUR',
        category_id: '',
        project_code_id: '',
        payment_method: '',
        notes: ''
      });
      setErrors({});

    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error guardando gasto",
        description: "No se pudo guardar el gasto. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card className="card-dashboard">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2 text-primary" />
            Subir Ticket o Factura
          </CardTitle>
          <CardDescription>
            Arrastra un archivo o haz clic para seleccionar. Formatos: JPG, PNG, PDF (máx. 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileInput}
              className="hidden"
            />
            
            {file ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <FileText className="w-16 h-16 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {preview && (
                  <div className="mt-4">
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="max-w-xs max-h-48 mx-auto rounded-lg shadow-md"
                    />
                  </div>
                )}
                <div className="flex justify-center space-x-2">
                  <Button
                    onClick={analyzeReceipt}
                    disabled={analyzing}
                    className="btn-corporate"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analizar con IA
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setPreview('');
                      setExtractedData(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Quitar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-slate-700">
                    Arrastra tu ticket aquí o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-slate-500">
                    JPG, PNG, PDF hasta 10MB
                  </p>
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="mr-2">
                    <Upload className="w-4 h-4 mr-2" />
                    Seleccionar Archivo
                  </Button>
                  <Button variant="outline">
                    <Camera className="w-4 h-4 mr-2" />
                    Tomar Foto
                  </Button>
                </div>
              </>
            )}
          </div>

          {analyzing && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Analizando ticket con IA...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {extractedData && (
            <Alert className="mt-4 border-success bg-success/5">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                ¡Datos extraídos correctamente! Revisa y edita si es necesario antes de guardar.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Expense Form */}
      <Card className="card-dashboard">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary" />
            Detalles del Gasto
          </CardTitle>
          <CardDescription>
            {extractedData ? 'Datos extraídos automáticamente - Revisa y edita si es necesario' : 'Completa los datos del gasto manualmente'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Comercio / Proveedor *</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                placeholder="Nombre del comercio"
                className={errors.vendor ? 'border-destructive' : ''}
              />
              {errors.vendor && (
                <p className="text-sm text-destructive">{errors.vendor}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense_date">Fecha del Gasto *</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                className={errors.expense_date ? 'border-destructive' : ''}
              />
              {errors.expense_date && (
                <p className="text-sm text-destructive">{errors.expense_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_net">Importe Neto (€)</Label>
              <Input
                id="amount_net"
                type="number"
                step="0.01"
                value={formData.amount_net}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_net: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_vat">IVA (€)</Label>
              <Input
                id="tax_vat"
                type="number"
                step="0.01"
                value={formData.tax_vat}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_vat: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_gross">Importe Total *</Label>
              <Input
                id="amount_gross"
                type="number"
                step="0.01"
                value={formData.amount_gross}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_gross: e.target.value }))}
                placeholder="0.00"
                className={errors.amount_gross ? 'border-destructive' : ''}
              />
              {errors.amount_gross && (
                <p className="text-sm text-destructive">{errors.amount_gross}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
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
              <Label htmlFor="category">Categoría *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger className={errors.category_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-destructive">{errors.category_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_code">Código de Proyecto</Label>
              <Select
                value={formData.project_code_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, project_code_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proyecto (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proyecto</SelectItem>
                  {projectCodes.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pago *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger className={errors.payment_method ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecciona método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CARD">Tarjeta</SelectItem>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
              {errors.payment_method && (
                <p className="text-sm text-destructive">{errors.payment_method}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Descripción adicional del gasto..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setFormData({
                  vendor: '',
                  expense_date: '',
                  amount_net: '',
                  tax_vat: '',
                  amount_gross: '',
                  currency: 'EUR',
                  category_id: '',
                  project_code_id: '',
                  payment_method: '',
                  notes: ''
                });
                setErrors({});
                setExtractedData(null);
              }}
            >
              Limpiar Formulario
            </Button>
            <Button
              onClick={saveExpense}
              disabled={uploading}
              className="btn-corporate"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Guardar Gasto
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseUpload;