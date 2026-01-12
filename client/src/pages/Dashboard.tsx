import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AircraftInfoBanner from "@/components/AircraftInfoBanner";
import DiagnosticForm from "@/components/DiagnosticForm";
import CertaintyScoreDisplay from "@/components/CertaintyScoreDisplay";
import DiagnosisResultCard from "@/components/DiagnosisResultCard";
import RecommendedTestsList from "@/components/RecommendedTestsList";
import LikelyCausesList from "@/components/LikelyCausesList";
import AffectedPartsList from "@/components/AffectedPartsList";
import HistoricalMatchesTable from "@/components/HistoricalMatchesTable";
import ExpertBookingCard from "@/components/ExpertBookingCard";
import DMCToolSelector from "@/components/DMCToolSelector";
import HistoricalMatchesAlert from "@/components/HistoricalMatchesAlert";
import MechanicLogCard from "@/components/MechanicLogCard";
import { DisclaimerNotice, DiagnosticDisclaimerFooter } from "@/components/DisclaimerModal";
import expertImage1 from '@assets/generated_images/expert_aerospace_engineer_headshot.png';
import expertImage2 from '@assets/generated_images/female_aviation_specialist_headshot.png';
import expertImage3 from '@assets/generated_images/senior_diagnostic_specialist_headshot.png';

const mockExperts = [
  {
    name: "Dr. Michael Chen",
    experience: "18 years AW139 diagnostics",
    specialty: "Electrical Systems (ATA 24)",
    availability: "AVAILABLE" as const,
    imageUrl: expertImage1
  },
  {
    name: "Sarah Martinez",
    experience: "12 years rotorcraft maintenance",
    specialty: "Power Plant (ATA 70-80)",
    availability: "AVAILABLE" as const,
    imageUrl: expertImage2
  },
  {
    name: "James Patterson",
    experience: "25 years helicopter systems",
    specialty: "Avionics & Flight Controls",
    availability: "UNAVAILABLE" as const,
    imageUrl: expertImage3
  }
];

const STORAGE_KEY = "aw139_current_diagnosis";

// Helper to safely get from localStorage
function getStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    return JSON.parse(saved) as T;
  } catch {
    return defaultValue;
  }
}

