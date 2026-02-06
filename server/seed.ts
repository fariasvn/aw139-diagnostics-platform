import { db } from "../db/index";
import { users, experts, dmcTools, diagnosticQueries, serialEffectivity, aircraftConfigurations } from "../shared/schema";

async function seed() {
  console.log("Starting database seed...");

  console.log("Seeding aircraft configurations...");
  await db.insert(aircraftConfigurations).values([
    { code: "SN", name: "Short Nose", description: "AW139 Short Nose variant - earliest production configuration" },
    { code: "LN", name: "Long Nose", description: "AW139 Long Nose variant - extended nose section for additional avionics" },
    { code: "ENH", name: "Enhanced", description: "AW139 Enhanced variant - improved systems and components" },
    { code: "PLUS", name: "PLUS", description: "AW139 PLUS variant - latest production configuration with all enhancements" },
  ]).onConflictDoNothing();

  console.log("Seeding serial effectivity (IETP Table 2 - Applicability Codes)...");
  await db.insert(serialEffectivity).values([
    { serialStart: 31005, serialEnd: 31200, configurationCode: "SN", effectivityCode: "1J", sourceDocument: "IETP List of Effectivity Codes - Table 2", sourceRevision: "Current", notes: "Short Nose - 31xxx series" },
    { serialStart: 41001, serialEnd: 41200, configurationCode: "SN", effectivityCode: "1J", sourceDocument: "IETP List of Effectivity Codes - Table 2", sourceRevision: "Current", notes: "Short Nose - 41xxx series" },
    { serialStart: 31201, serialEnd: 31399, configurationCode: "LN", effectivityCode: "1L", sourceDocument: "IETP List of Effectivity Codes - Table 2", sourceRevision: "Current", notes: "Long Nose - 31xxx series" },
    { serialStart: 41201, serialEnd: 41299, configurationCode: "LN", effectivityCode: "1L", sourceDocument: "IETP List of Effectivity Codes - Table 2", sourceRevision: "Current", notes: "Long Nose - 41xxx series" },
    { serialStart: 31400, serialEnd: 31699, configurationCode: "ENH", effectivityCode: "A1", sourceDocument: "IETP List of Effectivity Codes - Table 2", sourceRevision: "Current", notes: "Enhanced - 31xxx series" },
    { serialStart: 41300, serialEnd: 41499, configurationCode: "ENH", effectivityCode: "A1", sourceDocument: "IETP List of Effectivity Codes - Table 2", sourceRevision: "Current", notes: "Enhanced - 41xxx series" },
    { serialStart: 60001, serialEnd: 60999, configurationCode: "ENH", effectivityCode: "A1", sourceDocument: "IETP List of Effectivity Codes - Table 2", sourceRevision: "Current", notes: "Enhanced - 60xxx series" },
    { serialStart: 31700, serialEnd: 40999, configurationCode: "PLUS", effectivityCode: "A8", sourceDocument: "IETP List of Effectivity Codes - Table 2", sourceRevision: "Current", notes: "PLUS - 31xxx series and subsequent (per IETP: 31700 and subsequent)" },
    { serialStart: 41501, serialEnd: 59999, configurationCode: "PLUS", effectivityCode: "A8", sourceDocument: "IETP List of Effectivity Codes - Table 2", sourceRevision: "Current", notes: "PLUS - 41xxx series and subsequent (per IETP: 41501 and subsequent)" },
    { serialStart: 61001, serialEnd: 61999, configurationCode: "PLUS", effectivityCode: "A8", sourceDocument: "IETP List of Effectivity Codes - Table 2", sourceRevision: "Current", notes: "PLUS - 61xxx series" },
  ]).onConflictDoNothing();

  // Seed experts
  console.log("Seeding experts...");
  await db.insert(experts).values([
    {
      name: "Dr. Michael Chen",
      specialty: "Electrical Systems (ATA 24)",
      experience: "18 years AW139 diagnostics",
      availability: "AVAILABLE",
      imageUrl: "/assets/generated_images/expert_aerospace_engineer_headshot.png"
    },
    {
      name: "Sarah Martinez",
      specialty: "Power Plant (ATA 70-80)",
      experience: "12 years rotorcraft maintenance",
      availability: "AVAILABLE",
      imageUrl: "/assets/generated_images/female_aviation_specialist_headshot.png"
    },
    {
      name: "James Patterson",
      specialty: "Avionics & Flight Controls",
      experience: "25 years helicopter systems",
      availability: "UNAVAILABLE",
      imageUrl: "/assets/generated_images/senior_diagnostic_specialist_headshot.png"
    }
  ]).onConflictDoNothing();

  // Seed DMC tools
  console.log("Seeding DMC tools...");
  await db.insert(dmcTools).values([
    {
      connectorType: "MS3106A-20-4S",
      pinType: "Size 16 Socket Contact",
      crimpTool: "Daniels DMC HX4",
      insertTool: "M81969/14-01 Insertion Tool",
      extractTool: "M81969/14-02 Extraction Tool",
      crimpForce: "1800-2200 lbs",
      safetyWarnings: "CRITICAL: Verify crimp height (0.068-0.072 inches) using go/no-go gauge before installation. Incorrect crimp can cause intermittent contact and system failure."
    },
    {
      connectorType: "MS3102A-14S-6P",
      pinType: "Size 12 Pin Contact",
      crimpTool: "Daniels DMC AF8",
      insertTool: "M81969/1-01 Insertion Tool",
      extractTool: "M81969/1-02 Extraction Tool",
      crimpForce: "2200-2800 lbs",
      safetyWarnings: "WARNING: Use proper positioner to prevent barrel deformation. Verify contact retention with pull test (minimum 5 lbs)."
    },
    {
      connectorType: "D38999/26WE35SN",
      pinType: "Size 20 Socket Contact",
      crimpTool: "Daniels DMC HX1",
      insertTool: "M81969/14-03 Insertion Tool",
      extractTool: "M81969/14-04 Extraction Tool",
      crimpForce: "1200-1600 lbs",
      safetyWarnings: "CAUTION: These contacts are ESD sensitive. Use grounded workstation and wrist strap during installation."
    }
  ]).onConflictDoNothing();

  console.log("Database seed completed successfully!");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
