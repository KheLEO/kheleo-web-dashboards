"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { isNavigationActive, navigation } from "./persona-navigation";
import { Brand } from "./brand";
import type { Workspace } from "@/server/auth/permissions";
export function Sidebar({
  workspace,
  mobile = false,
  onNavigate,
}: {
  workspace: Workspace;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className={`flex h-full flex-col ${mobile ? "p-5" : "p-6"}`}>
      <Brand />
      <div className="mb-4 mt-12 text-[10px] font-semibold uppercase tracking-[.22em] text-muted-foreground">
        {workspace === "scout" ? "Talent intelligence" : `${workspace} workspace`}
      </div>
      <nav aria-label={`${workspace} navigation`} className="space-y-1.5">
        {navigation[workspace].map((item) => {
          const { title, href, icon: Icon } = item;
          const active = isNavigationActive(pathname, item);
          return (
            <Link
              {...(onNavigate ? { onClick: onNavigate } : {})}
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md border px-3 py-3 text-sm ${active ? "border-primary/20 bg-primary/10 font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <span className="flex items-center gap-3">
                <Icon size={18} />
                <span>{title}</span>
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-12">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex justify-between text-primary">
            <span className="text-xs font-semibold">Built for the grassroots</span>
            <ArrowUpRight size={15} />
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            One permanent identity.
            <br />
            Every achievement counts.
          </p>
        </div>
        <p className="mt-5 text-[10px] uppercase tracking-widest text-muted-foreground">
          KheLEO · Athlete intelligence
        </p>
      </div>
    </div>
  );
}
