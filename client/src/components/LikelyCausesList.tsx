import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";

interface LikelyCause {
  cause: string;
  probability: number;
  reasoning: string;
  ataCode?: string;
}

interface LikelyCausesListProps {
  causes: LikelyCause[];
}

export default function LikelyCausesList({ causes }: LikelyCausesListProps) {
  return (
    <Card data-testid="card-likely-causes">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Likely Causes</CardTitle>
        <Badge variant="outline" className="font-mono text-xs">
          <TrendingUp className="w-3 h-3 mr-1" />
          Probability Ranked
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {causes.map((cause, index) => (
            <div 
              key={index} 
              className="space-y-3 p-4 rounded-md border bg-card hover-elevate"
              data-testid={`cause-${index}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold">{cause.cause}</h4>
                    {cause.ataCode && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        ATA {cause.ataCode}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{cause.reasoning}</p>
                </div>
                <Badge 
                  variant={cause.probability >= 70 ? "default" : "secondary"} 
                  className="text-sm font-semibold font-mono flex-shrink-0"
                  data-testid={`probability-${index}`}
                >
                  {cause.probability}%
                </Badge>
              </div>
              <Progress value={cause.probability} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