function getStoredString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [troubleshootingId, setTroubleshootingId] = useState<string | null>(null);
  const [unavailabilityId, setUnavailabilityId] = useState<string | null>(null);
  const [historicalMatches, setHistoricalMatches] = useState<any[]>([]);
  const [currentQuery, setCurrentQuery] = useState<any>(null);
  const [isRestored, setIsRestored] = useState(false);
  const { toast } = useToast();

  // Restore state from localStorage on mount
  useEffect(() => {
    const storedDiagnosis = getStoredValue<any>(STORAGE_KEY, null);
    const storedTroubleshootingId = getStoredString(STORAGE_KEY + "_troubleshootingId");
    const storedUnavailabilityId = getStoredString(STORAGE_KEY + "_unavailabilityId");
    const storedQuery = getStoredValue<any>(STORAGE_KEY + "_query", null);

    if (storedDiagnosis) {
      setDiagnosticResult(storedDiagnosis);
    }
    if (storedTroubleshootingId) {
      setTroubleshootingId(storedTroubleshootingId);
    }
    if (storedUnavailabilityId) {
      setUnavailabilityId(storedUnavailabilityId);
    }
    if (storedQuery) {
      setCurrentQuery(storedQuery);
    }
    setIsRestored(true);
  }, []);

  // Persist state to localStorage (only after initial restore)
  useEffect(() => {
    if (!isRestored) return;
    if (diagnosticResult) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(diagnosticResult));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [diagnosticResult, isRestored]);

  useEffect(() => {
    if (!isRestored) return;
    if (troubleshootingId) {
      localStorage.setItem(STORAGE_KEY + "_troubleshootingId", troubleshootingId);
    } else {
      localStorage.removeItem(STORAGE_KEY + "_troubleshootingId");
    }
  }, [troubleshootingId, isRestored]);

  useEffect(() => {
    if (!isRestored) return;
    if (unavailabilityId) {
      localStorage.setItem(STORAGE_KEY + "_unavailabilityId", unavailabilityId);
    } else {
      localStorage.removeItem(STORAGE_KEY + "_unavailabilityId");
    }
  }, [unavailabilityId, isRestored]);

  useEffect(() => {
    if (!isRestored) return;
    if (currentQuery) {
      localStorage.setItem(STORAGE_KEY + "_query", JSON.stringify(currentQuery));
    } else {
      localStorage.removeItem(STORAGE_KEY + "_query");
    }
  }, [currentQuery, isRestored]);

  // Fetch experts
  const { data: expertsData } = useQuery({
    queryKey: ["/api/experts"],
  });
  
  const experts = expertsData || mockExperts;

  // Create troubleshooting entry mutation
  const createTroubleshootingMutation = useMutation({
    mutationFn: async (data: { diagnosticQueryId: string; aircraftSerial: string; ata: string; problem: string; aiSuggestion: string }) => {
      const response = await apiRequest("POST", "/api/troubleshooting", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      setTroubleshootingId(data.id);
    },
  });

  // Create fleet unavailability entry mutation
  const createUnavailabilityMutation = useMutation({
    mutationFn: async (data: { diagnosticQueryId: string; aircraftSerial: string; aircraftModel: string; ataCode: string; problemDescription: string }) => {
      const response = await apiRequest("POST", "/api/fleet-unavailability", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      setUnavailabilityId(data.id);
    },
  });

  // Resolve fleet unavailability mutation
  const resolveUnavailabilityMutation = useMutation({
    mutationFn: async (data: { solution: string; technicianName: string }) => {
      if (!unavailabilityId) throw new Error("No unavailability record to resolve");
      const response = await apiRequest("PUT", `/api/fleet-unavailability/${unavailabilityId}/resolve`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-unavailability"] });
      toast({
        title: "Resolution Submitted",
        description: "Downtime has been recorded and sent to historical troubleshooting.",
      });
    },
  });

  // Search historical matches
  const searchHistoricalMatches = async (problem: string, serial: string, ata: string) => {
    try {
      const response = await fetch(`/api/troubleshooting/search?problem=${encodeURIComponent(problem)}&serial=${serial}&ata=${ata}`);
      if (response.ok) {
        const data = await response.json();
        setHistoricalMatches(data.matches || []);
      }
    } catch (error) {
      console.error("Failed to search historical matches:", error);
    }
  };

  // Submit diagnostic mutation
  const diagnosticMutation = useMutation({
    mutationFn: async (data: any) => {
      setCurrentQuery(data);
      const response = await apiRequest("POST", "/api/diagnostic", data);
      return await response.json();
    },
    onSuccess: async (data: any, variables: any) => {
      setDiagnosticResult(data);
      
      // Search for similar problems in history
      await searchHistoricalMatches(
        variables.problemDescription,
        variables.serialNumber,
        variables.ata
      );
      
      // Create troubleshooting entry for resolution tracking
      createTroubleshootingMutation.mutate({
        diagnosticQueryId: data.query_id,
        aircraftSerial: variables.serialNumber,
        ata: variables.ata,
        problem: variables.problemDescription,
        aiSuggestion: data.diagnosis_summary,
      });
      
      // Create fleet unavailability entry (starts tracking downtime)
      createUnavailabilityMutation.mutate({
        diagnosticQueryId: data.query_id,
        aircraftSerial: variables.serialNumber,
        aircraftModel: variables.aircraftModel,
        ataCode: variables.ata,
        problemDescription: variables.problemDescription,
      });
      
      toast({
        title: "Analysis Complete",
        description: `Certainty score: ${data.certainty_score}%`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "Failed to process diagnostic query",
      });
    },
  });

  const handleDiagnosticSubmit = (data: any) => {
    diagnosticMutation.mutate(data);
  };
  
  const handleNewQuery = () => {
    setDiagnosticResult(null);
    setTroubleshootingId(null);
    setUnavailabilityId(null);
    setHistoricalMatches([]);
    setCurrentQuery(null);
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + "_troubleshootingId");
    localStorage.removeItem(STORAGE_KEY + "_unavailabilityId");
    localStorage.removeItem(STORAGE_KEY + "_query");
  };

  const mockReferences = [
    { docId: "IETP-24-001", section: "§3.2.4", title: "Generator System Troubleshooting" },
    { docId: "AMP-24-015", section: "§2.1.8", title: "Generator Control Unit Inspection" },
    { docId: "TSM-24-003", section: "§4.5.2", title: "Voltage Regulator Testing Procedures" }
  ];

  const mockTests = [
    {
      step: 1,
      description: "Visual inspection of Generator Control Unit connector P1 for signs of corrosion, loose pins, or physical damage",
      expectedResult: "No visible corrosion, all pins seated properly"
    },
    {
      step: 2,
      description: "Perform continuity test on GCU connector pins 14-18 using multimeter",
      tool: "Fluke 87V Multimeter",
      expectedResult: "Resistance < 1Ω for all pins"
    },
    {
      step: 3,
      description: "Monitor voltage output at generator terminals under load conditions",
      tool: "Digital Voltage Analyzer DVA-5000",
      expectedResult: "Steady 28.5V ± 0.5V under varying loads"
    }
  ];

  const mockCauses = [
    {
      cause: "Generator Control Unit (GCU) Failure",
      probability: 85,
      reasoning: "Symptom pattern matches 73% of historical GCU failures. Voltage fluctuations and intermittent warnings are key indicators.",
      ataCode: "24"
    },
    {
      cause: "Voltage Regulator Malfunction",
      probability: 68,
      reasoning: "Secondary diagnostic path based on voltage drop characteristics. Common in high-cycle aircraft.",
      ataCode: "24"
    },
    {
      cause: "Connector P1 Corrosion/Contact Issue",
      probability: 52,
      reasoning: "Environmental exposure and age of aircraft increase likelihood of connector degradation.",
      ataCode: "24"
    }
  ];

  const mockParts = [
    {
      partNumber: "3A5100-1",
      description: "Generator Control Unit (GCU)",
      location: "Bay 4, Frame 28R",
      status: "INSPECT" as const
    },
    {
      partNumber: "MS3106A-20-4S",
      description: "Connector Assembly P1",
      location: "GCU Interface",
      status: "INSPECT" as const
    },
    {
      partNumber: "M39029/58-364",
      description: "Contact Pin (Qty: 18)",
      location: "Connector P1",
      status: "TEST" as const
    }
  ];

  const mockMatches = [
    {
      queryId: "Q-2024-11-1823",
      timestamp: "2024-11-18",
      similarity: 91,
      aircraftSerial: "41287",
      resolution: "Replaced GCU P/N 3A5100-1, tested successfully"
    },
    {
      queryId: "Q-2024-10-2947",
      timestamp: "2024-10-29",
      similarity: 87,
      aircraftSerial: "41305",
      resolution: "Cleaned connector P1, restored continuity"
    },
    {
      queryId: "Q-2024-09-1542",
      timestamp: "2024-09-15",
      similarity: 78,
      aircraftSerial: "41298",
      resolution: "Voltage regulator adjustment per AMM 24-21-02"
    }
  ];


  const mockDMCTool = {
    connectorType: "MS3106A-20-4S",
    pinType: "Size 16 Socket Contact",
    crimpTool: "Daniels DMC HX4",
    insertTool: "M81969/14-01 Insertion Tool",
    extractTool: "M81969/14-02 Extraction Tool",
    crimpForce: "1800-2200 lbs",
    safetyWarnings: "CRITICAL: Verify crimp height (0.068-0.072 inches) using go/no-go gauge before installation. Incorrect crimp can cause intermittent contact and system failure.",
    status: "exact_match" as const
  };

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <AircraftInfoBanner 
        model="AW139"
        serialNumber="41287"
        lastMaintenance="2024-11-20"
        activeQueries={3}
      />

      <DisclaimerNotice />

      {!diagnosticResult ? (
        <DiagnosticForm onSubmit={handleDiagnosticSubmit} isLoading={diagnosticMutation.isPending} />
      ) : (
        <div className="space-y-6">
          <CertaintyScoreDisplay 
            score={diagnosticResult.certainty_score} 
            status={diagnosticResult.certainty_status} 
          />

          {/* Aircraft Configuration Display - System Generated (Read-Only) */}
          <div className="bg-card border border-border rounded-lg p-4" data-testid="aircraft-configuration-display">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Aircraft:</span>
                  <span className="font-mono font-bold text-foreground">{diagnosticResult.aircraft?.serialNumber}</span>
                </div>
                {diagnosticResult.aircraft?.configuration ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Configuration:</span>
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-bold">
                      AW139 {diagnosticResult.aircraft.configuration.code}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({diagnosticResult.aircraft.configuration.name})
                    </span>
                  </div>
                ) : null}
                {diagnosticResult.aircraft?.configuration?.source && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Source: {diagnosticResult.aircraft.configuration.source}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                System Generated
              </div>
            </div>
          </div>

          {/* Configuration Warning - Show when effectivity data is incomplete */}
          {diagnosticResult.aircraft?.configurationWarning && (
            <div className="bg-orange-500/10 border-2 border-orange-500 rounded-lg p-4" data-testid="alert-configuration-warning">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-1">
                    Configuration Warning
                  </h4>
                  <p className="text-sm text-foreground">
                    {diagnosticResult.aircraft.configurationWarning}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Part number applicability cannot be verified. Review all part recommendations carefully.
                  </p>
                </div>
              </div>
            </div>
          )}

          {diagnosticResult.previous_solutions?.found && (
            <div className="bg-amber-500/10 border-2 border-amber-500 rounded-lg p-6" data-testid="alert-previous-solutions">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-2">
                    Previous Solution Found!
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {diagnosticResult.previous_solutions.message}
                  </p>
                  <div className="space-y-4">
                    {diagnosticResult.previous_solutions.solutions.map((sol: any, idx: number) => (
                      <div key={sol.id || idx} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex flex-wrap gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Aircraft S/N:</span>
                            <span className="font-mono font-bold text-foreground">{sol.aircraftSerial}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Resolved:</span>
                            <span className="font-medium text-foreground">
                              {sol.resolvedAt ? new Date(sol.resolvedAt).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              }) : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Technician:</span>
                            <span className="font-medium text-foreground">{sol.technicianName || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">ATA:</span>
                            <span className="font-mono font-medium text-foreground">{sol.ata}</span>
                          </div>
                        </div>
                        <div className="mb-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase">Original Problem:</span>
                          <p className="text-sm text-foreground mt-1">{sol.problem}</p>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase">Solution Applied:</span>
                          <p className="text-sm text-foreground mt-1 font-medium">{sol.solution || 'No solution recorded'}</p>
                        </div>
                        {sol.replacedParts && sol.replacedParts.length > 0 && (
                          <div className="mt-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Parts Replaced:</span>
                            <div className="mt-2 space-y-1">
                              {sol.replacedParts.map((part: any, pIdx: number) => (
                                <div key={pIdx} className="text-xs font-mono bg-muted/50 rounded px-2 py-1">
                                  <span className="text-red-500">OFF:</span> {part.partOffPn} {part.partOffSn && `(S/N: ${part.partOffSn})`}
                                  <span className="mx-2 text-muted-foreground">→</span>
                                  <span className="text-green-500">ON:</span> {part.partOnPn} {part.partOnSn && `(S/N: ${part.partOnSn})`}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DiagnosisResultCard 
            summary={diagnosticResult.diagnosis_summary}
            references={Array.isArray(diagnosticResult.references) ? diagnosticResult.references : []}
            certaintyScore={diagnosticResult.certainty_score}
            serialNumber={diagnosticResult.aircraft?.serialNumber}
            configuration={diagnosticResult.aircraft?.configuration}
          />

          <div className="grid lg:grid-cols-2 gap-6">
            <RecommendedTestsList tests={diagnosticResult.recommended_tests || []} />
            <LikelyCausesList causes={diagnosticResult.likely_causes || []} />
          </div>

          <AffectedPartsList parts={diagnosticResult.affected_parts || []} />

          {diagnosticResult.historical_matches?.length > 0 && (
            <HistoricalMatchesTable matches={diagnosticResult.historical_matches} />
          )}

          {diagnosticResult.smart_stock && Array.isArray(diagnosticResult.smart_stock.highFailureParts) && diagnosticResult.smart_stock.highFailureParts.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Smart Stock Analysis</h3>
              <div className="space-y-3">
                {(diagnosticResult.smart_stock.highFailureParts || []).map((part: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    <span className="font-mono text-muted-foreground">{part.partNumber}</span> - {part.recommendation}
                  </div>
                ))}
              </div>
            </div>
          )}

          {diagnosticResult.ata_occurrence_browser && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">ATA Occurrence Browser</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">30-day recurrence</p>
                  <p className="font-semibold">{diagnosticResult.ata_occurrence_browser.recurrence30d}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MTTR</p>
                  <p className="font-semibold">{diagnosticResult.ata_occurrence_browser.mttr}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MTBF</p>
                  <p className="font-semibold">{diagnosticResult.ata_occurrence_browser.mtbf}</p>
                </div>
              </div>
            </div>
          )}

          {diagnosticResult.dmc_tool_selection && (
            <DMCToolSelector tool={diagnosticResult.dmc_tool_selection} />
          )}

          {diagnosticResult.suggest_book_expert && (
            <ExpertBookingCard 
              experts={experts as any}
              reason={diagnosticResult.suggest_book_expert.reason}
            />
          )}

          {historicalMatches.length > 0 && (
            <HistoricalMatchesAlert 
              matches={historicalMatches}
              currentProblem={currentQuery?.problemDescription || ""}
            />
          )}

          <MechanicLogCard
            onSubmit={(data) => {
              resolveUnavailabilityMutation.mutate({
                solution: data.solution,
                technicianName: data.technicianName,
              });
            }}
            isSubmitting={resolveUnavailabilityMutation.isPending}
            isResolved={resolveUnavailabilityMutation.isSuccess}
          />

          <DiagnosticDisclaimerFooter />

          <div className="flex justify-center pt-4">
            <button
              onClick={handleNewQuery}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-new-query"
            >
              ← Submit New Query
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
