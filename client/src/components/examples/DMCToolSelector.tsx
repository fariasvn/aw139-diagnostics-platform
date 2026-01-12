import DMCToolSelector from '../DMCToolSelector';

export default function DMCToolSelectorExample() {
  const mockTool = {
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
    <div className="p-8">
      <DMCToolSelector tool={mockTool} />
    </div>
  );
}
