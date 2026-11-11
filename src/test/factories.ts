import type { AuthUserSummary } from "@/contracts/auth";
import type { AthletePassport } from "@/contracts/passport";
import type { UserRole } from "@/contracts/enums.generated";
export const ids = {
  athlete: "10000000-0000-4000-8000-000000000001",
  organizer: "10000000-0000-4000-8000-000000000002",
  scout: "10000000-0000-4000-8000-000000000003",
  admin: "10000000-0000-4000-8000-000000000004",
  profile: "20000000-0000-4000-8000-000000000001",
  tournament: "30000000-0000-4000-8000-000000000001",
  bracket: "40000000-0000-4000-8000-000000000001",
  higher: "40000000-0000-4000-8000-000000000002",
  registration: "50000000-0000-4000-8000-000000000001",
  team: "60000000-0000-4000-8000-000000000001",
  alert: "70000000-0000-4000-8000-000000000001",
  sport: "80000000-0000-4000-8000-000000000001",
} as const;
export function makeUser(role: UserRole = "ATHLETE"): AuthUserSummary {
  const key =
    role === "SUPER_ADMIN"
      ? "admin"
      : role === "ORGANIZER"
        ? "organizer"
        : role === "SCOUT"
          ? "scout"
          : "athlete";
  return {
    id: ids[key],
    name: `${key.charAt(0).toUpperCase() + key.slice(1)} User`,
    email: `${key}@example.com`,
    phone: null,
    role,
    isVerified: true,
    isLegit: true,
    athleteProfileId: role === "ATHLETE" ? ids.profile : null,
  };
}
export function makePassport(): AthletePassport {
  return {
    userId: ids.athlete,
    athleteProfileId: ids.profile,
    dateOfBirth: "2005-04-12T00:00:00.000Z",
    gender: "FEMALE",
    primarySport: "CRICKET",
    secondarySports: [],
    district: "Varanasi",
    state: "Uttar Pradesh",
    tierClassification: "RURAL",
    physicalStats: { heightCm: 170, weightKg: 60, dominantSide: "RIGHT" },
    currentGti: 72.5,
    wearableScore: 50,
    matchPerfScore: 50,
    posturePoints: 10,
    biomechanicalScore: 65,
    identityStatus: "VERIFIED",
    sportRecords: [],
    allBadges: [],
  };
}
export function makeBracket() {
  return {
    id: ids.bracket,
    tournamentId: ids.tournament,
    name: "Community tier",
    tierName: "OPEN",
    minGti: "0",
    maxGti: "60",
    entryFee: "500",
    maxTeams: 16,
    bracketType: "SINGLE_ELIMINATION" as const,
    roundOrder: 1,
    config: {},
  };
}
export function makeTournament() {
  return {
    id: ids.tournament,
    organizerId: ids.organizer,
    name: "Varanasi Grassroots Cup",
    title: "Varanasi Grassroots Cup",
    sport: "CRICKET" as const,
    status: "REGISTRATION_OPEN" as const,
    minGti: "0",
    maxGti: "100",
    maxTeams: 16,
    teamSize: 11,
    prizePool: "25000",
    currency: "INR",
    venueName: "Sigra Stadium",
    venueLat: 25.3176,
    venueLng: 82.9739,
    registrationDeadline: "2027-01-01T12:00:00.000Z",
    startDate: "2027-01-05T12:00:00.000Z",
    endDate: "2027-01-10T12:00:00.000Z",
    rulesConfig: {},
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}
