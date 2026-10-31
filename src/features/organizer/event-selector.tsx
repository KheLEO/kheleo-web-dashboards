"use client";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { SchemaForm } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
export function EventSelector({
  destination = "detail",
}: {
  destination?: "detail" | "safety" | "brackets";
}) {
  const router = useRouter();
  return (
    <Card>
      <h2 className="mb-4 font-semibold">Open a tournament by ID</h2>
      <SchemaForm
        fields={[{ name: "id", label: "Tournament UUID", required: true }]}
        schema={z.object({ id: z.uuid() })}
        submitLabel="Open tournament"
        submit={async (value) => {
          router.push(
            `/organizer/tournaments/${value.id}${destination === "detail" ? "" : `/${destination}`}`,
          );
        }}
      />
    </Card>
  );
}
