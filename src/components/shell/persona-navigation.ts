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
  aliases?: readonly string[];
}
export function isNavigationActive(pathname: string, item: NavigationItem): boolean {
  return [item.href, ...(item.aliases ?? [])].some(
    (path) => pathname === path || (path.split("/").length > 2 && pathname.startsWith(path + "/")),
  );
}
export const navigation: Record<Workspace, readonly NavigationItem[]> = {
  athlete: [
    { title: "Overview", href: "/athlete/dashboard", aliases: ["/athlete"], icon: LayoutDashboard },
    { title: "Sports passport", href: "/athlete/passport", icon: IdCard },
    {
      title: "Identity",
      href: "/verify-identity",
      aliases: ["/athlete/identity"],
      icon: ShieldCheck,
    },
    { title: "Tournaments", href: "/athlete/tournaments", icon: Trophy },
    { title: "Pose drills", href: "/athlete/drills", icon: ScanLine },
    { title: "Wearable", href: "/athlete/iot-device", icon: Watch },
    { title: "Free-agent pool", href: "/athlete/matchmaking", icon: Users },
    { title: "Settings", href: "/athlete/settings", icon: Settings },
  ],
  organizer: [
    {
      title: "Overview",
      href: "/organizer/dashboard",
      aliases: ["/organizer"],
      icon: LayoutDashboard,
    },
    { title: "Tournaments", href: "/organizer/tournaments", icon: Trophy },
    { title: "Create tournament", href: "/organizer/tournaments/create", icon: Trophy },
    { title: "Brackets & rosters", href: "/organizer/brackets", icon: Users },
    { title: "Safety center", href: "/organizer/safety", icon: ShieldAlert },
  ],
  scout: [
    { title: "Overview", href: "/scout/dashboard", aliases: ["/scout"], icon: LayoutDashboard },
    { title: "Discover talent", href: "/scout/feed", icon: Radar },
    { title: "Talent alerts", href: "/scout/alerts", icon: Bell },
    { title: "Leaderboards", href: "/scout/leaderboards", icon: ListOrdered },
    { title: "Regional insights", href: "/scout/heatmaps", icon: Map },
  ],
  admin: [
    { title: "Overview", href: "/admin/dashboard", aliases: ["/admin"], icon: LayoutDashboard },
    { title: "User governance", href: "/admin/users", icon: Users },
    { title: "Organizers", href: "/admin/organizers", icon: Users },
    { title: "Audit console", href: "/admin/audit-logs", icon: ShieldAlert },
    { title: "Theme studio", href: "/admin/theme", icon: Settings },
    { title: "Tournaments", href: "/admin/tournaments", icon: Trophy },
    { title: "Identity audit", href: "/admin/identity-audit", icon: FileSearch },
    { title: "Security audit", href: "/admin/security-audit", icon: ShieldAlert },
    { title: "System health", href: "/admin/system", icon: Activity },
  ],
};
