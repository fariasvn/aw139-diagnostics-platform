import DiagnosisResultCard from '../DiagnosisResultCard';

export default function DiagnosisResultCardExample() {
  const mockReferences = [
    { docId: "IETP-24-001", section: "§3.2.4", title: "Generator System Troubleshooting" },
    { docId: "AMP-24-015", section: "§2.1.8", title: "Generator Control Unit Inspection" },
    { docId: "TSM-24-003", section: "§4.5.2", title: "Voltage Regulator Testing Procedures" }
  ];

  return (
    <div className="p-8 space-y-4">
      <DiagnosisResultCard 
        summary="Based on the voltage fluctuation symptoms and ATA 24 classification, the most probable cause is a faulty Generator Control Unit (GCU). The reported intermittent warning lights and voltage drops between 26-29V are consistent with GCU failure patterns documented in service bulletins. Recommend immediate inspection of connector P1 for corrosion and continuity testing of pins 14-18."
        references={mockReferences}
        certaintyScore={97}
      />
      <DiagnosisResultCard 
        summary="Preliminary assessment suggests potential fuel pump relay issue based on symptom description. However, additional data required for definitive diagnosis."
        references={[{ docId: "IETP-28-002", section: "§1.3.1", title: "Fuel System Diagnostics" }]}
        certaintyScore={78}
      />
    </div>
  );
}
