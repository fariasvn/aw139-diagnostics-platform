import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, Wrench, Calendar, Clock, Plane, FileText, ChevronRight, ExternalLink } from "lucide-react";

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

function MaintenanceDetailDialog({
  log,
  open,
  onOpenChange,
}: {
  log: MaintenanceLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-maintenance-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Maintenance Record
          </DialogTitle>
          <DialogDescription>
            ATA {log.ata} - {log.type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</label>
              <p className="text-sm font-medium" data-testid="text-detail-type">{log.type}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ATA Code</label>
              <p className="text-sm font-mono font-medium" data-testid="text-detail-ata">{log.ata}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Date
              </label>
              <p className="text-sm" data-testid="text-detail-date">
                {new Date(log.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            {log.tsn > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Aircraft Hours (TSN)
                </label>
                <p className="text-sm font-mono" data-testid="text-detail-tsn">{log.tsn.toLocaleString()}h</p>
              </div>
            )}
          </div>

          {log.aircraftSerial && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Plane className="w-3 h-3" />
                Aircraft Serial
              </label>
              <p className="text-sm font-mono" data-testid="text-detail-serial">{log.aircraftSerial}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Description of Work Performed
            </label>
            <div
              className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap"
              data-testid="text-detail-description"
            >
              {log.description}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AllMaintenanceDialog({
  logs,
  ata,
  open,
  onOpenChange,
  onSelectLog,
}: {
  logs: MaintenanceLog[];
  ata: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLog: (log: MaintenanceLog) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="dialog-all-maintenance">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            All Maintenance Records - ATA {ata}
          </DialogTitle>
          <DialogDescription>
            {logs.length} maintenance intervention{logs.length > 1 ? "s" : ""} found
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1">
          {logs.map((log) => (
            <button
              key={log.id}
              onClick={() => {
                onOpenChange(false);
                onSelectLog(log);
              }}
              className="w-full text-left flex items-start gap-3 rounded-md border p-3 hover-elevate active-elevate-2 transition-colors"
              data-testid={`button-all-maintenance-${log.id}`}
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
              <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MaintenanceAlert({ ata }: MaintenanceAlertProps) {
  const [selectedLog, setSelectedLog] = useState<MaintenanceLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);

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

  const handleOpenDetail = (log: MaintenanceLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  return (
    <>
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
                  {relatedLogs.length} maintenance intervention{relatedLogs.length > 1 ? "s" : ""} found in this area. Click to review details.
                </p>
              </div>
              <div className="space-y-2">
                {relatedLogs.slice(0, 3).map((log) => (
                  <button
                    key={log.id}
                    onClick={() => handleOpenDetail(log)}
                    className="w-full text-left flex items-start gap-3 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3 hover-elevate active-elevate-2 transition-colors cursor-pointer"
                    data-testid={`button-maintenance-log-${log.id}`}
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
                    <ExternalLink className="w-4 h-4 text-amber-600/60 dark:text-amber-400/60 mt-0.5 flex-shrink-0" />
                  </button>
                ))}
                {relatedLogs.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllOpen(true)}
                    className="w-full border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                    data-testid="button-view-all-maintenance"
                  >
                    View All {relatedLogs.length} Maintenance Records
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <MaintenanceDetailDialog
        log={selectedLog}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <AllMaintenanceDialog
        logs={relatedLogs}
        ata={ata}
        open={allOpen}
        onOpenChange={setAllOpen}
        onSelectLog={handleOpenDetail}
      />
    </>
  );
}
