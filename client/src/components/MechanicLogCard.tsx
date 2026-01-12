import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Send, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface ReplacedPart {
  id: string;
  partOffPn: string;
  partOffSn: string;
  partOnPn: string;
  partOnSn: string;
}

interface MechanicLogData {
  solution: string;
  technicianNotes: string;
  technicianName: string;
  completionDate: string;
  replacedParts: ReplacedPart[];
}

interface MechanicLogCardProps {
  onSubmit?: (data: MechanicLogData) => void;
  isSubmitting?: boolean;
  isResolved?: boolean;
}

export default function MechanicLogCard({ onSubmit, isSubmitting, isResolved }: MechanicLogCardProps) {
  const [logData, setLogData] = useState<MechanicLogData>({
    solution: "",
    technicianNotes: "",
    technicianName: "",
    completionDate: new Date().toISOString().split('T')[0],
    replacedParts: [],
  });

  const handleChange = (field: keyof Omit<MechanicLogData, 'replacedParts'>, value: string) => {
    setLogData(prev => ({ ...prev, [field]: value }));
  };

  const addReplacedPart = () => {
    const newPart: ReplacedPart = {
      id: crypto.randomUUID(),
      partOffPn: "",
      partOffSn: "",
      partOnPn: "",
      partOnSn: "",
    };
    setLogData(prev => ({
      ...prev,
      replacedParts: [...prev.replacedParts, newPart],
    }));
  };

  const removeReplacedPart = (id: string) => {
    setLogData(prev => ({
      ...prev,
      replacedParts: prev.replacedParts.filter(part => part.id !== id),
    }));
  };

  const updateReplacedPart = (id: string, field: keyof Omit<ReplacedPart, 'id'>, value: string) => {
    setLogData(prev => ({
      ...prev,
      replacedParts: prev.replacedParts.map(part =>
        part.id === id ? { ...part, [field]: value } : part
      ),
    }));
  };

  const handleSubmit = () => {
    if (logData.solution.trim() && logData.technicianName.trim()) {
      onSubmit?.(logData);
    }
  };

  const canSubmit = logData.solution.trim().length > 0 && logData.technicianName.trim().length > 0;

  return (
    <Card data-testid="card-mechanic-log">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Mechanic Log
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isResolved 
            ? "Resolution has been submitted to historical troubleshooting" 
            : "Fill in the solution details and submit to complete the troubleshooting"}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="solution" className="flex items-center gap-1">
              Solution / Final Action <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="solution"
              placeholder="Describe the solution and final action taken to resolve the issue..."
              value={logData.solution}
              onChange={(e) => handleChange("solution", e.target.value)}
              className="min-h-[100px] resize-none"
              data-testid="input-solution"
              disabled={isResolved}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="technician-notes">Technician Notes (Optional)</Label>
            <Textarea
              id="technician-notes"
              placeholder="Additional observations, recommendations for future reference..."
              value={logData.technicianNotes}
              onChange={(e) => handleChange("technicianNotes", e.target.value)}
              className="min-h-[80px] resize-none"
              data-testid="input-technician-notes"
              disabled={isResolved}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-medium">Replaced Parts</Label>
            {!isResolved && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addReplacedPart}
                data-testid="button-add-part"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Part
              </Button>
            )}
          </div>

          {logData.replacedParts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
              No parts replaced. Click "Add Part" to log replaced components.
            </p>
          ) : (
            <div className="space-y-4">
              {logData.replacedParts.map((part, index) => (
                <div
                  key={part.id}
                  className="border rounded-lg p-4 space-y-3 bg-muted/30"
                  data-testid={`part-replacement-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Part #{index + 1}</span>
                    {!isResolved && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeReplacedPart(part.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        data-testid={`button-remove-part-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3 p-3 rounded-md border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
                          OFF (Removed)
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Part Number OFF</Label>
                        <Input
                          placeholder="P/N removed"
                          value={part.partOffPn}
                          onChange={(e) => updateReplacedPart(part.id, "partOffPn", e.target.value)}
                          disabled={isResolved}
                          data-testid={`input-part-off-pn-${index}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Serial Number OFF</Label>
                        <Input
                          placeholder="S/N removed"
                          value={part.partOffSn}
                          onChange={(e) => updateReplacedPart(part.id, "partOffSn", e.target.value)}
                          disabled={isResolved}
                          data-testid={`input-part-off-sn-${index}`}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3 p-3 rounded-md border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-green-600 dark:text-green-400">
                          ON (Installed)
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Part Number ON</Label>
                        <Input
                          placeholder="P/N installed"
                          value={part.partOnPn}
                          onChange={(e) => updateReplacedPart(part.id, "partOnPn", e.target.value)}
                          disabled={isResolved}
                          data-testid={`input-part-on-pn-${index}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Serial Number ON</Label>
                        <Input
                          placeholder="S/N installed"
                          value={part.partOnSn}
                          onChange={(e) => updateReplacedPart(part.id, "partOnSn", e.target.value)}
                          disabled={isResolved}
                          data-testid={`input-part-on-sn-${index}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="technician-name" className="flex items-center gap-1">
                Technician Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="technician-name"
                placeholder="Full name"
                value={logData.technicianName}
                onChange={(e) => handleChange("technicianName", e.target.value)}
                data-testid="input-technician-name"
                disabled={isResolved}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="completion-date">Completion Date</Label>
              <Input
                id="completion-date"
                type="date"
                value={logData.completionDate}
                onChange={(e) => handleChange("completionDate", e.target.value)}
                data-testid="input-completion-date"
                disabled={isResolved}
              />
            </div>
          </div>
        </div>

        {!isResolved && (
          <div className="pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="w-full"
              data-testid="button-submit-resolution"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Resolution to Historical Troubleshooting
                </>
              )}
            </Button>
            {!canSubmit && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Fill in the solution and technician name to submit
              </p>
            )}
          </div>
        )}

        {isResolved && (
          <div className="pt-2 text-center">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Resolution submitted successfully
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
