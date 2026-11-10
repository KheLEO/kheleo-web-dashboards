import { ScanLine, ShieldCheck, Award } from "lucide-react";
import { UpcomingFeatureView } from "@/components/shared/upcoming-feature-view";

export default function DrillTypePage() {
  return (
    <UpcomingFeatureView
      badge="UNDER PRODUCTION • LAUNCHING SOON"
      title="Edge-AI Pose Drills — Under Production"
      subtitle="Our on-device computer vision engine for cricket bowling, badminton smash, football strike, and sprint biomechanics is currently undergoing final model calibration and will be live soon."
      highlights={[
        {
          title: "100% On-Device Camera Tracking",
          description:
            "Zero raw video uploaded; complete privacy on your phone or laptop. All computer vision processing runs strictly inside your local browser sandbox.",
          icon: ShieldCheck,
        },
        {
          title: "Real-Time Joint Angle Correction",
          description:
            "Instant biomechanical feedback on elbow extension, knee flexion, and follow-through to refine your technique and prevent injuries.",
          icon: ScanLine,
        },
        {
          title: "Verified GTI Posture Points",
          description:
            "Earn verified practice points that directly boost your Grassroots Talent Index and catch the eyes of registered scouts.",
          icon: Award,
        },
      ]}
      primaryAction={{ label: "Go to Sports Passport", href: "/athlete/passport" }}
      secondaryAction={{ label: "Explore Tournaments", href: "/athlete/tournaments" }}
    />
  );
}
