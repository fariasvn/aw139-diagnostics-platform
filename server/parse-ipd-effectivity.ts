import * as fs from "fs";
import * as path from "path";

interface ParsedCode {
  code: string;
  description: string;
  isDeleted: boolean;
  isConditional: boolean;
  conditionalPartNumber: string | null;
  ranges: Array<{ serialStart: number; serialEnd: number }>;
}

function extractSerialRangesFromText(text: string): Array<{ serialStart: number; serialEnd: number }> {
  const ranges: Array<{ serialStart: number; serialEnd: number }> = [];

  const thruPattern = /S\/N\s+(\d+)\s+thru\s+(\d+)/g;
  let match;
  while ((match = thruPattern.exec(text)) !== null) {
    ranges.push({ serialStart: parseInt(match[1]), serialEnd: parseInt(match[2]) });
  }

  const thruTBDPattern = /S\/N\s+(\d+)\s+thru\s+TBD/gi;
  while ((match = thruTBDPattern.exec(text)) !== null) {
    ranges.push({ serialStart: parseInt(match[1]), serialEnd: 99999 });
  }

  const tbdThruPattern = /S\/N\s+TBD\s+thru\s+(\d+)/gi;
  while ((match = tbdThruPattern.exec(text)) !== null) {
    ranges.push({ serialStart: 1, serialEnd: parseInt(match[1]) });
  }

  const subsequentPattern = /S\/N\s+(\d+)\s+and\s+subsequent/g;
  while ((match = subsequentPattern.exec(text)) !== null) {
    ranges.push({ serialStart: parseInt(match[1]), serialEnd: 99999 });
  }

  const twoAndPattern = /S\/N\s+(\d+)\s+and\s+(\d+)(?!\s+subsequent)/g;
  while ((match = twoAndPattern.exec(text)) !== null) {
    if (match[2] === "subsequent") continue;
    ranges.push({ serialStart: parseInt(match[1]), serialEnd: parseInt(match[1]) });
    ranges.push({ serialStart: parseInt(match[2]), serialEnd: parseInt(match[2]) });
  }

  const singlePattern = /S\/N\s+(\d+)(?!\s+thru|\s+and|\d)/g;
  while ((match = singlePattern.exec(text)) !== null) {
    const sn = parseInt(match[1]);
    const alreadyFound = ranges.some(
      (r) => (r.serialStart === sn && r.serialEnd === sn) || (sn >= r.serialStart && sn <= r.serialEnd)
    );
    if (!alreadyFound) {
      ranges.push({ serialStart: sn, serialEnd: sn });
    }
  }

  return ranges;
}

function parseSerialLines(lines: string[]): Array<{ serialStart: number; serialEnd: number }> {
  const allText = lines.join("\n");
  return extractSerialRangesFromText(allText);
}

function extractPartNumber(description: string): string | null {
  const pnMatch = description.match(/P\/N\s+(\S+)/);
  return pnMatch ? pnMatch[1] : null;
}

export function parseIpdEffectivityFile(filePath: string): ParsedCode[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const codes: ParsedCode[] = [];
  let currentCode: string | null = null;
  let currentLines: string[] = [];
  let inCode = false;
  let headerSkipped = false;

  function flushCode() {
    if (currentCode === null) return;

    const descParts: string[] = [];
    const snLines: string[] = [];

    for (const line of currentLines) {
      const cleaned = line.trim().replace(/^:\s*/, "").replace(/^-\s*/, "").trim();
      if (cleaned.length === 0) continue;
      if (cleaned.includes("S/N")) {
        snLines.push(cleaned);
      }
      if (!cleaned.match(/^S\/N\s+\d/)) {
        descParts.push(cleaned);
      }
    }

    let description = descParts.join(" ").trim();

    if (description.length === 0 && snLines.length > 0) {
      description = snLines[0];
    }

    const isDeleted = /^Deleted$/i.test(description);
    const isConditional =
      /that have|that install|equipped with|certified by/i.test(description) &&
      !isDeleted;
    const conditionalPartNumber = isConditional
      ? extractPartNumber(description)
      : null;

    let ranges: Array<{ serialStart: number; serialEnd: number }> = [];
    if (!isDeleted) {
      ranges = parseSerialLines(currentLines);
    }

    codes.push({
      code: currentCode,
      description: description || "No description",
      isDeleted,
      isConditional,
      conditionalPartNumber,
      ranges,
    });

    currentCode = null;
    currentLines = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!headerSkipped) {
      if (trimmed === "- No code (blank)") {
        headerSkipped = true;
        currentCode = "ALL";
        currentLines = [];
        inCode = true;
      }
      continue;
    }

    const codeMatch = trimmed.match(/^\*(\w+)$/);
    if (codeMatch) {
      flushCode();
      currentCode = codeMatch[1];
      currentLines = [];
      inCode = true;
      continue;
    }

    if (!inCode) continue;

    if (trimmed === "-") {
      continue;
    }

    if (trimmed === ":") {
      continue;
    }

    if (trimmed.length > 0) {
      currentLines.push(trimmed);
    }
  }

  flushCode();

  return codes;
}

if (process.argv[1]?.endsWith("parse-ipd-effectivity.ts")) {
  const filePath = path.resolve(
    process.cwd(),
    "attached_assets/Pasted-Illustrated-parts-data-List-of-effectivity-codes-Table-_1770338729458.txt"
  );

  const parsed = parseIpdEffectivityFile(filePath);

  let totalRanges = 0;
  let deletedCount = 0;
  let conditionalCount = 0;
  let noRangesCount = 0;

  for (const code of parsed) {
    totalRanges += code.ranges.length;
    if (code.isDeleted) deletedCount++;
    if (code.isConditional) conditionalCount++;
    if (!code.isDeleted && code.ranges.length === 0) noRangesCount++;
  }

  console.log(`Parsed ${parsed.length} effectivity codes`);
  console.log(`Total serial ranges: ${totalRanges}`);
  console.log(`Deleted codes: ${deletedCount}`);
  console.log(`Conditional codes (kit/mod dependent): ${conditionalCount}`);
  console.log(`Non-deleted codes with no ranges: ${noRangesCount}`);

  const noRanges = parsed.filter((c) => !c.isDeleted && c.ranges.length === 0);
  if (noRanges.length > 0) {
    console.log("\nCodes with no ranges:");
    for (const c of noRanges) {
      console.log(`  ${c.code}: ${c.description.substring(0, 100)} [conditional=${c.isConditional}]`);
    }
  }

  console.log("\n--- Sample codes ---");
  for (const code of parsed.slice(0, 8)) {
    console.log(`\n${code.code}: ${code.description.substring(0, 80)}`);
    console.log(`  Ranges: ${JSON.stringify(code.ranges.slice(0, 3))}`);
    if (code.ranges.length > 3) console.log(`  ... and ${code.ranges.length - 3} more ranges`);
  }
}
