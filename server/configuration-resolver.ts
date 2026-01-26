import { db } from "../db";
import { serialEffectivity, aircraftConfigurations, partEffectivity } from "@shared/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import type { ConfigurationResolution } from "@shared/schema";

const CONFIGURATION_NAMES: Record<string, string> = {
  SN: "Short Nose",
  LN: "Long Nose",
  ENH: "Enhanced",
  PLUS: "PLUS",
};

export async function resolveConfiguration(serialNumber: string): Promise<ConfigurationResolution> {
  const numericSerial = parseInt(serialNumber.replace(/\D/g, ""), 10);
  
  if (isNaN(numericSerial)) {
    return {
      serialNumber,
      configuration: null,
      configurationName: null,
      effectivityCode: null,
      source: null,
      sourceRevision: null,
      warning: "Invalid serial number format. Unable to resolve aircraft configuration.",
      isResolved: false,
    };
  }

  try {
    const effectivityMatch = await db
      .select()
      .from(serialEffectivity)
      .where(
        and(
          lte(serialEffectivity.serialStart, numericSerial),
          gte(serialEffectivity.serialEnd, numericSerial)
        )
      )
      .limit(1);

    if (effectivityMatch.length === 0) {
      return {
        serialNumber,
        configuration: null,
        configurationName: null,
        effectivityCode: null,
        source: null,
        sourceRevision: null,
        warning: `Serial number ${serialNumber} not found in effectivity database. Configuration-aware filtering disabled. Part applicability cannot be verified.`,
        isResolved: false,
      };
    }

    const match = effectivityMatch[0];
    const configCode = match.configurationCode;

    return {
      serialNumber,
      configuration: configCode,
      configurationName: CONFIGURATION_NAMES[configCode] || configCode,
      effectivityCode: match.effectivityCode,
      source: match.sourceDocument,
      sourceRevision: match.sourceRevision,
      warning: null,
      isResolved: true,
    };
  } catch (error) {
    console.error("Error resolving configuration:", error);
    return {
      serialNumber,
      configuration: null,
      configurationName: null,
      effectivityCode: null,
      source: null,
      sourceRevision: null,
      warning: "Database error while resolving aircraft configuration. Contact system administrator.",
      isResolved: false,
    };
  }
}

export async function getApplicableParts(
  partNumbers: string[],
  configurationCode: string
): Promise<{ applicable: string[]; notApplicable: string[]; unknown: string[] }> {
  if (!configurationCode || partNumbers.length === 0) {
    return { applicable: [], notApplicable: [], unknown: partNumbers };
  }

  try {
    const effectivityRecords = await db
      .select()
      .from(partEffectivity)
      .where(
        and(
          eq(partEffectivity.configurationCode, configurationCode)
        )
      );

    const applicableSet = new Set(
      effectivityRecords
        .filter(r => r.isApplicable === 1)
        .map(r => r.partNumber.toUpperCase())
    );

    const notApplicableSet = new Set(
      effectivityRecords
        .filter(r => r.isApplicable === 0)
        .map(r => r.partNumber.toUpperCase())
    );

    const applicable: string[] = [];
    const notApplicable: string[] = [];
    const unknown: string[] = [];

    for (const pn of partNumbers) {
      const upperPn = pn.toUpperCase();
      if (applicableSet.has(upperPn)) {
        applicable.push(pn);
      } else if (notApplicableSet.has(upperPn)) {
        notApplicable.push(pn);
      } else {
        unknown.push(pn);
      }
    }

    return { applicable, notApplicable, unknown };
  } catch (error) {
    console.error("Error checking part applicability:", error);
    return { applicable: [], notApplicable: [], unknown: partNumbers };
  }
}

export async function getAllConfigurations() {
  return db.select().from(aircraftConfigurations);
}

export async function getSerialEffectivityRanges() {
  return db.select().from(serialEffectivity);
}
