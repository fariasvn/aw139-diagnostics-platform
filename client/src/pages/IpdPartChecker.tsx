import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, BookOpen, CheckCircle2, XCircle, Info } from "lucide-react";

interface EffectivityCode {
  code: string;
  description: string;
  isConditional: boolean;
  conditionalPartNumber: string | null;
}

interface ResolveResponse {
  serialNumber: number;
  totalApplicableCodes: number;
  standardCodes: number;
  conditionalCodes: number;
  codes: EffectivityCode[];
}

interface ConfigResolution {
  found: boolean;
  serialNumber: string;
  configCode?: string;
  configName?: string;
  ietpCode?: string;
}

const CONFIG_LABELS: Record<string, { label: string; color: string }> = {
  SN: { label: "Short Nose", color: "bg-blue-600 text-white" },
  LN: { label: "Long Nose", color: "bg-emerald-600 text-white" },
  ENH: { label: "Enhanced", color: "bg-amber-600 text-white" },
  PLUS: { label: "PLUS", color: "bg-violet-600 text-white" },
};

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debounced;
}

export default function IpdPartChecker() {
  const [serialInput, setSerialInput] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [quickCheckInput, setQuickCheckInput] = useState("");

  const serialNumber = serialInput.trim();
  const snNum = parseInt(serialNumber);
  const isValidSn = !isNaN(snNum) && snNum >= 31005;

  const debouncedSn = useDebounce(serialNumber, 500);
  const shouldFetch = debouncedSn.length > 0 && !isNaN(parseInt(debouncedSn)) && parseInt(debouncedSn) >= 31005;

  const { data: configData, isLoading: configLoading } = useQuery<ConfigResolution>({
    queryKey: ["/api/configuration/resolve", debouncedSn],
    enabled: shouldFetch,
  });

  const { data: ipdData, isLoading: ipdLoading } = useQuery<ResolveResponse>({
    queryKey: ["/api/ipd-effectivity/resolve", debouncedSn],
    enabled: shouldFetch,
  });

  const applicableCodeSet = useMemo(() => {
    if (!ipdData?.codes) return new Set<string>();
    return new Set(ipdData.codes.map((c) => c.code.toUpperCase()));
  }, [ipdData]);

  const configApplicable = useMemo(() => {
    if (!configData?.configCode) return new Set<string>();
    const configs = new Set<string>();
    const code = configData.configCode;
    if (code === "SN") configs.add("SN");
    if (code === "LN") configs.add("LN");
    if (code === "ENH") { configs.add("EN"); configs.add("ENH"); }
    if (code === "PLUS") { configs.add("EP"); configs.add("PLUS"); }
    return configs;
  }, [configData]);

  const filteredCodes = useMemo(() => {
    if (!ipdData?.codes) return [];
    if (!codeSearch.trim()) return ipdData.codes;
    const search = codeSearch.trim().toUpperCase();
    return ipdData.codes.filter(
      (c) =>
        c.code.toUpperCase().includes(search) ||
        c.description.toUpperCase().includes(search)
    );
  }, [ipdData, codeSearch]);

  const quickCheckResults = useMemo(() => {
    if (!quickCheckInput.trim() || !shouldFetch) return [];
    const tokens = quickCheckInput
      .trim()
      .toUpperCase()
      .split(/[\s,;]+/)
      .filter((t) => t.length > 0)
      .map((t) => t.replace(/^\*/, ""));

    return tokens.map((token) => {
      if (["SN", "LN"].includes(token)) {
        return {
          code: token,
          applicable: configApplicable.has(token),
          type: "configuration" as const,
        };
      }
      if (["EN", "ENH"].includes(token)) {
        return {
          code: token,
          applicable: configApplicable.has("EN") || configApplicable.has("ENH"),
          type: "configuration" as const,
        };
      }
      if (["EP", "PLUS"].includes(token)) {
        return {
          code: token,
          applicable: configApplicable.has("EP") || configApplicable.has("PLUS"),
          type: "configuration" as const,
        };
      }
      return {
        code: token,
        applicable: applicableCodeSet.has(token),
        type: "effectivity" as const,
      };
    });
  }, [quickCheckInput, applicableCodeSet, configApplicable, shouldFetch]);

  const isLoading = configLoading || ipdLoading;

  return (
    <div className="space-y-6" data-testid="page-ipd-checker">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          IPD Part Checker
        </h1>
        <p className="text-muted-foreground mt-2">
          Verify which parts from any IPD page apply to your aircraft serial number
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aircraft Identification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">
                Serial Number (S/N)
              </label>
              <Input
                data-testid="input-serial-number"
                placeholder="e.g. 31287, 41501, 60105"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                className="font-mono text-lg"
              />
            </div>
            {isLoading && shouldFetch && (
              <div className="flex items-center gap-2 text-muted-foreground pb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Resolving...</span>
              </div>
            )}
            {configData?.found && !isLoading && (
              <div className="flex items-center gap-2 pb-2 flex-wrap">
                <Badge className={CONFIG_LABELS[configData.configCode || ""]?.color || ""}>
                  {configData.configName || configData.configCode}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">
                  IETP: {configData.ietpCode}
                </span>
              </div>
            )}
            {serialNumber && !isValidSn && (
              <p className="text-sm text-destructive pb-2">
                Enter a valid serial number (31005 or higher)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {shouldFetch && ipdData && !isLoading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Code Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Type the effectivity codes from the IPD page (e.g. "EP 20N" or "SN 3D") to check applicability:
              </p>
              <Input
                data-testid="input-quick-check"
                placeholder="e.g. EP *20N or SN *3D *3E"
                value={quickCheckInput}
                onChange={(e) => setQuickCheckInput(e.target.value)}
                className="font-mono"
              />
              {quickCheckResults.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {quickCheckResults.map((result, i) => (
                    <div
                      key={`${result.code}-${i}`}
                      data-testid={`quick-check-result-${result.code}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                        result.applicable
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-destructive/30 bg-destructive/10"
                      }`}
                    >
                      {result.applicable ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span className="font-mono font-medium">
                        {result.type === "effectivity" ? `*${result.code}` : result.code}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {result.applicable ? "APPLICABLE" : "NOT APPLICABLE"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-md">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Applicable</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-codes">
                      {ipdData.totalApplicableCodes}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-md">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Standard Codes</p>
                    <p className="text-2xl font-bold" data-testid="stat-standard-codes">
                      {ipdData.standardCodes}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-md">
                    <Info className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conditional Codes</p>
                    <p className="text-2xl font-bold" data-testid="stat-conditional-codes">
                      {ipdData.conditionalCodes}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">
                  All Applicable IPD Effectivity Codes
                </CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-code-search"
                    placeholder="Search codes..."
                    value={codeSearch}
                    onChange={(e) => setCodeSearch(e.target.value)}
                    className="pl-9 font-mono"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-24 font-mono">Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-32">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          {codeSearch ? "No codes matching your search" : "No applicable codes found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCodes.map((code) => (
                        <TableRow key={code.code} data-testid={`row-code-${code.code}`}>
                          <TableCell className="font-mono font-medium">
                            *{code.code}
                          </TableCell>
                          <TableCell className="text-sm">
                            {code.description}
                            {code.conditionalPartNumber && (
                              <span className="ml-2 font-mono text-xs text-muted-foreground">
                                (P/N {code.conditionalPartNumber})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {code.isConditional ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-600/30">
                                Conditional
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-600/30">
                                Standard
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredCodes.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Showing {filteredCodes.length} of {ipdData.totalApplicableCodes} codes
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
