import { LockKeyhole } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export function DependencyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <div className="mb-5 flex items-center justify-between gap-4">
        <LockKeyhole className="text-muted-foreground" size={24} />
        <Badge className="border-border bg-secondary text-muted-foreground">
          Awaiting platform support
        </Badge>
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </Card>
  );
}
