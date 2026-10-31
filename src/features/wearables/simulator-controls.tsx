"use client";
import { Button } from "@/components/ui/button";
import type { SimulatorScenario } from "./types";
export function SimulatorControls({
  start,
  disabled,
}: {
  start: (scenario: SimulatorScenario) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["normal", "warning", "critical"] as const).map((scenario) => (
        <Button
          key={scenario}
          variant="secondary"
          disabled={disabled}
          onClick={() => start(scenario)}
        >
          Simulate {scenario}
        </Button>
      ))}
    </div>
  );
}
