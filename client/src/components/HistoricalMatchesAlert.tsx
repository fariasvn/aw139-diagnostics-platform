import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { History, Calendar, Plane, Wrench, Package } from "lucide-react";

interface PartReplacement {
  partOffPn: string;
  partOffSn?: string;
  partOnPn: string;
  partOnSn?: string;
}

interface HistoricalMatch {
  id: string;
  aircraftSerial: string;
  ata: string;
  problem: string;
  solution?: string;
  date: string;
  resolvedAt?: string;
  replacedParts?: PartReplacement[];
  score?: number;
}

interface HistoricalMatchesAlertProps {
  matches: HistoricalMatch[];
  currentProblem: string;
}

export default function HistoricalMatchesAlert({ matches, currentProblem }: HistoricalMatchesAlertProps) {
  if (!matches || matches.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Alert className="border-amber-500/50 bg-amber-500/5" data-testid="alert-historical-matches">
      <History className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-700 dark:text-amber-400">
        Similar Problem Found in History
      </AlertTitle>
      <AlertDescription className="mt-3">
        <p className="text-sm text-muted-foreground mb-4">
          We found {matches.length} similar case{matches.length !== 1 ? "s" : ""} in the troubleshooting history that may help resolve this issue faster.
        </p>
        
        <div className="space-y-4">
          {matches.map((match, index) => (
            <Card key={match.id || index} className="bg-background" data-testid={`historical-match-${index}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-sm">S/N {match.aircraftSerial}</span>
                    <Badge variant="outline" className="text-xs">ATA {match.ata}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDate(match.resolvedAt || match.date)}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Problem</p>
                  <p className="text-sm">{match.problem}</p>
                </div>

                {match.solution && (
                  <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="w-4 h-4 text-green-600" />
                      <p className="text-xs text-green-700 dark:text-green-400 uppercase font-medium">Solution Applied</p>
                    </div>
                    <p className="text-sm">{match.solution}</p>
                  </div>
                )}

                {match.replacedParts && match.replacedParts.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground uppercase font-medium">Parts Replaced</p>
                    </div>
                    <div className="space-y-2">
                      {match.replacedParts.map((part, partIndex) => (
                        <div key={partIndex} className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-destructive text-xs">OFF:</span>
                            <span className="font-mono">{part.partOffPn}</span>
                            {part.partOffSn && <span className="text-muted-foreground">S/N {part.partOffSn}</span>}
                          </div>
                          <span className="text-muted-foreground">→</span>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 text-xs">ON:</span>
                            <span className="font-mono">{part.partOnPn}</span>
                            {part.partOnSn && <span className="text-muted-foreground">S/N {part.partOnSn}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
