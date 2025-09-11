-- Create a security definer function to get current user role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Drop existing problematic policies for profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policies using the security definer function
CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE 
USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT 
USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

-- Drop and recreate problematic policies for categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Everyone can view active categories" ON public.categories;

CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL 
USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Everyone can view active categories" ON public.categories
FOR SELECT 
USING (status = 'ACTIVE');

-- Drop and recreate problematic policies for project_codes
DROP POLICY IF EXISTS "Admins can manage project codes" ON public.project_codes;
DROP POLICY IF EXISTS "Everyone can view active project codes" ON public.project_codes;

CREATE POLICY "Admins can manage project codes" ON public.project_codes
FOR ALL 
USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Everyone can view active project codes" ON public.project_codes
FOR SELECT 
USING (status = 'ACTIVE');

-- Drop and recreate problematic policies for expenses
DROP POLICY IF EXISTS "Admins can update all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;

CREATE POLICY "Admins can update all expenses" ON public.expenses
FOR UPDATE 
USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Admins can view all expenses" ON public.expenses
FOR SELECT 
USING (public.get_current_user_role() = 'ADMIN');

-- Drop and recreate problematic policies for files  
DROP POLICY IF EXISTS "Admins can view all files" ON public.files;

CREATE POLICY "Admins can view all files" ON public.files
FOR SELECT 
USING (public.get_current_user_role() = 'ADMIN');

-- Drop and recreate problematic policies for audit_logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
FOR SELECT 
USING (public.get_current_user_role() = 'ADMIN');

-- Update the handle_new_user function to create users as ADMIN by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'ADMIN'::app_role  -- All new users are created as ADMIN
  );
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END
$$;