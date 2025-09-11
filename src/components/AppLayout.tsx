import { Routes, Route, Navigate, Outlet, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import Expenses from "@/pages/Expenses";
import UploadExpense from "@/pages/UploadExpense";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import Employees from "@/pages/Employees";
import NotFound from "@/pages/NotFound";

export function AppLayout() {
  const { profile } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 flex items-center justify-between px-6 border-b bg-background">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2" />
              
              <div className="relative w-96 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar gastos, comercios..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button asChild>
                <Link to="/upload">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Gasto
                </Link>
              </Button>
              
              <div className="relative">
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center p-0"
                >
                  3
                </Badge>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/upload" element={<UploadExpense />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}