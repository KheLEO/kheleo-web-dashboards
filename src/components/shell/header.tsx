"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session-provider";
import { browserClient } from "@/lib/api/browser-client";
import { MobileNavigation } from "./mobile-navigation";
import { ThemeSwitcher } from "@/providers/ThemeProvider";
import { workspaceRoles, type Workspace } from "@/server/auth/permissions";

export function Header({ workspace }: { workspace: Workspace }) {
  const { user } = useSession();
  const client = useQueryClient();
  const router = useRouter();
  const flight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-kheleo-surface/30 px-4 py-3 sm:px-8 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <MobileNavigation workspace={workspace} />
        <span className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
          {workspace} <span className="text-muted-foreground font-normal">/ portal</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ThemeSwitcher className="hidden sm:inline-flex" />

        <div className="hidden gap-2 md:flex">
          {(Object.keys(workspaceRoles) as Workspace[])
            .filter((area) => area !== workspace && workspaceRoles[area].includes(user.role))
            .map((area) => (
              <Link
                className="text-xs capitalize text-muted-foreground hover:text-primary transition-colors"
                key={area}
                href={`/${area}`}
              >
                {area}
              </Link>
            ))}
        </div>

        <span className="max-w-36 truncate text-xs text-muted-foreground hidden sm:inline">
          {user.email ?? user.phone ?? user.role}
        </span>

        <Button
          variant="ghost"
          aria-label="Sign out"
          disabled={pending}
          onClick={async () => {
            if (flight.current) return;
            flight.current = true;
            setPending(true);
            try {
              await browserClient.post("/session/logout");
              window.dispatchEvent(new Event("kheleo:session-ended"));
              client.clear();
              router.replace("/login");
              router.refresh();
            } catch {
              setError(true);
            } finally {
              flight.current = false;
              setPending(false);
            }
          }}
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign out</span>
        </Button>

        {error && (
          <span role="alert" className="text-xs text-destructive">
            Sign out failed.
          </span>
        )}
      </div>
    </header>
  );
}
