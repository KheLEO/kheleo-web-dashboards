import {
  LayoutDashboard,
  ShieldCheck,
  IdCard,
  Trophy,
  ScanLine,
  Watch,
  Settings,
  Radar,
  Bell,
  Map,
  ListOrdered,
  Users,
  Activity,
  FileSearch,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Workspace } from "@/server/auth/permissions";
export interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
}
export const navigation: Record<Workspace, readonly NavigationItem[]> = {
  athlete: [
    { title: "Overview", href: "/athlete", icon: LayoutDashboard },
    { title: "Sports passport", href: "/athlete/passport", icon: IdCard },
    { title: "Identity", href: "/athlete/identity", icon: ShieldCheck },
    { title: "Tournaments", href: "/athlete/tournaments", icon: Trophy },
    { title: "Pose drills", href: "/athlete/drills", icon: ScanLine },
    { title: "Wearable", href: "/athlete/wearable", icon: Watch },
    { title: "Settings", href: "/athlete/settings", icon: Settings },
  ],
  organizer: [
    { title: "Overview", href: "/organizer", icon: LayoutDashboard },
    { title: "Tournaments", href: "/organizer/tournaments", icon: Trophy },
    { title: "Create tournament", href: "/organizer/tournaments/new", icon: Trophy },
  ],
  scout: [
    { title: "Overview", href: "/scout", icon: LayoutDashboard },
    { title: "Discover talent", href: "/scout/prospects", icon: Radar },
    { title: "Talent alerts", href: "/scout/alerts", icon: Bell },
    { title: "Leaderboards", href: "/scout/leaderboards", icon: ListOrdered },
    { title: "Regional insights", href: "/scout/regional", icon: Map },
  ],
  admin: [
    { title: "Overview", href: "/admin", icon: LayoutDashboard },
    { title: "Organizers", href: "/admin/organizers", icon: Users },
    { title: "Tournaments", href: "/admin/tournaments", icon: Trophy },
    { title: "Identity audit", href: "/admin/identity-audit", icon: FileSearch },
    { title: "Security audit", href: "/admin/security-audit", icon: ShieldAlert },
    { title: "System health", href: "/admin/system", icon: Activity },
  ],
};
