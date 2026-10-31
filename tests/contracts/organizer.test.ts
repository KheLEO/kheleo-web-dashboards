import { describe, expect, it } from "vitest";
import { serializeEventDraft, validateEventStep } from "@/features/organizer/event-draft";
import {
  safetyAlertReducer,
  type SafetyIncident,
  type SafetyAlertState,
} from "@/features/safety/alert-reducer";
import { createTournamentSchema, type CreateTournamentRequest } from "@/contracts/tournaments";
import { ids } from "@/test/factories";
const draft: CreateTournamentRequest = {
  name: "Campus Cup",
  sport: "CRICKET",
  venueName: "Campus field",
  venueLat: 28.6692,
  venueLng: 77.4538,
  registrationDeadline: "2027-01-01T12:00",
  startDate: "2027-01-03T12:00",
  endDate: "2027-01-05T12:00",
  maxTeams: 16,
  teamSize: 11,
  minGti: 0,
  maxGti: 100,
  prizePool: 25000,
};
function incident(id: string): SafetyIncident {
  return {
    id,
    receivedAt: 100,
    seenAt: null,
    source: "LIVE",
    alert: {
      event: "MATCH_PAUSE_ALERT",
      severity: "CRITICAL",
      athlete_id: ids.athlete,
      athlete_name: "Player",
      tournament_id: ids.tournament,
      vitals: { heart_rate: 196, spo2: 90, skin_temperature: 39.5 },
      directive: "Mandatory rest",
    },
  };
}
describe("organizer creation contracts", () => {
  it("validates each step independently without requiring unfinished fields", () => {
    expect(validateEventStep({ ...draft, venueName: "" }, 0)).toBeNull();
    expect(validateEventStep({ ...draft, venueName: "" }, 1)).toContain("venueName");
    expect(validateEventStep({ ...draft, endDate: draft.registrationDeadline }, 0)).toContain(
      "chronological",
    );
    expect(validateEventStep({ ...draft, venueLat: 91 }, 1)).toContain("venueLat");
    expect(validateEventStep({ ...draft, minGti: 80, maxGti: 40 }, 2)).toContain("Minimum GTI");
    expect(validateEventStep({ ...draft, prizePool: -1 }, 2)).toContain("prizePool");
  });
  it("serializes local dates as ISO and rejects unsupported hosting fields", () => {
    const dto = serializeEventDraft(draft);
    expect(dto.startDate).toBe(new Date(draft.startDate).toISOString());
    expect(createTournamentSchema.safeParse(dto).success).toBe(true);
    for (const extra of [
      { rulesDescription: "Rules" },
      { firstPlacePrize: 100 },
      { roleQuotas: {} },
      { sport: "CUSTOM" },
    ])
      expect(createTournamentSchema.safeParse({ ...dto, ...extra }).success).toBe(false);
    expect(validateEventStep({ ...draft, startDate: "invalid date" }, 0)).not.toBeNull();
  });
});
describe("local safety incidents", () => {
  it("marks only one observation seen and preserves another pending incident", () => {
    const first = safetyAlertReducer(
      { incidents: [] },
      { type: "receive", incident: incident("first") },
    );
    const next = safetyAlertReducer(first, { type: "receive", incident: incident("second") });
    const seen = safetyAlertReducer(next, { type: "seen", id: "first", timestamp: 123 });
    expect(seen.incidents.find((entry) => entry.id === "first")?.seenAt).toBe(123);
    expect(seen.incidents.find((entry) => entry.id === "second")?.seenAt).toBeNull();
    expect(safetyAlertReducer(seen, { type: "seen", id: "first", timestamp: 456 })).toEqual(seen);
    expect(first.incidents[0]?.seenAt).toBeNull();
  });
  it("deduplicates incident IDs and bounds retained observations at 50", () => {
    let state: SafetyAlertState = { incidents: [] };
    for (let index = 0; index < 70; index++)
      state = safetyAlertReducer(state, { type: "receive", incident: incident(String(index)) });
    expect(state.incidents).toHaveLength(50);
    expect(state.incidents[0]?.id).toBe("69");
    expect(safetyAlertReducer(state, { type: "receive", incident: incident("69") })).toBe(state);
  });
});
