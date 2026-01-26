import HistoricalMatchesTable from '../HistoricalMatchesTable';

export default function HistoricalMatchesTableExample() {
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

  return (
    <div className="p-8">
      <HistoricalMatchesTable matches={mockMatches} />
    </div>
  );
}
