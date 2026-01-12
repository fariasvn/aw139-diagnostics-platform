import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { FleetUnavailability } from "@shared/schema";

interface AircraftDowntime {
  serialNumber: string;
  totalDowntimeMinutes: number;
  openIssues: number;
  resolvedIssues: number;
  ataBreakdown: { ata: string; minutes: number; count: number }[];
}

const ATA_COLORS: Record<string, string> = {
  "24": "hsl(var(--primary))",
  "27": "hsl(var(--destructive))",
  "29": "hsl(210, 70%, 50%)",
  "31": "hsl(150, 60%, 45%)",
  "32": "hsl(45, 90%, 50%)",
  "33": "hsl(280, 60%, 55%)",
  "34": "hsl(15, 80%, 55%)",
  "39": "hsl(190, 70%, 45%)",
  "52": "hsl(330, 60%, 55%)",
  "default": "hsl(var(--muted-foreground))",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function AircraftCard({ aircraft }: { aircraft: AircraftDowntime }) {
  const chartData = aircraft.ataBreakdown.map(item => ({
    name: `ATA ${item.ata}`,
    ata: item.ata,
    minutes: item.minutes,
    count: item.count,
    label: formatDuration(item.minutes),
  }));

  return (
    <Card data-testid={`card-aircraft-${aircraft.serialNumber}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
              <Plane className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">S/N: {aircraft.serialNumber}</CardTitle>
              <p className="text-sm text-muted-foreground">AW139</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {aircraft.openIssues > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {aircraft.openIssues} Open
              </Badge>
            )}
            {aircraft.resolvedIssues > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {aircraft.resolvedIssues} Resolved
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Total Downtime:</span>
          <span className="font-semibold">{formatDuration(aircraft.totalDowntimeMinutes)}</span>
        </div>

        {chartData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(v) => formatDuration(v)} fontSize={12} />
                <YAxis type="category" dataKey="name" fontSize={12} width={55} />
                <Tooltip 
                  formatter={(value: number) => [formatDuration(value), "Downtime"]}
                  labelFormatter={(label) => label}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={ATA_COLORS[entry.ata] || ATA_COLORS.default}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            No downtime recorded
          </div>
        )}

        {chartData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {chartData.map((item) => (
              <div 
                key={item.ata} 
                className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm"
                data-testid={`ata-breakdown-${item.ata}`}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: ATA_COLORS[item.ata] || ATA_COLORS.default }}
                />
                <span className="text-muted-foreground">ATA {item.ata}:</span>
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">({item.count}x)</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FleetUnavailability() {
  const { data: unavailabilityData, isLoading } = useQuery<FleetUnavailability[]>({
    queryKey: ["/api/fleet-unavailability"],
  });

  const aircraftStats: AircraftDowntime[] = [];

  if (unavailabilityData) {
    const grouped = unavailabilityData.reduce((acc, item) => {
      if (!acc[item.aircraftSerial]) {
        acc[item.aircraftSerial] = {
          serialNumber: item.aircraftSerial,
          totalDowntimeMinutes: 0,
          openIssues: 0,
          resolvedIssues: 0,
          ataBreakdown: {},
        };
      }
      
      const minutes = item.downtimeMinutes || 0;
      acc[item.aircraftSerial].totalDowntimeMinutes += minutes;
      
      if (item.status === "open") {
        acc[item.aircraftSerial].openIssues++;
      } else {
        acc[item.aircraftSerial].resolvedIssues++;
      }
      
      if (!acc[item.aircraftSerial].ataBreakdown[item.ataCode]) {
        acc[item.aircraftSerial].ataBreakdown[item.ataCode] = { ata: item.ataCode, minutes: 0, count: 0 };
      }
      acc[item.aircraftSerial].ataBreakdown[item.ataCode].minutes += minutes;
      acc[item.aircraftSerial].ataBreakdown[item.ataCode].count++;
      
      return acc;
    }, {} as Record<string, { serialNumber: string; totalDowntimeMinutes: number; openIssues: number; resolvedIssues: number; ataBreakdown: Record<string, { ata: string; minutes: number; count: number }> }>);

    for (const serial in grouped) {
      const data = grouped[serial];
      aircraftStats.push({
        serialNumber: data.serialNumber,
        totalDowntimeMinutes: data.totalDowntimeMinutes,
        openIssues: data.openIssues,
        resolvedIssues: data.resolvedIssues,
        ataBreakdown: Object.values(data.ataBreakdown).sort((a, b) => b.minutes - a.minutes),
      });
    }
  }

  const totalFleetDowntime = aircraftStats.reduce((sum, a) => sum + a.totalDowntimeMinutes, 0);
  const totalOpenIssues = aircraftStats.reduce((sum, a) => sum + a.openIssues, 0);
  const totalResolvedIssues = aircraftStats.reduce((sum, a) => sum + a.resolvedIssues, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Fleet Unavailability</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 bg-muted rounded w-32" />
              </CardHeader>
              <CardContent>
                <div className="h-48 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-fleet-unavailability">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Fleet Unavailability</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Fleet Downtime</p>
                <p className="text-2xl font-bold" data-testid="total-fleet-downtime">
                  {formatDuration(totalFleetDowntime)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Open Issues</p>
                <p className="text-2xl font-bold" data-testid="total-open-issues">{totalOpenIssues}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Resolved Issues</p>
                <p className="text-2xl font-bold" data-testid="total-resolved-issues">{totalResolvedIssues}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {aircraftStats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Plane className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Unavailability Records</h3>
            <p className="text-muted-foreground">
              When diagnostic queries are submitted, downtime will be tracked automatically from diagnosis to resolution.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {aircraftStats.map((aircraft) => (
            <AircraftCard key={aircraft.serialNumber} aircraft={aircraft} />
          ))}
        </div>
      )}
    </div>
  );
}
