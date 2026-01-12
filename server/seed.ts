import { db } from "../db/index";
import { users, experts, dmcTools, diagnosticQueries } from "../shared/schema";

async function seed() {
  console.log("Starting database seed...");

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
