import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Calendar, Wrench } from "lucide-react";

interface AircraftInfoBannerProps {
  model: string;
  serialNumber: string;
  lastMaintenance?: string;
  activeQueries?: number;
}

export default function AircraftInfoBanner({ 
  model, 
  serialNumber, 
  lastMaintenance = "2024-11-20",
  activeQueries = 0
}: AircraftInfoBannerProps) {
  return (
    <Card data-testid="card-aircraft-info">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary/10">
              <Plane className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold font-mono" data-testid="text-aircraft-model">{model}</h2>
              <p className="text-sm text-muted-foreground">
                S/N: <span className="font-mono font-medium" data-testid="text-serial-number">{serialNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Maintenance</p>
                <p className="text-sm font-semibold font-mono">{lastMaintenance}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Queries</p>
                <Badge variant="secondary" className="font-mono">
                  {activeQueries}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
