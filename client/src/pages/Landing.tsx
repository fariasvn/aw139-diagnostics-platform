import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench, Shield, Clock, Users, ChevronRight, Brain, History, Settings2, Plane, Search, CalendarCheck, FileCheck } from "lucide-react";

interface LandingProps {
  onNavigateToLogin?: () => void;
  isVPS?: boolean;
}

export default function Landing({ onNavigateToLogin, isVPS }: LandingProps) {
  const handleLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      window.location.href = "/api/login";
    }
  };

  if (isVPS) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <header className="container mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Plane className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold" data-testid="text-app-title">AW139 Smart Troubleshooting</span>
          </div>
          <Button onClick={handleLogin} data-testid="button-login-header">
            Sign In
          </Button>
        </header>

        <main className="container mx-auto px-6 py-12">
          <section className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-hero-title">
              Intelligent Diagnostics for Helicopter Maintenance
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8" data-testid="text-hero-description">
              AI system with 3 specialized agents and over 22,000 embedded documents. 
              Reduce diagnostic time, improve accuracy, and ensure safety with intelligent analysis.
            </p>
            <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
              Access the System <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </section>

          <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <Card className="hover-elevate" data-testid="card-feature-ai">
              <CardHeader>
                <Brain className="w-10 h-10 text-primary mb-2" />
                <CardTitle>3 AI Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Investigator, Validator and Supervisor analyze the problem like a team of engineers, 
                  cross-referencing IETP, AMP and AWDP diagrams
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-safety">
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Safety Threshold</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  95% minimum certainty to proceed. Below that, the system automatically 
                  recommends consultation with MCC specialist
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-deep-analysis">
              <CardHeader>
                <Search className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Deep System Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  When the fault is not in the manual, the AI analyzes AWDP diagrams, 
                  maps signal paths and deduces probable causes
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-config">
              <CardHeader>
                <Settings2 className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Automatic Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatic SN/LN/ENH/PLUS detection by serial number, with 
                  544 IPD effectivity codes for part verification
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-history">
              <CardHeader>
                <History className="w-10 h-10 text-primary mb-2" />
                <CardTitle>History & Shift Handover</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Shared history across shifts. Smart search and filters 
                  to scale to hundreds of records without losing information
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-maintenance">
              <CardHeader>
                <CalendarCheck className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Scheduled Maintenance</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Smart ATA-based alerts that inform current diagnostics, 
                  with complete maintenance logging and Part ON/OFF tracking
                </CardDescription>
              </CardContent>
            </Card>
          </section>

          <section className="grid md:grid-cols-2 gap-6 mb-16">
            <Card className="hover-elevate" data-testid="card-feature-experts">
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-2" />
                <CardTitle>MCC Expert Support</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Expert availability system with profiles, 
                  direct contact via WhatsApp for chat and video calls
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-tools">
              <CardHeader>
                <Wrench className="w-10 h-10 text-primary mb-2" />
                <CardTitle>DMC Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatic selection of crimping, insertion and extraction tools 
                  by connector type, with safety warnings
                </CardDescription>
              </CardContent>
            </Card>
          </section>

          <section className="text-center bg-muted rounded-md p-12 mb-8">
            <FileCheck className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4" data-testid="text-cta-title">
              The professional may leave, the knowledge stays!
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Even when the exact fault is not described in the manual, if you understand how the system works, 
              you can deduce what could cause the problem. That is exactly what we taught the AI.
            </p>
            <Button size="lg" onClick={handleLogin} data-testid="button-sign-in-bottom">
              Sign In Now
            </Button>
          </section>
        </main>

        <footer className="container mx-auto px-6 py-8 text-center text-muted-foreground text-sm">
          AW139 Smart Troubleshooting Assistant - Enterprise Edition
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <header className="container mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wrench className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold">AW139 Smart Troubleshooting</span>
        </div>
        <Button onClick={handleLogin} data-testid="button-login">
          Sign In
        </Button>
      </header>

      <main className="container mx-auto px-6 py-16">
        <section className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            AI-Powered Helicopter Maintenance
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Intelligent diagnostics for AW139 helicopter maintenance. 
            Reduce downtime, improve accuracy, and ensure safety with AI-driven analysis.
          </p>
          <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
            Get Started <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <Card className="hover-elevate">
            <CardHeader>
              <Shield className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Safety First</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                95% certainty threshold ensures expert validation for critical diagnostics
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <Clock className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Faster Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                AI-powered analysis reduces diagnostic time with 22,661 embedded documents
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <Wrench className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Complete Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                DMC tool selection, mechanic logs, and part tracking all in one place
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <Users className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Expert Support</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect with specialists when AI confidence is below safety threshold
              </CardDescription>
            </CardContent>
          </Card>
        </section>

        <section className="text-center bg-muted rounded-md p-12">
          <h2 className="text-2xl font-bold mb-4">Ready to transform your maintenance workflow?</h2>
          <p className="text-muted-foreground mb-8">
            Sign in with your email to access the diagnostic assistant
          </p>
          <Button size="lg" onClick={handleLogin} data-testid="button-sign-in-bottom">
            Sign In Now
          </Button>
        </section>
      </main>

      <footer className="container mx-auto px-6 py-8 text-center text-muted-foreground text-sm">
        AW139 Smart Troubleshooting Assistant - Enterprise Edition
      </footer>
    </div>
  );
}
