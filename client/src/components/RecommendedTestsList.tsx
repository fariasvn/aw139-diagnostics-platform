import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Wrench } from "lucide-react";

interface RecommendedTest {
  step: number;
  description: string;
  tool?: string;
  expectedResult: string;
}

interface RecommendedTestsListProps {
  tests: RecommendedTest[];
}

export default function RecommendedTestsList({ tests }: RecommendedTestsListProps) {
  return (
    <Card data-testid="card-recommended-tests">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Recommended Tests</CardTitle>
        <Badge variant="outline" className="font-mono text-xs">
          <CheckSquare className="w-3 h-3 mr-1" />
          {tests.length} Steps
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tests.map((test) => (
            <div 
              key={test.step} 
              className="flex gap-4 p-4 rounded-md border bg-card hover-elevate"
              data-testid={`test-step-${test.step}`}
            >
              <div className="flex-shrink-0">
                <Badge className="w-8 h-8 flex items-center justify-center rounded-full p-0 font-semibold">
                  {test.step}
                </Badge>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium leading-relaxed">{test.description}</p>
                {test.tool && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wrench className="w-3 h-3" />
                    <span className="font-mono">{test.tool}</span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Expected: </span>
                    {test.expectedResult}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
