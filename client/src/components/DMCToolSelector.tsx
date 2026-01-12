import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wrench, AlertTriangle } from "lucide-react";

interface DMCTool {
  connectorType: string;
  pinType: string;
  crimpTool: string;
  insertTool?: string;
  extractTool?: string;
  crimpForce?: string;
  safetyWarnings?: string;
  status?: "exact_match" | "partial_match";
}

interface DMCToolSelectorProps {
  tool: DMCTool;
}

export default function DMCToolSelector({ tool }: DMCToolSelectorProps) {
  return (
    <Card data-testid="card-dmc-tool">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">DMC Wiring Tool Selection</CardTitle>
        <Badge variant={tool.status === "exact_match" ? "default" : "secondary"} className="text-xs uppercase tracking-wide">
          {tool.status === "exact_match" ? "Exact Match" : "Partial Match"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Connector Type</p>
            <p className="text-sm font-mono font-semibold" data-testid="text-connector-type">{tool.connectorType}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pin Type</p>
            <p className="text-sm font-mono font-semibold" data-testid="text-pin-type">{tool.pinType}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
            <Wrench className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Crimp Tool</p>
              <p className="text-sm font-semibold" data-testid="text-crimp-tool">{tool.crimpTool}</p>
              {tool.crimpForce && (
                <p className="text-xs text-muted-foreground font-mono">Force: {tool.crimpForce}</p>
              )}
            </div>
          </div>

          {tool.insertTool && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
              <Wrench className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Insert Tool</p>
                <p className="text-sm font-semibold">{tool.insertTool}</p>
              </div>
            </div>
          )}

          {tool.extractTool && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
              <Wrench className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Extract Tool</p>
                <p className="text-sm font-semibold">{tool.extractTool}</p>
              </div>
            </div>
          )}
        </div>

        {tool.safetyWarnings && (
          <Alert variant="destructive" data-testid="alert-safety-warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm leading-relaxed">
              {tool.safetyWarnings}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
