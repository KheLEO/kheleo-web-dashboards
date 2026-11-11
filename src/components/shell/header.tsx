"use client";

import { LogOut, ShieldCheck, ShieldAlert } from "lucide-react";
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

        <LegitStatusBadge isVerified={Boolean(user.isVerified || user.isLegit)} role={user.role} />

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

function LegitStatusBadge({ isVerified, role }: { isVerified: boolean; role: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const verifyTarget =
    role === "ATHLETE" ? "/athlete/passport#verify-account" : "/athlete/settings";

  if (isVerified) {
    return (
      <div
        className="relative inline-flex items-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={0}
        role="status"
        aria-label="Verified Legit Account"
        title="Verified Legit Account — Your identity is verified and your profile is visible to scouts and academies."
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-400 shadow-sm transition-all hover:bg-emerald-500/25">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Legit</span>
        </span>
        {showTooltip && (
          <div
            role="tooltip"
            className="absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-emerald-500/30 bg-card/95 p-3 text-xs leading-relaxed text-foreground shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 pointer-events-none"
          >
            <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
              <ShieldCheck size={14} />
              <span>Verified Legit Account</span>
            </div>
            <p className="text-muted-foreground">
              Verified Legit Account — Your identity is verified and your profile is visible to
              scouts and academies.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <Link
        href={verifyTarget}
        role="button"
        aria-label="Not Legit — Click to verify account"
        title="You are not verified. Your government ID / Aadhaar card is not verified, so you are marked as Not Legit and scouts will not be able to see your account."
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-400 shadow-sm transition-all hover:bg-rose-500/25 hover:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
      >
        <ShieldAlert size={14} className="text-rose-400" />
        <span>Not Legit</span>
      </Link>
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-rose-500/40 bg-card/95 p-3.5 text-xs leading-relaxed text-foreground shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 pointer-events-none"
        >
          <div className="flex items-center gap-1.5 font-bold text-rose-400 mb-1.5">
            <ShieldAlert size={15} />
            <span>Account Not Verified</span>
          </div>
          <p className="text-foreground font-medium mb-1.5">
            You are not verified. Your government ID / Aadhaar card is not verified, so you are
            marked as Not Legit and scouts will not be able to see your account.
          </p>
          <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-1.5 mt-1.5">
            You can still participate in organized tournaments. Click to verify in your profile.
          </p>
        </div>
      )}
    </div>
  );
}
