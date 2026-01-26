import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Infinity } from "lucide-react";

interface QuotaIndicatorProps {
  planType?: "BASIC" | "ENTERPRISE";
  remaining?: number;
  total?: number;
}

export default function QuotaIndicator({ planType = "ENTERPRISE", remaining, total }: QuotaIndicatorProps) {
  // Always show as unlimited/free - no restrictions
  return (
    <Card data-testid="card-quota-indicator">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Subscription Plan</span>
            </div>
            <Badge variant="default" className="text-xs uppercase tracking-wide">
              FREE
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI Requests</span>
              <span className="font-semibold font-mono" data-testid="text-quota-remaining">
                <span className="flex items-center gap-1">
                  <Infinity className="w-4 h-4" />
                  Unlimited
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
