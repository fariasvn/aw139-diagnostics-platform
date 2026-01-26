/**
 * ATA 100 Analytics Engine
 * Computes failure rates, recurrence patterns, MTTR, MTBF for aircraft systems
 */

import { db } from "../db/index";
import { ataOccurrences, parts } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";

interface ATAAnalytics {
  ataCode: string;
  recurrence30d: string;
  recurrence60d: string;
  recurrence90d: string;
  mttr: string; // Mean Time To Repair
  mtbf: string; // Mean Time Between Failures
  mostReplacedParts: Array<{ partNumber: string; count: number }>;
  failureRate: number; // percentage
  trend: "increasing" | "stable" | "decreasing";
}

export async function analyzeATASystem(ataCode: string): Promise<ATAAnalytics> {
  const now = new Date();
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const days60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get occurrences by time period
  const occurrences30 = await db
    .select()
    .from(ataOccurrences)
    .where(
      and(
        eq(ataOccurrences.ataCode, ataCode),
        gte(ataOccurrences.occurrenceDate, days30)
      )
    );

  const occurrences60 = await db
    .select()
    .from(ataOccurrences)
    .where(
      and(
        eq(ataOccurrences.ataCode, ataCode),
        gte(ataOccurrences.occurrenceDate, days60)
      )
    );

  const occurrences90 = await db
    .select()
    .from(ataOccurrences)
    .where(
      and(
        eq(ataOccurrences.ataCode, ataCode),
        gte(ataOccurrences.occurrenceDate, days90)
      )
    );

  // Calculate MTTR (average days to resolution)
  const mttrValues = occurrences90
    .filter(o => o.daysToResolution !== null)
    .map(o => o.daysToResolution || 0);
  const mttr = mttrValues.length > 0 
    ? `${(mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length).toFixed(1)}-${(Math.max(...mttrValues)).toFixed(0)} hours`
    : "Unknown";

  // Calculate failure rate and trend
  const recentCount = occurrences30.length;
  const oldCount = occurrences90.length - recentCount;
  const failureRate = recentCount / 30 * 100;
  const trend = recentCount > oldCount / 2 ? "increasing" : "stable";

  // Get most replaced parts for this ATA
  const relatedParts = await db
    .select()
    .from(parts)
    .where(eq(parts.ataCode, ataCode));

  const mostReplacedParts = relatedParts
    .sort((a, b) => (b.timesReplaced || 0) - (a.timesReplaced || 0))
    .slice(0, 5)
    .map(p => ({ partNumber: p.partNumber, count: p.timesReplaced || 0 }));

  // Estimate MTBF based on occurrence frequency
  const estimatedHoursBetweenFailures = occurrences90.length > 0 
    ? `${Math.round(90 * 24 / occurrences90.length)}-${Math.round(120 * 24 / occurrences90.length)} flight hours`
    : "800-1200 flight hours";

  return {
    ataCode,
    recurrence30d: `${recentCount} occurrences`,
    recurrence60d: `${occurrences60.length} occurrences`,
    recurrence90d: `${occurrences90.length} occurrences`,
    mttr,
    mtbf: estimatedHoursBetweenFailures,
    mostReplacedParts,
    failureRate,
    trend
  };
}
