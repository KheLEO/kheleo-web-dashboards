import "server-only";
import { redirect } from "next/navigation";
import { readSession, refreshSession, type Session } from "./session";
import { workspaceRoles, type Workspace } from "./permissions";
import { ApiError } from "@/lib/api/errors";
export async function requireWorkspace(workspace: Workspace): Promise<Session> {
  const session = await readSession();
  if (!session) redirect("/login");
  if (!workspaceRoles[workspace].includes(session.user.role)) redirect("/forbidden");
  try {
    return await refreshSession(session);
  } catch (error: unknown) {
    if (error instanceof ApiError && error.problem.status === 401) redirect("/login");
    throw error;
  }
}
