"use client";
import * as Tabs from "@radix-ui/react-tabs";
import { ProspectDiscovery } from "./prospect-filters";
import { AlertsList } from "./alerts-list";
export function ScoutFeed() {
  return (
    <Tabs.Root defaultValue="prospects" className="space-y-6">
      <Tabs.List
        aria-label="Talent discovery views"
        className="inline-flex flex-wrap gap-2 rounded-xl border bg-card p-2"
      >
        {[
          { value: "prospects", label: "Elite prospects" },
          { value: "alerts", label: "Talent alerts" },
        ].map((entry) => (
          <Tabs.Trigger
            className="min-h-11 rounded-lg px-4 text-sm text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            value={entry.value}
            key={entry.value}
          >
            {entry.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="prospects">
        <ProspectDiscovery />
      </Tabs.Content>
      <Tabs.Content value="alerts">
        <AlertsList />
      </Tabs.Content>
    </Tabs.Root>
  );
}
