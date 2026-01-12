import QuotaIndicator from '../QuotaIndicator';

export default function QuotaIndicatorExample() {
  return (
    <div className="p-8 space-y-4">
      <QuotaIndicator planType="BASIC" remaining={3} total={5} />
      <QuotaIndicator planType="BASIC" remaining={1} total={5} />
      <QuotaIndicator planType="ENTERPRISE" remaining={999} />
    </div>
  );
}
