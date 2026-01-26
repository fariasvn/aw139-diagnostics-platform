import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench, Shield, Clock, Users, ChevronRight } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
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

        <section className="text-center bg-muted rounded-2xl p-12">
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
