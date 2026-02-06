import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Loader2, CheckCircle2, Clock, Wrench, Package, User, Calendar, FileText, Plus, Trash2, Edit3, Search, X, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DiagnosticDisclaimerFooter } from "@/components/DisclaimerModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ATA_CODES } from "@/data/ata-codes";

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

interface PartFormEntry {
  partOffPn: string;
  partOffSn: string;
  partOffDescription: string;
  partOnPn: string;
  partOnSn: string;
  partOnDescription: string;
  ataCode: string;
}

const emptyPart: PartFormEntry = {
  partOffPn: "",
  partOffSn: "",
  partOffDescription: "",
  partOnPn: "",
  partOnSn: "",
  partOnDescription: "",
  ataCode: "",
};

const ITEMS_PER_PAGE = 20;

export default function HistoricalTroubleshooting() {
  const { toast } = useToast();
  const [selectedRecord, setSelectedRecord] = useState<TroubleshootingRecord | null>(null);
  const [resolveRecord, setResolveRecord] = useState<TroubleshootingRecord | null>(null);
  const [solution, setSolution] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [replacedParts, setReplacedParts] = useState<PartFormEntry[]>([]);

  const [searchText, setSearchText] = useState("");
  const [filterAta, setFilterAta] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAircraft, setFilterAircraft] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ["/api/troubleshooting/history"],
  });

  const records = Array.isArray(history) ? history : [];

  const filteredRecords = useMemo(() => {
    let result = records;

    if (searchText.trim()) {
      const query = searchText.toLowerCase().trim();
      result = result.filter((r: TroubleshootingRecord) =>
        (r.problem && r.problem.toLowerCase().includes(query)) ||
        (r.solution && r.solution.toLowerCase().includes(query)) ||
        (r.aiSuggestion && r.aiSuggestion.toLowerCase().includes(query)) ||
        (r.technicianName && r.technicianName.toLowerCase().includes(query)) ||
        (r.aircraftSerial && r.aircraftSerial.toLowerCase().includes(query)) ||
        (r.ata && r.ata.includes(query)) ||
        (r.partOffPn && r.partOffPn.toLowerCase().includes(query)) ||
        (r.partOnPn && r.partOnPn.toLowerCase().includes(query))
      );
    }

    if (filterAta !== "all") {
      result = result.filter((r: TroubleshootingRecord) => r.ata === filterAta);
    }

    if (filterStatus !== "all") {
      result = result.filter((r: TroubleshootingRecord) =>
        filterStatus === "resolved" ? r.solutionStatus === "resolved" : r.solutionStatus !== "resolved"
      );
    }

    if (filterAircraft.trim()) {
      const acQuery = filterAircraft.toLowerCase().trim();
      result = result.filter((r: TroubleshootingRecord) =>
        r.aircraftSerial && r.aircraftSerial.toLowerCase().includes(acQuery)
      );
    }

    return result;
  }, [records, searchText, filterAta, filterStatus, filterAircraft]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const hasActiveFilters = searchText.trim() || filterAta !== "all" || filterStatus !== "all" || filterAircraft.trim();

  const clearAllFilters = () => {
    setSearchText("");
    setFilterAta("all");
    setFilterStatus("all");
    setFilterAircraft("");
    setCurrentPage(1);
  };

  const solveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("POST", `/api/troubleshooting/${id}/solution`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/troubleshooting/history"] });
      toast({ title: "Solution saved", description: "The troubleshooting record has been resolved." });
      handleCloseResolve();
    },
    onError: (error: any) => {
      toast({ title: "Failed to save solution", description: error.message, variant: "destructive" });
    },
  });

  const handleRowClick = (record: TroubleshootingRecord) => {
    setSelectedRecord(record);
  };

  const closeDialog = () => {
    setSelectedRecord(null);
  };

  const handleOpenResolve = (record: TroubleshootingRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSolution("");
    setTechnicianName("");
    setReplacedParts([]);
    setResolveRecord(record);
  };

  const handleCloseResolve = () => {
    setResolveRecord(null);
    setSolution("");
    setTechnicianName("");
    setReplacedParts([]);
  };

  const handleAddPart = () => {
    setReplacedParts([...replacedParts, { ...emptyPart }]);
  };

  const handleRemovePart = (index: number) => {
    setReplacedParts(replacedParts.filter((_, i) => i !== index));
  };

  const handlePartChange = (index: number, field: keyof PartFormEntry, value: string) => {
    const updated = [...replacedParts];
    updated[index] = { ...updated[index], [field]: value };
    setReplacedParts(updated);
  };

  const handleSubmitSolution = () => {
    if (!resolveRecord || !solution.trim()) return;

    const validParts = replacedParts
      .filter(p => p.partOffPn.trim() && p.partOnPn.trim())
      .map(p => ({
        partOffPn: p.partOffPn.trim(),
        partOffSn: p.partOffSn.trim() || undefined,
        partOffDescription: p.partOffDescription.trim() || undefined,
        partOnPn: p.partOnPn.trim(),
        partOnSn: p.partOnSn.trim() || undefined,
        partOnDescription: p.partOnDescription.trim() || undefined,
        ataCode: p.ataCode.trim() || undefined,
      }));

    solveMutation.mutate({
      id: resolveRecord.id,
      data: {
        solution: solution.trim(),
        technicianName: technicianName.trim() || undefined,
        replacedParts: validParts.length > 0 ? validParts : undefined,
      },
    });
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

      {records.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Records</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-total-records">{records.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Resolved</div>
              <div className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400" data-testid="text-resolved-count">
                {records.filter((r: TroubleshootingRecord) => r.solutionStatus === "resolved").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400" data-testid="text-pending-count">
                {records.filter((r: TroubleshootingRecord) => r.solutionStatus !== "resolved").length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Search & Filter
          </CardTitle>
          <CardDescription>
            Find specific troubleshooting records by keyword, ATA system, status, or aircraft
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
              placeholder="Search by problem, solution, part number, technician, serial..."
              className="pl-10"
              data-testid="input-search-history"
            />
            {searchText && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => { setSearchText(""); setCurrentPage(1); }}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">ATA System</Label>
              <Select value={filterAta} onValueChange={(v) => { setFilterAta(v); setCurrentPage(1); }}>
                <SelectTrigger data-testid="select-filter-ata">
                  <SelectValue placeholder="All ATA codes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ATA codes</SelectItem>
                  {ATA_CODES.map((a) => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.code} - {a.system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground">Aircraft S/N</Label>
              <Input
                value={filterAircraft}
                onChange={(e) => { setFilterAircraft(e.target.value); setCurrentPage(1); }}
                placeholder="e.g. 31005"
                className="font-mono"
                data-testid="input-filter-aircraft"
              />
            </div>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} data-testid="button-clear-filters">
                <X className="w-3 h-3 mr-1" />
                Clear filters
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="text-sm text-muted-foreground" data-testid="text-filter-results">
              Showing {filteredRecords.length} of {records.length} records
            </div>
          )}
        </CardContent>
      </Card>

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

          {!isLoading && !error && records.length > 0 && filteredRecords.length === 0 && (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-filter-results">
              No records match your search criteria. Try adjusting the filters.
            </div>
          )}

          {!isLoading && !error && paginatedRecords.length > 0 && (
            <>
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
                      <TableHead className="font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.map((record: TroubleshootingRecord) => (
                      <TableRow 
                        key={record.id} 
                        data-testid={`history-row-${record.id}`}
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
                          <Badge variant="outline" className="font-mono" data-testid={`ata-badge-${record.id}`}>
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
                            <Badge 
                              variant="outline" 
                              className="border-green-600 bg-green-500/15 text-green-700 dark:text-green-400 dark:border-green-500 dark:bg-green-500/20"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Resolved
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline"
                              className="border-amber-600 bg-amber-500/15 text-amber-700 dark:text-amber-400 dark:border-amber-500 dark:bg-amber-500/20"
                            >
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
                        <TableCell>
                          {record.solutionStatus !== "resolved" && (
                            <Button
                              size="sm"
                              onClick={(e) => handleOpenResolve(record, e)}
                              data-testid={`button-resolve-${record.id}`}
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-4 pt-4" data-testid="pagination-controls">
                  <div className="text-sm text-muted-foreground">
                    Page {safePage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage(safePage - 1)}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage(safePage + 1)}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
                    <Badge 
                      variant="outline" 
                      className="border-green-600 bg-green-500/15 text-green-700 dark:text-green-400 dark:border-green-500 dark:bg-green-500/20"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Resolved
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline"
                      className="border-amber-600 bg-amber-500/15 text-amber-700 dark:text-amber-400 dark:border-amber-500 dark:bg-amber-500/20"
                    >
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
                        <Badge variant="outline" className="text-xs shrink-0 border-green-600 bg-green-500/15 text-green-700 dark:text-green-400 dark:border-green-500 dark:bg-green-500/20">ON</Badge>
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

              <div className="flex justify-end gap-2 pt-4">
                {selectedRecord.solutionStatus !== "resolved" && (
                  <Button 
                    onClick={() => {
                      closeDialog();
                      handleOpenResolve(selectedRecord);
                    }}
                    data-testid="button-resolve-from-details"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Resolve Task
                  </Button>
                )}
                <Button variant="outline" onClick={closeDialog} data-testid="button-close-details">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveRecord} onOpenChange={(open) => !open && handleCloseResolve()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary" />
              Resolve Troubleshooting Task
            </DialogTitle>
            <DialogDescription>
              {resolveRecord && (
                <>ATA {resolveRecord.ata} - {resolveRecord.aircraftSerial} - {resolveRecord.problem?.substring(0, 80)}{(resolveRecord.problem?.length || 0) > 80 ? "..." : ""}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {resolveRecord && (
            <div className="space-y-6 py-4">
              {/* Problem context */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reported Problem</Label>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{resolveRecord.problem}</p>
              </div>

              {resolveRecord.aiSuggestion && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">AI Suggestion</Label>
                  <p className="text-sm bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
                    {resolveRecord.aiSuggestion}
                  </p>
                </div>
              )}

              <Separator />

              {/* Solution input */}
              <div className="space-y-2">
                <Label htmlFor="solution">Solution Applied *</Label>
                <Textarea
                  id="solution"
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  placeholder="Describe the solution applied to resolve this issue..."
                  className="min-h-[100px]"
                  data-testid="input-solution"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="technicianName">Technician Name</Label>
                <Input
                  id="technicianName"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  placeholder="Name of the technician who resolved the issue"
                  data-testid="input-technician-name"
                />
              </div>

              <Separator />

              {/* Replaced Parts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Replaced Parts (Part ON/OFF)</Label>
                  <Button size="sm" variant="outline" onClick={handleAddPart} data-testid="button-add-part">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Part
                  </Button>
                </div>

                {replacedParts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No parts replaced. Click "Add Part" if parts were replaced.</p>
                )}

                {replacedParts.map((part, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3" data-testid={`part-entry-${index}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Part #{index + 1}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleRemovePart(index)}
                        data-testid={`button-remove-part-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Part OFF - P/N *</Label>
                        <Input
                          value={part.partOffPn}
                          onChange={(e) => handlePartChange(index, "partOffPn", e.target.value)}
                          placeholder="Part number removed"
                          className="font-mono text-sm"
                          data-testid={`input-part-off-pn-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Part OFF - S/N</Label>
                        <Input
                          value={part.partOffSn}
                          onChange={(e) => handlePartChange(index, "partOffSn", e.target.value)}
                          placeholder="Serial number"
                          className="font-mono text-sm"
                          data-testid={`input-part-off-sn-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Part ON - P/N *</Label>
                        <Input
                          value={part.partOnPn}
                          onChange={(e) => handlePartChange(index, "partOnPn", e.target.value)}
                          placeholder="Part number installed"
                          className="font-mono text-sm"
                          data-testid={`input-part-on-pn-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Part ON - S/N</Label>
                        <Input
                          value={part.partOnSn}
                          onChange={(e) => handlePartChange(index, "partOnSn", e.target.value)}
                          placeholder="Serial number"
                          className="font-mono text-sm"
                          data-testid={`input-part-on-sn-${index}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseResolve} data-testid="button-cancel-resolve">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitSolution}
                  disabled={!solution.trim() || solveMutation.isPending}
                  data-testid="button-submit-solution"
                >
                  {solveMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Save Solution</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
