"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Trophy, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SchemaForm } from "@/components/ui/form";
import { DependencyState } from "@/components/shared/dependency-state";
export function OrganizerOverview() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <Card>
        <Trophy className="mb-5 text-primary" size={28} />
        <h2 className="text-2xl font-semibold">Build a fairer competition</h2>
        <p className="mb-6 mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Create an event, define skill tiers, and configure bracket capacity, entry fees, and prize
          pools.
        </p>
        <Button asChild>
          <Link href="/organizer/tournaments/new">
            Create tournament <ArrowUpRight size={16} />
          </Link>
        </Button>
      </Card>
      <Card>
        <h2 className="mb-5 font-semibold">Open a tournament by ID</h2>
        <SchemaForm
          fields={[{ name: "id", label: "Tournament UUID", required: true }]}
          schema={z.object({ id: z.uuid() })}
          submitLabel="Open tournament"
          submit={async (value) => {
            router.push(`/organizer/tournaments/${value.id}`);
          }}
        />
      </Card>
      <DependencyState
        title="Your event directory"
        description="A paginated organizer-owned tournament listing is not yet exposed by the platform. Created events open directly by their returned ID."
      />
    </div>
  );
}
