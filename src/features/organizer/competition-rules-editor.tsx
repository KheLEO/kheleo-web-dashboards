"use client";
import { useId } from "react";
import type { CompetitionConfig } from "@/contracts/organizer";
import { sportRoles } from "@/features/athlete/sport-options";
import type { SportType } from "@/contracts/enums.generated";
interface CompetitionRulesEditorProps {
  value: CompetitionConfig | undefined;
  onChange: (config: CompetitionConfig) => void;
  sport: SportType;
  teamSize: number;
}
export function CompetitionRulesEditor({
  value,
  onChange,
  sport,
  teamSize,
}: CompetitionRulesEditorProps) {
  const id = useId();
  return (
    <div className="space-y-5 rounded-lg border p-4">
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value?.roleQuotas)}
          onChange={(event) =>
            onChange({
              ...value,
              roleQuotas: event.target.checked
                ? Object.fromEntries(sportRoles[sport].map((role) => [role, 0]))
                : undefined,
            })
          }
        />
        Customize free-agent role quotas
      </label>
      {value?.roleQuotas && (
        <>
          <p className="text-xs">
            Role slots: {Object.values(value.roleQuotas).reduce((sum, count) => sum + count, 0)} /{" "}
            {teamSize}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {sportRoles[sport].map((role) => (
              <label className="field" htmlFor={`${id}-${role}`} key={role}>
                {role.replaceAll("_", " ")} slots
                <input
                  id={`${id}-${role}`}
                  className="control"
                  type="number"
                  min={0}
                  max={30}
                  step={1}
                  value={value.roleQuotas?.[role] ?? 0}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      roleQuotas: { ...value.roleQuotas, [role]: Number(event.target.value) },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </>
      )}
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value?.prizeBreakdown)}
          onChange={(event) =>
            onChange({
              ...value,
              prizeBreakdown: event.target.checked ? { first: 0, second: 0, third: 0 } : undefined,
            })
          }
        />
        Allocate per-place prizes
      </label>
      {value?.prizeBreakdown && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(["first", "second", "third"] as const).map((place) => (
            <label className="field" htmlFor={`${id}-${place}`} key={place}>
              {place[0]?.toUpperCase()}
              {place.slice(1)} place prize (INR)
              <input
                id={`${id}-${place}`}
                className="control"
                type="number"
                min={0}
                step="0.01"
                value={value.prizeBreakdown?.[place] ?? 0}
                onChange={(event) =>
                  onChange({
                    ...value,
                    prizeBreakdown: {
                      first: value.prizeBreakdown?.first ?? 0,
                      second: value.prizeBreakdown?.second ?? 0,
                      third: value.prizeBreakdown?.third ?? 0,
                      [place]: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
