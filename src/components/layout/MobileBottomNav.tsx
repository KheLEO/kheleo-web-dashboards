"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/components/shell/persona-navigation";
import type { Workspace } from "@/server/auth/permissions";

export function MobileBottomNav({ workspace }: { workspace: Workspace }) {
  const pathname = usePathname();
  // Display the 4 or 5 primary actions on mobile bottom bar
  const items = navigation[workspace]?.slice(0, 5) ?? [];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-kheleo-surface/90 px-2 py-1.5 backdrop-blur-xl lg:hidden"
    >
      <div className="flex items-center justify-around">
        {items.map(({ title, href, icon: Icon }) => {
          const active =
            pathname === href || (href !== `/${workspace}` && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-2 text-[10px] font-medium transition-all ${
                active
                  ? "text-primary font-bold scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={19} className={active ? "text-primary gold-glow" : ""} />
              <span className="truncate max-w-[64px]">{title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
