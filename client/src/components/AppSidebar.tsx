import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Home, FileText, History, Wrench, Settings, Plane, Package, BarChart3, AlertTriangle, LogOut, UserCog, Users, BookOpen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import QuotaIndicator from "./QuotaIndicator";
import type { User } from "@shared/schema";

const menuItems = [
  { title: "Dashboard", icon: Home, url: "/" },
  { title: "Scheduled Maintenance", icon: Package, url: "/maintenance" },
  { title: "Historical Troubleshooting", icon: History, url: "/troubleshooting-history" },
  { title: "Fleet Unavailability", icon: AlertTriangle, url: "/fleet-unavailability" },
  { title: "Smart Inventory", icon: BarChart3, url: "/smart-inventory" },
  { title: "IPD Part Checker", icon: BookOpen, url: "/ipd-checker" },
  { title: "DMC Tools", icon: Wrench, url: "/tools" },
  { title: "Settings", icon: Settings, url: "/settings" },
];

const adminItems = [
  { title: "MCC Experts", icon: UserCog, url: "/admin/experts" },
  { title: "Manage Users", icon: Users, url: "/admin/users" },
];

interface AppSidebarProps {
  planType?: "BASIC" | "ENTERPRISE";
  remaining?: number;
  user?: User;
}

export default function AppSidebar({ planType = "BASIC", remaining = 3, user }: AppSidebarProps) {
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/";
    } catch (error) {
      window.location.href = "/api/logout";
    }
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.email || "User";
  };

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary">
            <Plane className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AW139 Diagnostics</h2>
            <p className="text-xs text-muted-foreground">Smart Troubleshooting</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}>
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide">Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}>
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-4">
        {user && (
          <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent/50">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImageUrl || undefined} alt={getUserDisplayName()} />
              <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-user-name">
                {getUserDisplayName()}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="h-8 w-8"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
        <QuotaIndicator planType={planType} remaining={remaining} />
      </SidebarFooter>
    </Sidebar>
  );
}
