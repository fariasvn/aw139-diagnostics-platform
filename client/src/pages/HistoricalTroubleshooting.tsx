import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, Loader2, CheckCircle2, Clock, Wrench, Package, User, Calendar, FileText, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DiagnosticDisclaimerFooter } from "@/components/DisclaimerModal";

interface PartReplacement {
  id: string;
  partOffPn: string;
  partOffSn?: string;
  partOffDescription?: string;
  partOnPn: string;
  partOnSn?: string;
  partOnDescription?: string;
  ataCode?: string;
}

interface TroubleshootingRecord {
  id: string;
  diagnosticQueryId?: string;
  aircraftSerial: string;
  ata: string;
  problem: string;
  issueSignature?: string;
  aiSuggestion?: string;
  solution?: string;
  solutionStatus?: string;
  technicianName?: string;
  partOffPn?: string;
  partOffSn?: string;
  partOnPn?: string;
  partOnSn?: string;
  tsn?: number;
  date: string;
  resolvedAt?: string;
  replacedParts?: PartReplacement[];
}

export default function HistoricalTroubleshooting() {
  const [selectedRecord, setSelectedRecord] = useState<TroubleshootingRecord | null>(null);
  
  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ["/api/troubleshooting/history"],
  });

  const records = Array.isArray(history) ? history : [];

  const handleRowClick = (record: TroubleshootingRecord) => {
    setSelectedRecord(record);
  };

  const closeDialog = () => {
    setSelectedRecord(null);
  };

  return (
    <div className="space-y-6" data-testid="page-historical-troubleshooting">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <History className="w-8 h-8 text-primary" />
          Historical Troubleshooting
        </h1>
        <p className="text-muted-foreground mt-2">View all previous troubleshooting sessions and resolutions. Click on a row to see full details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting History</CardTitle>
          <CardDescription>
            Complete record of diagnostic sessions, solutions, and parts replacements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading history...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
              Failed to load troubleshooting history
            </div>
          )}

          {!isLoading && !error && records.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No troubleshooting records found
            </div>
          )}

          {!isLoading && !error && records.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Aircraft</TableHead>
                    <TableHead className="font-semibold">ATA 100</TableHead>
                    <TableHead className="font-semibold">Reported Problem</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Parts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: TroubleshootingRecord, index: number) => (
                    <TableRow 
                      key={record.id || index} 
                      data-testid={`history-row-${index}`}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleRowClick(record)}
                    >
                      <TableCell className="text-sm font-mono">
                        {new Date(record.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {record.aircraftSerial || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono" data-testid={`ata-badge-${index}`}>
                          {record.ata}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <div className="truncate">
                          {record.problem || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.solutionStatus === "resolved" ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {record.partOnPn || record.partOffPn ? (
                          <Badge variant="outline" className="text-xs">
                            <Package className="w-3 h-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground">Total Records</div>
                <div className="text-2xl font-bold mt-1">{records.length}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground">With Solutions</div>
                <div className="text-2xl font-bold mt-1">
                  {records.filter((r: TroubleshootingRecord) => r.solution).length}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground">Parts Replaced</div>
                <div className="text-2xl font-bold mt-1">
                  {records.filter((r: TroubleshootingRecord) => r.partOnPn).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Troubleshooting Details
            </DialogTitle>
            <DialogDescription>
              Complete record of the diagnostic session
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
                  <p className="font-mono flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {new Date(selectedRecord.date).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Aircraft Serial</p>
                  <p className="font-mono">{selectedRecord.aircraftSerial || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">ATA Code</p>
                  <Badge variant="outline" className="font-mono">{selectedRecord.ata}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                  {selectedRecord.solutionStatus === "resolved" ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Resolved
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Problem Description */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  Reported Problem
                </h4>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {selectedRecord.problem || "No problem description available"}
                </p>
              </div>

              {/* AI Suggestion */}
              {selectedRecord.aiSuggestion && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">AI Diagnostic Suggestion</h4>
                  <p className="text-sm bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
                    {selectedRecord.aiSuggestion}
                  </p>
                </div>
              )}

              {/* Solution */}
              {selectedRecord.solution && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Final Solution
                  </h4>
                  <p className="text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-900">
                    {selectedRecord.solution}
                  </p>
                </div>
              )}

              {/* Technician */}
              {selectedRecord.technicianName && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Technician
                  </h4>
                  <p className="text-sm">{selectedRecord.technicianName}</p>
                </div>
              )}

              {/* Resolution Time */}
              {selectedRecord.resolvedAt && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Resolution Date</h4>
                  <p className="text-sm font-mono">
                    {new Date(selectedRecord.resolvedAt).toLocaleString()}
                  </p>
                </div>
              )}

              <Separator />

              {/* Replaced Parts */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Replaced Parts
                </h4>
                
                {(selectedRecord.partOffPn || selectedRecord.partOnPn) ? (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    {selectedRecord.partOffPn && (
                      <div className="flex items-start gap-3">
                        <Badge variant="destructive" className="text-xs shrink-0">OFF</Badge>
                        <div>
                          <p className="font-mono text-sm">{selectedRecord.partOffPn}</p>
                          {selectedRecord.partOffSn && (
                            <p className="text-xs text-muted-foreground">SN: {selectedRecord.partOffSn}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedRecord.partOnPn && (
                      <div className="flex items-start gap-3">
                        <Badge variant="default" className="bg-green-600 text-xs shrink-0">ON</Badge>
                        <div>
                          <p className="font-mono text-sm">{selectedRecord.partOnPn}</p>
                          {selectedRecord.partOnSn && (
                            <p className="text-xs text-muted-foreground">SN: {selectedRecord.partOnSn}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedRecord.tsn && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          TSN (Time Since New): <span className="font-mono">{selectedRecord.tsn}</span> hours
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No parts were replaced during this session</p>
                )}
              </div>

              <DiagnosticDisclaimerFooter />

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={closeDialog} data-testid="button-close-details">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
