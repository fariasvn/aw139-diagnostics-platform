import LikelyCausesList from '../LikelyCausesList';

export default function LikelyCausesListExample() {
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

  return (
    <div className="p-8">
      <LikelyCausesList causes={mockCauses} />
    </div>
  );
}
