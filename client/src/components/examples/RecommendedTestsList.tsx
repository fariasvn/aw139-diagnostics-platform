import RecommendedTestsList from '../RecommendedTestsList';

export default function RecommendedTestsListExample() {
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

  return (
    <div className="p-8">
      <RecommendedTestsList tests={mockTests} />
    </div>
  );
}
