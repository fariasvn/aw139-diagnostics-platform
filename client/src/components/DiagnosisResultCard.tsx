import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, AlertCircle, CheckCircle2 } from "lucide-react";

interface Reference {
  docId: string;
  section: string;
  title: string;
}

interface AircraftConfiguration {
  code: string;
  name: string;
  effectivityCode?: string;
  source?: string;
  sourceRevision?: string;
}

interface DiagnosisResultCardProps {
  summary: string;
  references: Reference[];
  certaintyScore: number;
  serialNumber?: string;
  configuration?: AircraftConfiguration | null;
}

export default function DiagnosisResultCard({ summary, references, certaintyScore, serialNumber, configuration }: DiagnosisResultCardProps) {
  const safeReferences = Array.isArray(references) ? references : [];
  
  if (!summary) {
    return null;
  }
  
  return (
    <Card data-testid="card-diagnosis-result">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-xl font-semibold">Diagnosis Summary</CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            <FileText className="w-3 h-3 mr-1" />
            {safeReferences?.length ?? 0} References
          </Badge>
        </div>
        {configuration && serialNumber && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/20" data-testid="config-verification-banner">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-medium">Configuration Verified:</span>{" "}
              This diagnosis applies to <span className="font-mono font-semibold">{configuration.name}</span> aircraft{" "}
              (S/N: <span className="font-mono">{serialNumber}</span>)
              {configuration.source && (
                <span className="text-muted-foreground"> — Source: {configuration.source}</span>
              )}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none dark:prose-invert" data-testid="text-diagnosis-summary">
            {summary.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-base leading-relaxed mb-3">
                {paragraph.split('\n').map((line, lineIndex, arr) => (
                  <span key={lineIndex}>
                    {line}
                    {lineIndex < arr.length - 1 && <br />}
                  </span>
                ))}
              </p>
            ))}
          </div>
          
          {certaintyScore < 95 && (
            <div className="flex items-start gap-2 p-4 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive-foreground">
                This diagnosis requires expert validation due to certainty score below safety threshold.
              </p>
            </div>
          )}
        </div>

        {safeReferences && safeReferences.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="references" className="border-none">
              <AccordionTrigger className="text-sm font-medium hover:no-underline" data-testid="button-toggle-references">
                View IETP/AMP References ({safeReferences.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {safeReferences.map((ref, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-3 p-3 rounded-md bg-muted/50 hover-elevate"
                      data-testid={`reference-${index}`}
                    >
                      <Badge variant="secondary" className="font-mono text-xs mt-0.5 flex-shrink-0">
                        {ref.docId}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{ref.title}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">{ref.section}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
