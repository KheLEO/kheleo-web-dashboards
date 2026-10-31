import type { ReactNode } from "react";
import { requireWorkspace } from "@/server/auth/require-session";
import { getEnvironment } from "@/server/env";
import { SessionProvider } from "@/features/auth/session-provider";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { MobileBottomNav } from "./MobileBottomNav";
import { DemoRoleSwitcher } from "@/components/shared/DemoRoleSwitcher";
import type { Workspace } from "@/server/auth/permissions";

export interface AppShellProps {
  workspace: Workspace;
  children: ReactNode;
}

export async function AppShell({ workspace, children }: AppShellProps) {
  const session = await requireWorkspace(workspace);
  const env = getEnvironment();

  return (
    <SessionProvider
      initial={{
        user: session.user,
        expiresAt: session.expiresAt,
        capabilities: {
          safeEvents: env.SAFE_EVENTS_VERIFIED === "true",
          simulatorIngestion:
            env.APP_ENV === "staging" &&
            env.SIMULATOR_INGESTION === "true" &&
            env.STAGING_DATA_ISOLATED === "true",
        },
      }}
    >
      <div className="min-h-dvh bg-background text-foreground">
        {/* Desktop Sidebar */}
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-kheleo-surface/50 backdrop-blur-xl lg:block">
          <Sidebar workspace={workspace} />
        </aside>

        <div className="min-w-0 lg:ml-64 flex flex-col min-h-dvh">
          <Header workspace={workspace} />

          <main
            id="main-content"
            className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 pb-24 sm:px-8 sm:py-8 lg:pb-12"
          >
            {children}
          </main>

          <footer className="mx-4 mb-16 lg:mb-0 flex flex-wrap justify-between gap-2 border-t border-border/60 py-5 text-[10px] uppercase tracking-widest text-muted-foreground sm:mx-8">
            <span>An equal playing field starts here.</span>
            <span>KheLEO Edge AI · Anti-Sandbagging · Verified Identity</span>
          </footer>
        </div>

        {/* Mobile Sticky Bottom Navigation */}
        <MobileBottomNav workspace={workspace} />

        {/* Floating Demo Role Switcher for Campus Testing */}
        <DemoRoleSwitcher />
      </div>
    </SessionProvider>
  );
}
