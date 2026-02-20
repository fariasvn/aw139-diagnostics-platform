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
            Entrar
          </Button>
        </header>

        <main className="container mx-auto px-6 py-12">
          <section className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-hero-title">
              Diagnóstico Inteligente para Manutenção de Helicópteros
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8" data-testid="text-hero-description">
              Sistema de IA com 3 agentes especializados e mais de 22.000 documentos embarcados. 
              Reduza o tempo de diagnóstico, aumente a precisão e garanta a segurança com análise inteligente.
            </p>
            <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
              Acessar o Sistema <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </section>

          <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <Card className="hover-elevate" data-testid="card-feature-ai">
              <CardHeader>
                <Brain className="w-10 h-10 text-primary mb-2" />
                <CardTitle>3 Agentes de IA</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Investigador, Validador e Supervisor analisam o problema como uma equipe de engenheiros, 
                  cruzando dados de IETP, AMP e diagramas AWDP
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-safety">
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Threshold de Segurança</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Certeza mínima de 95% para prosseguir. Abaixo disso, o sistema recomenda 
                  consulta ao especialista do MCC automaticamente
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-deep-analysis">
              <CardHeader>
                <Search className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Análise Profunda de Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Quando a falha não está no manual, a IA analisa diagramas AWDP, 
                  mapeia caminhos de sinal e deduz causas prováveis
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-config">
              <CardHeader>
                <Settings2 className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Configuração Automática</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Detecção automática de SN/LN/ENH/PLUS pelo serial number, com 
                  544 códigos IPD de efetividade para verificação de peças
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-history">
              <CardHeader>
                <History className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Histórico e Shift Handover</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Histórico compartilhado entre turnos. Busca e filtro inteligente 
                  para escalar a centenas de registros sem perder informação
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-maintenance">
              <CardHeader>
                <CalendarCheck className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Manutenção Programada</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Alertas inteligentes por ATA que informam o diagnóstico atual, 
                  com registro completo de manutenções e Part ON/OFF
                </CardDescription>
              </CardContent>
            </Card>
          </section>

          <section className="grid md:grid-cols-2 gap-6 mb-16">
            <Card className="hover-elevate" data-testid="card-feature-experts">
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Suporte de Especialistas MCC</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Sistema de disponibilidade de especialistas com perfis, 
                  contato direto via WhatsApp para chat e chamadas de vídeo
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-feature-tools">
              <CardHeader>
                <Wrench className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Ferramentas DMC</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Seleção automática de ferramentas de crimpagem, 
                  inserção e extração por tipo de conector, com avisos de segurança
                </CardDescription>
              </CardContent>
            </Card>
          </section>

          <section className="text-center bg-muted rounded-md p-12 mb-8">
            <FileCheck className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4" data-testid="text-cta-title">
              O profissional pode sair, o conhecimento fica!
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Mesmo quando a falha exata não está descrita no manual, se você entende como o sistema funciona, 
              consegue deduzir o que pode causar o problema. Foi exatamente isso que ensinamos à IA.
            </p>
            <Button size="lg" onClick={handleLogin} data-testid="button-sign-in-bottom">
              Entrar no Sistema
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
