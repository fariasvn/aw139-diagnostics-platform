import { db } from "../db/index";
import { ipdEffectivityCodes, ipdEffectivityRanges } from "../shared/schema";
import { parseIpdEffectivityFile } from "./parse-ipd-effectivity";
import * as path from "path";
import { sql } from "drizzle-orm";

export async function seedIpdEffectivity() {
  const filePath = path.resolve(
    process.cwd(),
    "attached_assets/Pasted-Illustrated-parts-data-List-of-effectivity-codes-Table-_1770338729458.txt"
  );

  console.log("Parsing IPD effectivity codes from IETP...");
  const parsed = parseIpdEffectivityFile(filePath);

  const expectedCodes = new Set(parsed.map((c) => c.code)).size;
  const expectedRanges = parsed.reduce((sum, c) => sum + c.ranges.length, 0);

  console.log(`Parsed ${parsed.length} entries (${expectedCodes} unique codes, ${expectedRanges} ranges)`);

  const existingCodes = await db.select({ count: sql<number>`count(*)` }).from(ipdEffectivityCodes);
  const existingRanges = await db.select({ count: sql<number>`count(*)` }).from(ipdEffectivityRanges);

  if (existingCodes[0]?.count >= expectedCodes && existingRanges[0]?.count >= expectedRanges) {
    console.log(`IPD effectivity data complete (${existingCodes[0].count} codes, ${existingRanges[0].count} ranges). Skipping.`);
    return;
  }

  console.log(`Current state: ${existingCodes[0]?.count || 0} codes, ${existingRanges[0]?.count || 0} ranges. Re-seeding...`);

  await db.transaction(async (tx) => {
    await tx.delete(ipdEffectivityRanges);
    await tx.delete(ipdEffectivityCodes);

    const uniqueCodes = new Map<string, typeof parsed[0]>();
    for (const entry of parsed) {
      if (!uniqueCodes.has(entry.code)) {
        uniqueCodes.set(entry.code, entry);
      }
    }

    const codeBatchSize = 50;
    const codeEntries = Array.from(uniqueCodes.values());
    for (let i = 0; i < codeEntries.length; i += codeBatchSize) {
      const batch = codeEntries.slice(i, i + codeBatchSize);
      await tx.insert(ipdEffectivityCodes).values(
        batch.map((c) => ({
          code: c.code,
          description: c.description,
          isDeleted: c.isDeleted ? 1 : 0,
          isConditional: c.isConditional ? 1 : 0,
          conditionalPartNumber: c.conditionalPartNumber,
        }))
      );
    }
    console.log(`Inserted ${codeEntries.length} unique effectivity codes`);

    const allRanges = parsed.flatMap((c) =>
      c.ranges.map((r) => ({
        code: c.code,
        serialStart: r.serialStart,
        serialEnd: r.serialEnd,
      }))
    );

    const rangeBatchSize = 100;
    for (let i = 0; i < allRanges.length; i += rangeBatchSize) {
      const batch = allRanges.slice(i, i + rangeBatchSize);
      await tx.insert(ipdEffectivityRanges).values(batch);
    }
    console.log(`Inserted ${allRanges.length} serial ranges`);
  });

  const stats = {
    totalCodes: new Set(parsed.map((c) => c.code)).size,
    totalRanges: parsed.reduce((sum, c) => sum + c.ranges.length, 0),
    deletedCodes: parsed.filter((c) => c.isDeleted).length,
    conditionalCodes: parsed.filter((c) => c.isConditional).length,
    activeCodesWithRanges: parsed.filter((c) => !c.isDeleted && c.ranges.length > 0).length,
  };
  console.log("IPD Effectivity seeding complete:", stats);
}

seedIpdEffectivity()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
