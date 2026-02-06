import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Upload, Plane, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface ConfigurationResolution {
  serialNumber: string;
  configuration: string | null;
  configurationName: string | null;
  effectivityCode: string | null;
  source: string | null;
  sourceRevision: string | null;
  warning: string | null;
  isResolved: boolean;
}

interface DiagnosticFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  onConfigurationResolved?: (config: ConfigurationResolution | null) => void;
}

export default function DiagnosticForm({ onSubmit, isLoading = false, onConfigurationResolved }: DiagnosticFormProps) {
  const [formData, setFormData] = useState({
    aircraftModel: "AW139",
    serialNumber: "",
    ata: "",
    taskType: "fault_isolation",
    problemDescription: "",
  });

  const [configResolution, setConfigResolution] = useState<ConfigurationResolution | null>(null);
  const [isResolvingConfig, setIsResolvingConfig] = useState(false);

  const resolveSerialConfig = useCallback(async (serial: string) => {
    if (!serial || serial.length < 4) {
      setConfigResolution(null);
      onConfigurationResolved?.(null);
      return;
    }

    setIsResolvingConfig(true);
    try {
      const response = await fetch(`/api/configuration/resolve/${encodeURIComponent(serial)}`);
      if (response.ok) {
        const data: ConfigurationResolution = await response.json();
        setConfigResolution(data);
        onConfigurationResolved?.(data);
      } else {
        setConfigResolution(null);
        onConfigurationResolved?.(null);
      }
    } catch (error) {
      console.error("Failed to resolve configuration:", error);
      setConfigResolution(null);
      onConfigurationResolved?.(null);
    } finally {
      setIsResolvingConfig(false);
    }
  }, [onConfigurationResolved]);

  useEffect(() => {
    const timer = setTimeout(() => {
      resolveSerialConfig(formData.serialNumber);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.serialNumber, resolveSerialConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting diagnostic query:", formData);
    onSubmit(formData);
  };

  return (
    <Card data-testid="card-diagnostic-form">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">New Diagnostic Query</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aircraft-model">Aircraft Model</Label>
              <Input
                id="aircraft-model"
                value={formData.aircraftModel}
                onChange={(e) => setFormData({ ...formData, aircraftModel: e.target.value })}
                className="font-mono"
                data-testid="input-aircraft-model"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial-number">Serial Number</Label>
              <Input
                id="serial-number"
                placeholder="e.g., 41287"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="font-mono"
                data-testid="input-serial-number"
              />
            </div>
          </div>

          {formData.serialNumber.length >= 4 && (
            <div className="rounded-md border border-border p-3" data-testid="config-resolution-display">
              {isResolvingConfig ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Resolving aircraft configuration...</span>
                </div>
              ) : configResolution?.isResolved ? (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">AW139</span>
                      <Badge variant="default" className="font-mono font-bold" data-testid="badge-config-code">
                        {configResolution.configuration}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({configResolution.configurationName})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      {configResolution.effectivityCode}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      | {configResolution.source} {configResolution.sourceRevision}
                    </span>
                  </div>
                </div>
              ) : configResolution?.warning ? (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Configuration Not Found</p>
                    <p className="text-xs text-muted-foreground mt-1">{configResolution.warning}</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ata-code">ATA Code / Training Material</Label>
            <Select 
              value={formData.ata} 
              onValueChange={(value) => setFormData({ ...formData, ata: value })}
            >
              <SelectTrigger id="ata-code" data-testid="select-ata-code">
                <SelectValue placeholder="Select ATA system or training material" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Training Materials</SelectLabel>
                  <SelectItem value="PRIMUS_EPIC">Primus Epic (Avionics System)</SelectItem>
                  <SelectItem value="PT6C_67CD">PT6C-67CD (Engine)</SelectItem>
                  <SelectItem value="AW139_AIRFRAME">AW139 Airframe Type Training</SelectItem>
                </SelectGroup>
                
                <SelectSeparator />
                
                <SelectGroup>
                  <SelectLabel>ATA Chapters</SelectLabel>
                  <SelectItem value="05">ATA 05 - Time Limits/Checks</SelectItem>
                <SelectItem value="06">ATA 06 - Dimension & Areas</SelectItem>
                <SelectItem value="07">ATA 07 - Lifting/Shoring</SelectItem>
                <SelectItem value="08">ATA 08 - Levelling/Towing</SelectItem>
                <SelectItem value="09">ATA 09 - Towing/Taxying</SelectItem>
                <SelectItem value="10">ATA 10 - Parking & Mooring</SelectItem>
                <SelectItem value="11">ATA 11 - Placards & Marking</SelectItem>
                <SelectItem value="12">ATA 12 - Servicing</SelectItem>

                <SelectItem value="20">ATA 20 - Std. Practice Airframe</SelectItem>
                <SelectItem value="21">ATA 21 - Air Conditioning</SelectItem>
                <SelectItem value="22">ATA 22 - Auto Flight</SelectItem>
                <SelectItem value="23">ATA 23 - Communications</SelectItem>
                <SelectItem value="24">ATA 24 - Electrical Power</SelectItem>
                <SelectItem value="25">ATA 25 - Equipment/Furnishings</SelectItem>
                <SelectItem value="26">ATA 26 - Fire Protection</SelectItem>
                <SelectItem value="27">ATA 27 - Flight Controls</SelectItem>
                <SelectItem value="28">ATA 28 - Fuel System</SelectItem>
                <SelectItem value="29">ATA 29 - Hydraulic Power</SelectItem>
                <SelectItem value="30">ATA 30 - Ice & Rain Protection</SelectItem>
                <SelectItem value="31">ATA 31 - Indicating/Recording Systems</SelectItem>
                <SelectItem value="32">ATA 32 - Landing Gear</SelectItem>
                <SelectItem value="33">ATA 33 - Lights</SelectItem>
                <SelectItem value="34">ATA 34 - Navigation</SelectItem>
                <SelectItem value="35">ATA 35 - Oxygen</SelectItem>
                <SelectItem value="36">ATA 36 - Pneumatic</SelectItem>
                <SelectItem value="37">ATA 37 - Vacuum</SelectItem>
                <SelectItem value="38">ATA 38 - Water/Waste</SelectItem>
                <SelectItem value="39">ATA 39 - Electrical/Electronic Panels</SelectItem>
                <SelectItem value="45">ATA 45 - Central Maintenance System</SelectItem>
                <SelectItem value="49">ATA 49 - Airborne Aux Power</SelectItem>

                <SelectItem value="51">ATA 51 - Structures</SelectItem>
                <SelectItem value="52">ATA 52 - Doors</SelectItem>
                <SelectItem value="53">ATA 53 - Fuselage</SelectItem>
                <SelectItem value="54">ATA 54 - Nacelles/Pylons</SelectItem>
                <SelectItem value="55">ATA 55 - Stabilizers</SelectItem>
                <SelectItem value="56">ATA 56 - Windows</SelectItem>
                <SelectItem value="57">ATA 57 - Wings</SelectItem>

                <SelectItem value="60">ATA 60 - Std. Practice Prop/Rotor</SelectItem>
                <SelectItem value="61">ATA 61 - Propellers</SelectItem>
                <SelectItem value="65">ATA 65 - Rotors (Helicopter)</SelectItem>

                <SelectItem value="70">ATA 70 - Std. Practice Engine</SelectItem>
                <SelectItem value="71">ATA 71 - Power Plant</SelectItem>
                <SelectItem value="72">ATA 72 - Engine</SelectItem>
                <SelectItem value="73">ATA 73 - Engine Fuel & Control</SelectItem>
                <SelectItem value="74">ATA 74 - Ignition</SelectItem>
                <SelectItem value="75">ATA 75 - Air</SelectItem>
                <SelectItem value="76">ATA 76 - Engine Control</SelectItem>
                <SelectItem value="77">ATA 77 - Engine Indicating</SelectItem>
                <SelectItem value="78">ATA 78 - Exhaust</SelectItem>
                <SelectItem value="79">ATA 79 - Oil</SelectItem>
                <SelectItem value="80">ATA 80 - Starting</SelectItem>
                <SelectItem value="81">ATA 81 - Turbines</SelectItem>
                <SelectItem value="82">ATA 82 - Water Injection</SelectItem>
                <SelectItem value="83">ATA 83 - Accessory Gear Boxes</SelectItem>

                <SelectItem value="91">ATA 91 - Charts</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-type">Task Type / Requested Operation</Label>
            <Select 
              value={formData.taskType} 
              onValueChange={(value) => setFormData({ ...formData, taskType: value })}
            >
              <SelectTrigger id="task-type" data-testid="select-task-type">
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fault_isolation">Fault Isolation</SelectItem>
                <SelectItem value="functional_test">Functional Test</SelectItem>
                <SelectItem value="operational_test">Operational Test</SelectItem>
                <SelectItem value="remove_procedure">Remove Procedure</SelectItem>
                <SelectItem value="install_procedure">Install Procedure</SelectItem>
                <SelectItem value="system_description">System Description (How it Works)</SelectItem>
                <SelectItem value="detailed_inspection">Detailed Inspection</SelectItem>
                <SelectItem value="disassembly">Disassembly Procedure</SelectItem>
                <SelectItem value="assembly">Assembly Procedure</SelectItem>
                <SelectItem value="adjustment">Adjustment / Calibration</SelectItem>
                <SelectItem value="bonding_check">Bonding Check</SelectItem>
                <SelectItem value="other">Other Maintenance Task</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="problem-description">Problem Description</Label>
            <Textarea
              id="problem-description"
              placeholder="Describe the issue in detail (symptoms, when it occurs, any warning lights, etc.)"
              value={formData.problemDescription}
              onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
              className="min-h-32 resize-none"
              data-testid="textarea-problem-description"
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments (Optional)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                data-testid="button-upload-attachment"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Images/Logs
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload photos, sensor logs, or diagnostic reports
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !formData.serialNumber || !formData.ata || !formData.problemDescription}
            data-testid="button-submit-diagnostic"
          >
            <Send className="w-4 h-4 mr-2" />
            {isLoading ? "Analyzing..." : "Submit Diagnostic Query"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
