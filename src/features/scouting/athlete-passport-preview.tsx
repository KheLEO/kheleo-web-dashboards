"use client";
import { PassportView } from "@/features/passport/passport-view";
import { usePassport } from "@/features/passport/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DependencyState } from "@/components/shared/dependency-state";
export function AthletePassportPreview({ userId }: { userId: string }) {
  const query = usePassport(userId);
  return (
    <div className="space-y-6">
      <PassportView userId={userId} />
      {query.data && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Sport record summary</h2>
          {query.data.sportRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sport summaries are included in this passport.
            </p>
          ) : (
            <ul className="space-y-4">
              {query.data.sportRecords.map((record) => (
                <li className="rounded-lg border p-4" key={record.id}>
                  <h3 className="font-semibold">
                    {record.sport} · {record.primaryRole}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {record.totalMatches} matches · {record.winCount} wins · streak{" "}
                    {record.winStreak}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            The passport embeds up to 20 records. Athlete-editable metrics and badges are
            self-reported; these summaries do not establish independently verified podiums or drill
            mastery.
          </p>
        </Card>
      )}
      <DependencyState
        title="Full scout dossier"
        description="Season GTI history, signed drill evidence, resolved posture flaws, physiological recovery summaries and verified podium history are not exposed. The platform currently supplies the authorized passport shown here."
      />
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Academy trials and sponsorship</h2>
        <div className="flex flex-wrap gap-3">
          <Button disabled className="whitespace-normal">
            Offer academy trial
          </Button>
          <Button disabled variant="secondary" className="whitespace-normal">
            Scholarship / sponsorship inquiry
          </Button>
          <Button disabled variant="secondary">
            Bookmark to shortlist
          </Button>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Official outreach, athlete notifications, and saved shortlists require authorized backend
          APIs. No inquiry or bookmark is sent or stored.
        </p>
      </Card>
    </div>
  );
}
