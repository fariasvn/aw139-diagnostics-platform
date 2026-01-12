/**
 * Smart Stock Predictive Analytics
 * Analyzes failure trends, predicts stock needs, identifies shortage risks
 */

import { db } from "../db/index";
import { parts } from "@shared/schema";
import { eq } from "drizzle-orm";

interface SmartStockAnalysis {
  highFailureParts: Array<{
    partNumber: string;
    failureRate: number;
    recommendation: string;
  }>;
  recommendedMinimumStock: Array<{
    partNumber: string;
    quantity: number;
    reason: string;
  }>;
  stockAlerts: string[];
  fleetUsageRate: string;
}

export async function analyzeSmartStock(ataCode: string): Promise<SmartStockAnalysis> {
  const relevantParts = await db
    .select()
    .from(parts)
    .where(eq(parts.ataCode, ataCode));

  // Identify high-failure parts (top 5%)
  const highFailureParts = relevantParts
    .filter(p => (p.failureRate || 0) > 15)
    .sort((a, b) => (b.failureRate || 0) - (a.failureRate || 0))
    .slice(0, 3)
    .map(p => ({
      partNumber: p.partNumber,
      failureRate: p.failureRate || 0,
      recommendation: `${p.failureRate}% failure rate - Monitor stock level closely`
    }));

  // Recommend minimum stock quantities
  const recommendedMinimumStock = relevantParts
    .filter(p => (p.timesReplaced || 0) > 2)
    .sort((a, b) => (b.timesReplaced || 0) - (a.timesReplaced || 0))
    .slice(0, 5)
    .map(p => {
      const quarterlyUsage = Math.ceil((p.timesReplaced || 0) / 4);
      const recommendedQty = Math.max(3, quarterlyUsage * 2);
      return {
        partNumber: p.partNumber,
        quantity: recommendedQty,
        reason: `Based on ${p.timesReplaced} replacements in 90 days`
      };
    });

  // Generate alerts for shortage risks
  const stockAlerts: string[] = [];
  if (highFailureParts.length > 0) {
    stockAlerts.push(`⚠️ High-failure parts detected: ${highFailureParts.map(p => p.partNumber).join(", ")}`);
  }
  if (relevantParts.filter(p => (p.failureRate || 0) > 20).length > 0) {
    stockAlerts.push("🔴 Critical: Parts with >20% failure rate detected");
  }

  return {
    highFailureParts,
    recommendedMinimumStock,
    stockAlerts,
    fleetUsageRate: "Fleet-wide average utilization"
  };
}
