import { useState } from "react";
import { 
  LayoutDashboard, 
  Receipt, 
  Upload, 
  BarChart3, 
  Users, 
  Settings,
  ChevronRight
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Gastos", url: "/expenses", icon: Receipt },
  { title: "Subir Ticket", url: "/upload", icon: Upload },
  { title: "Análisis", url: "/analytics", icon: BarChart3 },
  { title: "Empleados", url: "/employees", icon: Users },
  { title: "Configuración", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, profile } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Receipt className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-semibold text-lg">ExpenseFlow</h1>
              <p className="text-xs text-muted-foreground">Gestión de Gastos</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => 
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {!collapsed && isActive(item.url) && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src="" />
            <AvatarFallback className="bg-muted text-xs">
              {profile?.name?.substring(0, 2).toUpperCase() || "JD"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {profile?.name || "Juan Director"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Director Financiero
              </p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}