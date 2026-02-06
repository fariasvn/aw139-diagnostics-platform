import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Wrench, Calendar } from "lucide-react";

interface MaintenanceLog {
  id: string;
  ata: string;
  type: string;
  description: string;
  date: string;
  tsn: number;
  aircraftSerial: string;
}

interface MaintenanceAlertProps {
  ata: string;
}

export default function MaintenanceAlert({ ata }: MaintenanceAlertProps) {
  const { data: relatedLogs = [], isLoading } = useQuery<MaintenanceLog[]>({
    queryKey: ["/api/maintenance/related", ata],
    queryFn: async () => {
      const res = await fetch(`/api/maintenance/related/${encodeURIComponent(ata)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!ata && ata.length >= 2,
  });

  if (isLoading || relatedLogs.length === 0) return null;

  return (
    <Card className="border-amber-500/50 bg-amber-500/5" data-testid="card-maintenance-alert">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-semibold text-amber-700 dark:text-amber-300" data-testid="text-maintenance-alert-title">
                Previous Maintenance Detected on ATA {ata}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {relatedLogs.length} maintenance intervention{relatedLogs.length > 1 ? "s" : ""} found in this area. Review before proceeding.
              </p>
            </div>
            <div className="space-y-2">
              {relatedLogs.slice(0, 3).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3"
                  data-testid={`maintenance-log-${log.id}`}
                >
                  <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{log.type}</span>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(log.date).toLocaleDateString()}
                      </Badge>
                      {log.tsn > 0 && (
                        <Badge variant="outline" className="text-xs font-mono">
                          TSN: {log.tsn}h
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.description}</p>
                  </div>
                </div>
              ))}
              {relatedLogs.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{relatedLogs.length - 3} more maintenance record{relatedLogs.length - 3 > 1 ? "s" : ""} in this area
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
