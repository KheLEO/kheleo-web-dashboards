"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavigationActive, navigation } from "@/components/shell/persona-navigation";
import type { Workspace } from "@/server/auth/permissions";

export function MobileBottomNav({ workspace }: { workspace: Workspace }) {
  const pathname = usePathname();
  // Display the 4 or 5 primary actions on mobile bottom bar
  const items = navigation[workspace]?.slice(0, 5) ?? [];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-kheleo-surface/90 px-2 pt-1.5 pb-[max(.375rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const { title, href, icon: Icon } = item;
          const active = isNavigationActive(pathname, item);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 max-w-full flex-1 flex-col items-center justify-center gap-1 py-1 px-2 text-[10px] font-medium transition-all ${
                active
                  ? "text-primary font-bold scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={19} className={active ? "text-primary gold-glow" : ""} />
              <span className="w-full min-w-0 truncate text-center">{title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
