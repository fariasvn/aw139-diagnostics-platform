import AffectedPartsList from '../AffectedPartsList';

export default function AffectedPartsListExample() {
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

  return (
    <div className="p-8">
      <AffectedPartsList parts={mockParts} />
    </div>
  );
}
