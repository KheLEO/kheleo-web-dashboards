import type { RosterMember } from "@/contracts/matchmaking";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
export function RosterCard({ name, roster }: { name: string; roster: RosterMember[] }) {
  return (
    <Card>
      <div className="mb-5">
        <h2 className="text-xl font-semibold">{name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Complementary roster formed · Team average GTI:{" "}
          {roster.length
            ? (roster.reduce((sum, member) => sum + member.gti, 0) / roster.length).toFixed(1)
            : "No roster members recorded"}
        </p>
      </div>
      <Table>
        <caption className="sr-only">Matched team roster</caption>
        <thead>
          <tr>
            <th>Athlete</th>
            <th>Assigned role</th>
            <th>GTI</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((member) => (
            <tr key={member.user_id}>
              <td>{member.name}</td>
              <td>{member.assigned_role}</td>
              <td className="tabular-nums text-primary">{member.gti}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
