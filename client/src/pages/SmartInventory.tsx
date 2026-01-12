import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, TrendingUp, AlertTriangle, Loader2, BarChart3 } from "lucide-react";

interface PartData {
  id: string;
  partNumber: string;
  description: string;
  ataCode: string;
  timesReplaced: number;
  failureRate: number;
  daysToFailure?: number;
}

interface ReplacementData {
  partOnPn: string;
  count: number;
  ataCode?: string;
}

interface InventoryResponse {
  parts: PartData[];
  recentReplacements: ReplacementData[];
  summary: {
    totalTrackedParts: number;
    topReplacedPart: string | null;
    totalReplacements: number;
  };
}

export default function SmartInventory() {
  const { data, isLoading, error } = useQuery<InventoryResponse>({
    queryKey: ["/api/inventory/parts"],
  });

  const parts = data?.parts || [];
  const recentReplacements = data?.recentReplacements || [];
  const summary = data?.summary || { totalTrackedParts: 0, topReplacedPart: null, totalReplacements: 0 };
  
  const maxReplacements = Math.max(...parts.map(p => p.timesReplaced), 1);

  return (
    <div className="space-y-6" data-testid="page-smart-inventory">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Package className="w-8 h-8 text-primary" />
          Smart Inventory
        </h1>
        <p className="text-muted-foreground mt-2">
          Track parts replacement frequency to optimize stock management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tracked Parts</p>
                <p className="text-2xl font-bold" data-testid="stat-total-parts">
                  {summary.totalTrackedParts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Replacements</p>
                <p className="text-2xl font-bold" data-testid="stat-total-replacements">
                  {summary.totalReplacements}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Most Replaced</p>
                <p className="text-lg font-bold font-mono truncate max-w-[150px]" data-testid="stat-top-part">
                  {summary.topReplacedPart || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Parts Replacement Frequency
          </CardTitle>
          <CardDescription>
            Parts sorted by replacement count - prioritize stock for high-frequency items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading inventory data...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
              Failed to load inventory data
            </div>
          )}

          {!isLoading && !error && parts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No parts replacement data yet</p>
              <p className="text-sm mt-2">Parts will appear here as troubleshooting cases are resolved</p>
            </div>
          )}

          {!isLoading && !error && parts.length > 0 && (
            <div className="space-y-4">
              {parts.slice(0, 15).map((part, index) => (
                <div 
                  key={part.id} 
                  className="flex items-center gap-4 p-3 rounded-lg border hover-elevate"
                  data-testid={`part-row-${index}`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold" data-testid={`part-number-${index}`}>
                        {part.partNumber}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        ATA {part.ataCode}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {part.description}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0 w-32">
                    <Progress 
                      value={(part.timesReplaced / maxReplacements) * 100} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="flex-shrink-0 text-right">
                    <span className="text-lg font-bold" data-testid={`replacement-count-${index}`}>
                      {part.timesReplaced}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">times</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {recentReplacements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Replacement Activity</CardTitle>
            <CardDescription>
              Parts replaced in recent troubleshooting sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Part Number</TableHead>
                    <TableHead className="font-semibold">ATA Code</TableHead>
                    <TableHead className="font-semibold text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReplacements.map((item, index) => (
                    <TableRow key={index} data-testid={`recent-replacement-${index}`}>
                      <TableCell className="font-mono font-semibold">
                        {item.partOnPn}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.ataCode || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {item.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">Stock Management Recommendation</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Parts with high replacement frequency should be prioritized in your inventory. 
                Consider maintaining safety stock levels for the top 5 most replaced parts to prevent 
                aircraft downtime due to parts unavailability.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
