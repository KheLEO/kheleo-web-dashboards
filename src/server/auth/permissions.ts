import type { UserRole } from "@/contracts/enums.generated";
export type Workspace = "athlete" | "organizer" | "scout" | "admin";
export const workspaceRoles: Record<Workspace, readonly UserRole[]> = {
  athlete: ["ATHLETE", "SUPER_ADMIN"],
  organizer: ["ORGANIZER", "FEDERATION_ADMIN", "SUPER_ADMIN"],
  scout: ["SCOUT", "FEDERATION_ADMIN", "SUPER_ADMIN"],
  admin: ["SUPER_ADMIN"],
};
export function homeForRole(role: UserRole): string {
  return role === "SUPER_ADMIN"
    ? "/admin"
    : role === "ATHLETE"
      ? "/athlete"
      : role === "ORGANIZER"
        ? "/organizer"
        : role === "UMPIRE"
          ? "/unsupported"
          : "/scout";
}
