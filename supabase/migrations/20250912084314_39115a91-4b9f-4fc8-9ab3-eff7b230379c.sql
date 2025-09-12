-- Configurar políticas de seguridad mejoradas

-- 1. Actualizar función de actualización de timestamp para ser más segura
CREATE OR REPLACE FUNCTION public.secure_update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo actualizar si hay cambios reales
  IF OLD IS DISTINCT FROM NEW THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Crear trigger para audit logs automáticos en expenses
CREATE OR REPLACE FUNCTION public.log_expense_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar log de auditoría
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity,
    entity_id,
    action,
    metadata,
    ip_address
  ) VALUES (
    auth.uid(),
    'expenses',
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'CREATE'
      WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
      WHEN TG_OP = 'DELETE' THEN 'DELETE'
    END,
    jsonb_build_object(
      'old_status', CASE WHEN TG_OP != 'INSERT' THEN OLD.status END,
      'new_status', CASE WHEN TG_OP != 'DELETE' THEN NEW.status END,
      'amount', CASE WHEN TG_OP != 'DELETE' THEN NEW.amount_gross END
    ),
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Aplicar trigger de auditoría a expenses
DROP TRIGGER IF EXISTS audit_expense_changes ON public.expenses;
CREATE TRIGGER audit_expense_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION log_expense_changes();

-- 4. Crear función para validar roles de manera segura
CREATE OR REPLACE FUNCTION public.validate_user_role()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo admins pueden cambiar roles
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    IF get_current_user_role() != 'ADMIN' THEN
      RAISE EXCEPTION 'Solo los administradores pueden cambiar roles de usuario';
    END IF;
  END IF;
  
  -- Validar que siempre haya al menos un admin
  IF NEW.role != 'ADMIN' OR TG_OP = 'DELETE' THEN
    IF (SELECT COUNT(*) FROM profiles WHERE role = 'ADMIN' AND id != NEW.id) < 1 THEN
      RAISE EXCEPTION 'Debe existir al menos un administrador en el sistema';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Aplicar validación de roles
DROP TRIGGER IF EXISTS validate_profile_role ON public.profiles;
CREATE TRIGGER validate_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION validate_user_role();

-- 6. Política adicional para prevenir acceso directo a archivos
CREATE POLICY "Users can only access files linked to their expenses" 
ON public.files 
FOR SELECT 
USING (
  uploaded_by = auth.uid() OR 
  get_current_user_role() = 'ADMIN' OR
  EXISTS (
    SELECT 1 FROM expenses 
    WHERE receipt_file_id = files.id 
    AND employee_id = auth.uid()
  )
);

-- 7. Función para limpiar sesiones inactivas (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marcar usuarios inactivos por más de 90 días
  UPDATE profiles 
  SET status = 'INACTIVE'
  WHERE status = 'ACTIVE' 
    AND updated_at < now() - interval '90 days'
    AND role != 'ADMIN';
END;
$$;