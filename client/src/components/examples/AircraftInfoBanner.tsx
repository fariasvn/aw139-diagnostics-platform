import AircraftInfoBanner from '../AircraftInfoBanner';

export default function AircraftInfoBannerExample() {
  return (
    <div className="p-8">
      <AircraftInfoBanner 
        model="AW139"
        serialNumber="41287"
        lastMaintenance="2024-11-20"
        activeQueries={3}
      />
    </div>
  );
}
