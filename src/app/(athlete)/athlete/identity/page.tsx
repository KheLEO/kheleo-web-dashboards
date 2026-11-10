import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeading } from "@/components/shared/page-heading";
import { IdentityForm } from "@/features/auth/identity-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link
            href="/athlete/passport"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Back to Sports Passport
          </Link>
        </Button>
      </div>
      <PageHeading
        eyebrow="identity"
        title="One athlete. One identity."
        description="Bind your Aadhaar identity to preserve your achievements and GTI."
      />
      <Card className="p-6">
        <IdentityForm idType="AADHAAR" />
      </Card>
    </div>
  );
}
