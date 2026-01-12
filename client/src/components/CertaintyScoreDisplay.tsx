import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface CertaintyScoreDisplayProps {
  score: number;
  status: "SAFE_TO_PROCEED" | "REQUIRE_EXPERT";
}

export default function CertaintyScoreDisplay({ score, status }: CertaintyScoreDisplayProps) {
  const isSafe = status === "SAFE_TO_PROCEED";
  
  return (
    <Card className="overflow-visible" data-testid="card-certainty-score">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-xl font-semibold">Certainty Score</h3>
              <Badge 
                variant={isSafe ? "default" : "destructive"}
                className="text-xs uppercase tracking-wide"
                data-testid="badge-certainty-status"
              >
                {isSafe ? "Safe to Proceed" : "Expert Required"}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confidence Level</span>
                <span className="text-2xl font-semibold font-mono" data-testid="text-certainty-score">{score}%</span>
              </div>
              <Progress value={score} className="h-3" data-testid="progress-certainty" />
            </div>
            
            <div className="mt-4 flex items-start gap-2 text-sm">
              {isSafe ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    High confidence diagnosis based on validated documentation and historical data.
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    Certainty below 95% threshold. Expert consultation recommended for safety-critical diagnostics.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
