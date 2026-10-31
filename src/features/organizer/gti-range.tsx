"use client";
export interface GtiRangeProps {
  floor: number;
  ceiling: number;
  onFloor: (value: number) => void;
  onCeiling: (value: number) => void;
  disabled?: boolean;
}
export function GtiRange({ floor, ceiling, onFloor, onCeiling, disabled = false }: GtiRangeProps) {
  return (
    <fieldset disabled={disabled} className="space-y-4 rounded-xl border p-4">
      <legend className="px-2 text-sm font-semibold">Anti-sandbagging GTI range</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="field">
          Minimum GTI
          <input
            aria-label="Minimum GTI"
            className="control"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={Number.isFinite(floor) ? floor : ""}
            onChange={(event) => onFloor(event.target.valueAsNumber)}
            required
          />
          <input
            aria-label="Minimum GTI slider"
            className="w-full accent-primary"
            type="range"
            min={0}
            max={100}
            step="0.1"
            value={Number.isFinite(floor) ? floor : 0}
            onChange={(event) => onFloor(event.target.valueAsNumber)}
          />
        </label>
        <label className="field">
          Maximum GTI
          <input
            aria-label="Maximum GTI"
            className="control"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={Number.isFinite(ceiling) ? ceiling : ""}
            onChange={(event) => onCeiling(event.target.valueAsNumber)}
            required
          />
          <input
            aria-label="Maximum GTI slider"
            className="w-full accent-primary"
            type="range"
            min={0}
            max={100}
            step="0.1"
            value={Number.isFinite(ceiling) ? ceiling : 100}
            onChange={(event) => onCeiling(event.target.valueAsNumber)}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Eligibility is enforced by the backend during registration. The minimum must not exceed the
        maximum.
      </p>
    </fieldset>
  );
}
