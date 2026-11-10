import { Watch, ShieldAlert, TrendingUp } from "lucide-react";
import { UpcomingFeatureView } from "@/components/shared/upcoming-feature-view";

export default function WearablePage() {
  return (
    <UpcomingFeatureView
      badge="UNDER PRODUCTION • LAUNCHING SOON"
      title="IoT Wearable Telemetry — Under Production"
      subtitle="Our real-time smartwatch and fitness band integration for live heart rate, blood oxygen (SpO₂), and skin temperature injury prevention is currently under production and will be live soon."
      highlights={[
        {
          title: "Smartwatch & Fitness Band Pairing",
          description:
            "Seamless Bluetooth Low Energy integration for live match and training sessions with standard heart rate and pulse oximeter monitors.",
          icon: Watch,
        },
        {
          title: "Autonomous Match-Pause Protection",
          description:
            "Automatic alerts to tournament organizers if cardiac strain or heat exhaustion thresholds are breached during hot summer matches.",
          icon: ShieldAlert,
        },
        {
          title: "25% GTI Consistency Boost",
          description:
            "Verified training consistency and workout adherence automatically feeds into your national Grassroots Talent Index.",
          icon: TrendingUp,
        },
      ]}
      primaryAction={{ label: "Go to Sports Passport", href: "/athlete/passport" }}
      secondaryAction={{ label: "Explore Tournaments", href: "/athlete/tournaments" }}
    />
  );
}
