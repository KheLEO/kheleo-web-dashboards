import type { RosterMember } from "@/contracts/matchmaking";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
export function RosterCard({ name, roster }: { name: string; roster: RosterMember[] }) {
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">{name}</h2>
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
