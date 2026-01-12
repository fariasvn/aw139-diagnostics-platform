import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "lucide-react";

interface AffectedPart {
  partNumber: string;
  description: string;
  location: string;
  status: "INSPECT" | "REPLACE" | "TEST";
}

interface AffectedPartsListProps {
  parts: AffectedPart[];
}

export default function AffectedPartsList({ parts }: AffectedPartsListProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "REPLACE": return "destructive";
      case "INSPECT": return "default";
      case "TEST": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Card data-testid="card-affected-parts">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Affected Parts</CardTitle>
        <Badge variant="outline" className="font-mono text-xs">
          <Package className="w-3 h-3 mr-1" />
          {parts.length} Components
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Part Number</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part, index) => (
                <TableRow key={index} data-testid={`part-row-${index}`}>
                  <TableCell className="font-mono text-sm font-medium">{part.partNumber}</TableCell>
                  <TableCell className="text-sm">{part.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{part.location}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getStatusVariant(part.status)} className="text-xs">
                      {part.status}
                    </Badge>
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
