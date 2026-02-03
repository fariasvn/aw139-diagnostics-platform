import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import DisclaimerModal from "@/components/DisclaimerModal";
import Dashboard from "@/pages/Dashboard";
import ScheduledMaintenance from "@/pages/ScheduledMaintenance";
import HistoricalTroubleshooting from "@/pages/HistoricalTroubleshooting";
import FleetUnavailability from "@/pages/FleetUnavailability";
import SmartInventory from "@/pages/SmartInventory";
import AdminExperts from "@/pages/AdminExperts";
import Settings from "@/pages/Settings";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function AuthenticatedApp() {
  const { user } = useAuth();
  
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <>
      <DisclaimerModal />
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar 
            planType={(user?.planType as "BASIC" | "ENTERPRISE") || "BASIC"} 
            remaining={5 - (user?.dailyRequestCount || 0)}
            user={user}
          />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b border-border">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto p-8">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/maintenance" component={ScheduledMaintenance} />
                <Route path="/troubleshooting-history" component={HistoricalTroubleshooting} />
                <Route path="/fleet-unavailability" component={FleetUnavailability} />
                <Route path="/smart-inventory" component={SmartInventory} />
                <Route path="/admin/experts" component={AdminExperts} />
                <Route path="/settings" component={Settings} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // VPS/Production mode: bypass authentication for self-hosted deployments
  const isVPSMode = typeof window !== 'undefined' && 
    !window.location.hostname.includes('replit');

  if (isLoading && !isVPSMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show Landing only on Replit when not authenticated
  if (!isAuthenticated && !isVPSMode) {
    return <Landing />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
