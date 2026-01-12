import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HistoricalMatch {
  queryId: string;
  timestamp: string;
  similarity: number;
  aircraftSerial: string;
  resolution: string;
}

interface HistoricalMatchesTableProps {
  matches: HistoricalMatch[];
}

export default function HistoricalMatchesTable({ matches }: HistoricalMatchesTableProps) {
  const matchList = Array.isArray(matches) ? matches : [];
  
  return (
    <Card data-testid="card-historical-matches">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Historical Matches</CardTitle>
        <Badge variant="outline" className="font-mono text-xs">
          <History className="w-3 h-3 mr-1" />
          {matchList.length} Similar Cases
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Aircraft S/N</TableHead>
                <TableHead className="font-semibold">Similarity</TableHead>
                <TableHead className="font-semibold">Resolution</TableHead>
                <TableHead className="font-semibold text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchList.map((match, index) => (
                <TableRow key={index} data-testid={`match-row-${index}`}>
                  <TableCell className="text-sm font-mono">{match.timestamp}</TableCell>
                  <TableCell className="text-sm font-mono">{match.aircraftSerial}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={match.similarity >= 80 ? "default" : "secondary"}
                      className="font-mono text-xs"
                      data-testid={`similarity-${index}`}
                    >
                      {match.similarity}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{match.resolution}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8"
                      data-testid={`button-view-${index}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
