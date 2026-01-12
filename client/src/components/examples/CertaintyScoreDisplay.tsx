import CertaintyScoreDisplay from '../CertaintyScoreDisplay';

export default function CertaintyScoreDisplayExample() {
  return (
    <div className="space-y-4 p-8">
      <CertaintyScoreDisplay score={97} status="SAFE_TO_PROCEED" />
      <CertaintyScoreDisplay score={82} status="REQUIRE_EXPERT" />
    </div>
  );
}
