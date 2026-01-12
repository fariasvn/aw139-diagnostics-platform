import ExpertBookingCard from '../ExpertBookingCard';
import expertImage1 from '@assets/generated_images/expert_aerospace_engineer_headshot.png';
import expertImage2 from '@assets/generated_images/female_aviation_specialist_headshot.png';
import expertImage3 from '@assets/generated_images/senior_diagnostic_specialist_headshot.png';

export default function ExpertBookingCardExample() {
  const mockExperts = [
    {
      name: "Dr. Michael Chen",
      experience: "18 years AW139 diagnostics",
      specialty: "Electrical Systems (ATA 24)",
      availability: "AVAILABLE" as const,
      imageUrl: expertImage1
    },
    {
      name: "Sarah Martinez",
      experience: "12 years rotorcraft maintenance",
      specialty: "Power Plant (ATA 70-80)",
      availability: "AVAILABLE" as const,
      imageUrl: expertImage2
    },
    {
      name: "James Patterson",
      experience: "25 years helicopter systems",
      specialty: "Avionics & Flight Controls",
      availability: "UNAVAILABLE" as const,
      imageUrl: expertImage3
    }
  ];

  return (
    <div className="p-8">
      <ExpertBookingCard 
        experts={mockExperts}
        reason="Certainty score below 95% threshold requires expert validation for safety-critical diagnostics."
      />
    </div>
  );
}
