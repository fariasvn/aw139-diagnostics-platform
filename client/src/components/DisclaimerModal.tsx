import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Shield, CheckCircle2 } from "lucide-react";

const DISCLAIMER_TEXT = `AW139 Diagnostics – Smart Troubleshooting is not a certified maintenance tool and is not intended to replace approved aircraft maintenance manuals, manufacturer documentation, or regulatory requirements.

This platform acts solely as a decision-support and knowledge consolidation system, providing analytical insights based on historical data, operational records, and references to manufacturer-approved documentation.

All maintenance actions, troubleshooting decisions, and aircraft releases remain the full responsibility of appropriately licensed and authorized maintenance personnel, in accordance with applicable aviation authority regulations and company procedures.`;

interface DisclaimerModalProps {
  onAcknowledged?: () => void;
}

interface DisclaimerStatus {
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export default function DisclaimerModal({ onAcknowledged }: DisclaimerModalProps) {
  const [isOpen, setIsOpen] = useState(true);

  const { data: disclaimerStatus, isLoading } = useQuery<DisclaimerStatus>({
    queryKey: ["/api/disclaimer/status"],
    retry: false,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/disclaimer/acknowledge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disclaimer/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsOpen(false);
      onAcknowledged?.();
    },
  });

  if (isLoading) {
    return null;
  }

  if (disclaimerStatus?.acknowledged) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <DialogTitle className="text-xl font-bold">
              IMPORTANT NOTICE – OPERATIONAL DISCLAIMER
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {DISCLAIMER_TEXT}
                </p>
              </div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <strong>By clicking "I Understand and Agree"</strong>, you acknowledge that you have read and understood this disclaimer, and agree to use this platform in accordance with the terms stated above.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button
            onClick={() => acknowledgeMutation.mutate()}
            disabled={acknowledgeMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-acknowledge-disclaimer"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {acknowledgeMutation.isPending ? "Processing..." : "I Understand and Agree"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DisclaimerNotice() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4" data-testid="disclaimer-notice">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-left w-full"
            data-testid="button-toggle-disclaimer"
          >
            <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              Important Notice – Operational Disclaimer
              <span className="text-xs text-muted-foreground">
                {isExpanded ? "(click to collapse)" : "(click to expand)"}
              </span>
            </h4>
          </button>
          
          {isExpanded && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
              {DISCLAIMER_TEXT}
            </p>
          )}
          
          {!isExpanded && (
            <p className="text-xs text-muted-foreground mt-1">
              This platform is a decision-support system only and does not replace approved maintenance documentation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function DiagnosticDisclaimerFooter() {
  return (
    <div className="text-xs text-muted-foreground italic border-t border-border pt-3 mt-4" data-testid="diagnostic-disclaimer-footer">
      This diagnostic output is provided as decision-support only and does not replace approved maintenance data.
    </div>
  );
}
