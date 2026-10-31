import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
export default function Layout({ children }: { children: ReactNode }) {
  return <AppShell workspace="scout">{children}</AppShell>;
}
