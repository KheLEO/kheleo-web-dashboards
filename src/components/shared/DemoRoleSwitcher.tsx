"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ChevronDown, ChevronUp, UserCheck, Sparkles } from "lucide-react";
import { useAuthStore, DEMO_PROFILES } from "@/store/useAuthStore";
import { homeForRole } from "@/server/auth/permissions";

export function DemoRoleSwitcher() {
  const router = useRouter();
  const { role, isDemoMode, switchDemoRole } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    { key: "ATHLETE", label: "Athlete", icon: "🏅", desc: "Sports Passport & GTI" },
    { key: "ORGANIZER", label: "Organizer", icon: "🏟️", desc: "Tournaments & Brackets" },
    { key: "SCOUT", label: "Scout / Academy", icon: "🔭", desc: "Talent Radar & Leaderboards" },
    { key: "SUPER_ADMIN", label: "Super Admin", icon: "🛡️", desc: "Anti-Sandbagging & Audit" },
  ] as const;

  const handleSelectRole = (roleKey: (typeof roles)[number]["key"]) => {
    switchDemoRole(roleKey);
    const targetPath = homeForRole(roleKey);
    router.push(targetPath);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 select-none font-sans">
      <div className="relative">
        {isOpen && (
          <div className="mb-2 w-72 rounded-xl border border-primary/40 bg-kheleo-surface/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Campus Demo RBAC
              </span>
              <span className="rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Local / Staging
              </span>
            </div>

            <p className="text-[11px] text-kheleo-silver-muted mb-2.5">
              Simulate role sessions with verified government identities and sample telemetry:
            </p>

            <div className="flex flex-col gap-1.5">
              {roles.map((r) => {
                const isActive = role === r.key && isDemoMode;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => handleSelectRole(r.key)}
                    className={`flex items-start gap-2.5 rounded-lg p-2 text-left text-xs transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow"
                        : "hover:bg-secondary/70 text-foreground"
                    }`}
                  >
                    <span className="text-base leading-none">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{r.label}</span>
                        {isActive && <UserCheck className="h-3.5 w-3.5 ml-1 flex-shrink-0" />}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {r.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-full border border-primary/50 bg-kheleo-surface px-3.5 py-2 text-xs font-semibold text-primary shadow-lg backdrop-blur-md hover:border-primary transition-all duration-200"
        >
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Role Switcher:</span>
          <span className="rounded bg-primary/20 px-2 py-0.5 text-primary-highlight font-mono uppercase">
            {role}
          </span>
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
