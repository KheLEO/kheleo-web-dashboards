import { z } from "zod";
import { adminUserSchema, securityAuditSchema } from "../../src/contracts/admin";
import {
  scoutDossierSchema,
  outreachSchema,
  outreachRecordSchema,
} from "../../src/contracts/scouting";
import type { LeaderboardEntry } from "../../src/contracts/gti";
import { tournamentSchema, bracketSchema } from "../../src/contracts/tournaments";
import type { HealthAlert, AthleteVitals } from "../../src/contracts/safety";
import { createHmac } from "node:crypto";
import { canonicalJson } from "../../src/lib/canonical-json";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Server } from "socket.io";
import { ids, makeUser, makePassport, makeBracket, makeTournament } from "../../src/test/factories";
import type { UserRole } from "../../src/contracts/enums.generated";
import type { JsonValue } from "../../src/contracts/common";
const cache = new Map<string, { body: string; response: unknown }>();
let joined = false;
let matched = false;
let profileExists = true;
let foreignOwner = false;
let scoutAlertAcknowledged = false;
let nearbyPages = false;
let passport = makePassport();
const seenMutations: string[] = [];
type FixtureTournament = z.infer<typeof tournamentSchema> & { isFeatured?: boolean };
type FixtureBracket = z.infer<typeof bracketSchema>;
const tournaments = new Map<string, FixtureTournament>();
const brackets = new Map<string, FixtureBracket>();
const healthAlerts = new Map<string, HealthAlert>();
const vitals = new Map<string, AthleteVitals>();
const opponentId = "10000000-0000-4000-8000-000000000005";
const safetyMatchId = "91000000-0000-4000-8000-000000000001";
let matchState = "LIVE";
let matchesRecorded = 0;
let scoutSearchable = true;
const adminUsers = new Map<string, z.infer<typeof adminUserSchema>>();
const adminAudits = new Map<string, z.infer<typeof securityAuditSchema>>();
let auditCounter = 0;
let healthDegraded = false;
function recordAdminAudit(
  category: z.infer<typeof securityAuditSchema>["category"],
  severity: z.infer<typeof securityAuditSchema>["severity"],
  summary: string,
  targetId: string | null,
  metadata: JsonValue,
): void {
  const id = `98000000-0000-4000-8000-${String(++auditCounter).padStart(12, "0")}`;
  adminAudits.set(
    id,
    securityAuditSchema.parse({
      id,
      category,
      severity,
      summary,
      actorUserId: ids.admin,
      targetId,
      metadata,
      ipHash: null,
      createdAt: new Date(Date.now() + auditCounter).toISOString(),
    }),
  );
}
function seedAdmin(): void {
  adminUsers.clear();
  adminAudits.clear();
  auditCounter = 0;
  healthDegraded = false;
  for (const role of ["ATHLETE", "ORGANIZER", "SCOUT", "SUPER_ADMIN"] as const) {
    const user = makeUser(role);
    adminUsers.set(
      user.id,
      adminUserSchema.parse({
        ...user,
        isActive: true,
        createdAt: "2026-10-01T00:00:00Z",
        identityRecord: {
          status: "VERIFIED",
          reLinkedCount: 0,
          verifiedAt: "2026-10-01T00:00:00Z",
        },
      }),
    );
  }
  for (let index = 0; index < 24; index++) {
    const id = `10000000-0000-4000-8000-${String(index + 20).padStart(12, "0")}`;
    const role = index % 2 === 0 ? "ORGANIZER" : "SCOUT";
    adminUsers.set(
      id,
      adminUserSchema.parse({
        id,
        email: `pending-${role.toLowerCase()}-${index}@example.com`,
        phone: null,
        role,
        isActive: index % 3 !== 0,
        createdAt: "2026-10-01T00:00:00Z",
        identityRecord: {
          status: "UNVERIFIED",
          reLinkedCount: 0,
          verifiedAt: "2026-10-01T00:00:00Z",
        },
      }),
    );
  }
  for (const [category, severity, summary] of [
    ["GOV_ID_RESET", "WARNING", "Duplicate identity binding blocked"],
    ["DRILL_HMAC_TAMPER", "CRITICAL", "Invalid drill cryptographic signature"],
    ["SANDBAGGING_BLOCKED", "WARNING", "Over-ceiling tournament entry blocked"],
    ["SAFETY_MATCH_PAUSE", "CRITICAL", "Critical telemetry paused a match"],
    ["ROLE_GOVERNANCE", "INFO", "Scout credentials approved"],
    ["TOURNAMENT_MODERATION", "INFO", "Tournament placement reviewed"],
  ] as const)
    recordAdminAudit(category, severity, summary, ids.athlete, {
      outcome: "RECORDED",
      tournamentId: ids.tournament,
    });
}

const scoutOutreach = new Map<string, z.infer<typeof outreachRecordSchema>>();
function leaderboardEntries(): LeaderboardEntry[] {
  return Array.from({ length: 25 }, (_, index) => ({
    rank: index + 1,
    athlete_id:
      index === 0
        ? ids.athlete
        : `10000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
    profile_id:
      index === 0
        ? ids.profile
        : `20000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
    display_name: `Prospect ${String(index + 1).padStart(2, "0")}`,
    district: index === 24 ? "Varanasi" : index === 23 ? "Pune" : "Varanasi",
    state: index === 24 ? "Karnataka" : index === 23 ? "Maharashtra" : "Uttar Pradesh",
    tier_classification: index % 3 === 0 ? "METRO" : "RURAL",
    gender: index % 2 === 0 ? "FEMALE" : "MALE",
    primary_sport: index % 2 === 0 ? "CRICKET" : "FOOTBALL",
    primary_role: index % 2 === 0 ? "BOWLER" : "FORWARD",
    gti: index < 3 ? 95 : 90 - index / 10,
    biomechanical_score: 90,
    wearable_consistency_score: 85,
    match_performance_score: 92,
    win_rate: 75,
    total_matches: 12,
  }));
}
function fixtureDossier(athleteId: string, scoutId: string) {
  const saved = scoutOutreach.get(`${scoutId}:${athleteId}`);
  return scoutDossierSchema.parse({
    athlete_id: athleteId,
    profile_id: ids.profile,
    display_name: "Campus Prospect",
    district: "Varanasi",
    state: "Uttar Pradesh",
    tier_classification: "RURAL",
    primary_sport: "CRICKET",
    secondary_sports: [],
    is_verified: true,
    verification_status: "VERIFIED",
    physical_stats: { gender: "FEMALE", height_cm: 172, weight_kg: 65, dominant_side: "RIGHT" },
    gti_breakdown: {
      gti: passport.currentGti,
      biomechanical_score: passport.biomechanicalScore,
      wearable_consistency_score: passport.wearableScore,
      match_performance_score: passport.matchPerfScore,
      posture_points: passport.posturePoints,
    },
    gti_history: [
      { recorded_at: "2025-01-01T00:00:00Z", gti: 55, trigger_type: "DRILL_SUBMISSION" },
      { recorded_at: "2026-01-01T00:00:00Z", gti: 65, trigger_type: "WEARABLE_SYNC" },
      { recorded_at: "2026-11-01T00:00:00Z", gti: 88.5, trigger_type: "MATCH_COMPLETED" },
    ],
    recent_drills: [
      {
        id: "30000000-0000-4000-8000-000000000099",
        sport: "CRICKET",
        drill_type: "CRICKET_BOWLING",
        form_score: 92,
        frames_analyzed: 90,
        flaw_flags: [],
        signature_hash_prefix: "abcdef012345",
        created_at: "2026-11-01T00:00:00Z",
      },
    ],
    wearable_summary: {
      sessions_monitored: 12,
      readings_count: 80,
      avg_heart_rate: 126.5,
      avg_spo2: 97.8,
      safety_pauses_count: 1,
      consistency_score: 85,
      simulator_readings: 2,
      baseline_spo2_readings: 20,
    },
    sport_records: [
      {
        sport: "CRICKET",
        primary_role: "BOWLER",
        secondary_roles: ["BATSMAN"],
        total_matches: 12,
        win_count: 9,
        win_streak: 3,
      },
    ],
    scout_outreach: saved
      ? {
          is_shortlisted: saved.isShortlisted,
          pipeline_status: saved.pipelineStatus,
          notes: saved.scoutNotes,
          organization_name: saved.organizationName,
          history: saved.outreachHistory,
        }
      : null,
  });
}
function queuedAthletes() {
  return Array.from({ length: 11 }, (_, index) => ({
    id: `13000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    userId: `12000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name: `queue-${String(index + 1).padStart(2, "0")}@example.com`,
    gti: 50,
    identityStatus: "VERIFIED",
    isActive: true,
    role:
      index < 6 ? "BATSMAN" : index < 9 ? "BOWLER" : index === 9 ? "WICKETKEEPER" : "ALL_ROUNDER",
    primaryRole:
      index < 6 ? "BATSMAN" : index < 9 ? "BOWLER" : index === 9 ? "WICKETKEEPER" : "ALL_ROUNDER",
    secondaryRole: null,
    status: "QUEUED",
    joinedAt: "2026-11-01T00:00:00.000Z",
  }));
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

const federationOrgId = "10000000-0000-4000-8000-000000000099";

interface GeneratedTournament {
  id: string;
  name: string;
  sport: "CRICKET" | "FOOTBALL" | "BADMINTON" | "ATHLETICS" | "KABADDI" | "BASKETBALL";
  venueName: string;
  venueLat: number;
  venueLng: number;
  prizePool: string;
  maxTeams: number;
  teamSize: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  minGti: string;
  maxGti: string;
}

const NCR_VENUES = [
  { name: "Mahamaya Sports Stadium, Ghaziabad", lat: 28.672, lng: 77.442 },
  { name: "ABES Sports Complex, Ghaziabad", lat: 28.681, lng: 77.461 },
  { name: "Yamuna Sports Complex, East Delhi", lat: 28.664, lng: 77.31 },
  { name: "Noida Stadium Sector 21A, Noida", lat: 28.588, lng: 77.34 },
  { name: "Major Dhyan Chand National Stadium, Central Delhi", lat: 28.612, lng: 77.237 },
  { name: "Thyagaraj Sports Complex, South Delhi", lat: 28.577, lng: 77.218 },
  { name: "Indira Gandhi Arena, New Delhi", lat: 28.629, lng: 77.248 },
  { name: "Siri Fort Sports Complex, South Delhi", lat: 28.552, lng: 77.22 },
  { name: "Chhatrasal Stadium, Model Town Delhi", lat: 28.705, lng: 77.193 },
  { name: "Talkatora Indoor Stadium, New Delhi", lat: 28.624, lng: 77.194 },
  { name: "Shaheed Vijay Singh Pathik Sports Complex, Greater Noida", lat: 28.472, lng: 77.498 },
  { name: "Netaji Subhash Sports Complex, Jasola, South Delhi", lat: 28.535, lng: 77.291 },
  { name: "Commonwealth Games Village Sports Complex, Akshardham", lat: 28.615, lng: 77.278 },
  { name: "Dr. Karni Singh Sports Ground, Surajkund", lat: 28.49, lng: 77.275 },
];

const SPORT_POPULARITY_DATA: Array<{
  sport: "FOOTBALL" | "CRICKET" | "BADMINTON" | "KABADDI" | "BASKETBALL" | "ATHLETICS";
  sportCode: string;
  fameRank: number; // 1 = highest, 6 = lowest
  teamSize: number;
  maxTeamsPool: number[];
  titles: string[];
}> = [
  {
    sport: "FOOTBALL",
    sportCode: "0000000002",
    fameRank: 1, // Most famous: user specified "Sports like football have 6 tournaments"
    teamSize: 11,
    maxTeamsPool: [16, 24, 32],
    titles: [
      "Delhi-NCR Premier Football Derby",
      "National Capital Football Championship",
      "Ghaziabad Inter-District Football Trophy",
      "Yamuna Grassroots Youth Football Cup",
      "Noida Super Strikers League",
      "Capital City Community Football Open",
      "Shaheed Bhagat Singh Memorial Football Cup",
      "NCR Champions Football League",
    ],
  },
  {
    sport: "CRICKET",
    sportCode: "0000000001",
    fameRank: 2,
    teamSize: 11,
    maxTeamsPool: [16, 20, 24],
    titles: [
      "Delhi-NCR Premier Cricket Trophy",
      "Inter-Campus T20 Cricket Challenge",
      "Yamuna Grassroots Cricket Cup",
      "Noida District Super League",
      "National Capital Cricket Championship",
      "Greater Noida Youth Cricket Carnival",
    ],
  },
  {
    sport: "BADMINTON",
    sportCode: "0000000003",
    fameRank: 3,
    teamSize: 2,
    maxTeamsPool: [32, 48, 64],
    titles: [
      "Ghaziabad Youth Badminton Classic",
      "Yamuna Shuttle Badminton Trophy",
      "Noida District Badminton Carnival",
      "Indira Gandhi National Badminton Open",
      "Thyagaraj Indoor Shuttle Cup",
      "Siri Fort Smash Masters Championship",
    ],
  },
  {
    sport: "KABADDI",
    sportCode: "0000000005",
    fameRank: 4,
    teamSize: 7,
    maxTeamsPool: [12, 16, 20],
    titles: [
      "NCR Pro-Style Kabaddi Mahotsav",
      "Noida Sector Gold Kabaddi Trophy",
      "Ghaziabad District Kabaddi Mahotsav",
      "Thyagaraj State Kabaddi Challenge",
      "Chhatrasal Traditional Kabaddi Open",
    ],
  },
  {
    sport: "BASKETBALL",
    sportCode: "0000000006",
    fameRank: 5,
    teamSize: 5,
    maxTeamsPool: [12, 16],
    titles: [
      "Indira Gandhi Hoops Showdown",
      "Siri Fort 3x3 & Full-Court Open",
      "Yamuna Youth Basketball Trophy",
      "Noida Cagers Invitational",
      "Thyagaraj Basketball Premier League",
    ],
  },
  {
    sport: "ATHLETICS",
    sportCode: "0000000004",
    fameRank: 6, // Least famous: user specified "to the other one, the least famous, you need to give 3"
    teamSize: 1,
    maxTeamsPool: [30, 50, 64],
    titles: [
      "National Capital Track & Field Invitational",
      "Delhi State Grassroots Athletics Meet",
      "Yamuna Sprint & Middle Distance Challenge",
      "Chhatrasal Memorial Athletics Open",
    ],
  },
];

function getDynamicTournamentCount(fameRank: number, totalSports: number): number {
  // Linear scaling from 6 (fameRank = 1) down to 3 (fameRank = totalSports)
  // Ensures:
  // - Top famous sport (Football) gets exactly 6
  // - Least famous sport (Athletics) gets exactly 3
  // - Intermediate sports get dynamically stepped counts (5, 5, 4, 4)
  const minTournaments = 3;
  const maxTournaments = 6;
  const ratio = (fameRank - 1) / (totalSports - 1);
  const count = Math.round(maxTournaments - ratio * (maxTournaments - minTournaments));
  return Math.min(maxTournaments, Math.max(minTournaments, count));
}

function generateDynamicTournaments(): GeneratedTournament[] {
  const prizePools = ["25000", "35000", "40000", "50000", "60000", "75000", "100000"];
  const list: GeneratedTournament[] = [];
  const totalSports = SPORT_POPULARITY_DATA.length;

  for (const entry of SPORT_POPULARITY_DATA) {
    const count = getDynamicTournamentCount(entry.fameRank, totalSports);
    const shuffledTitles = [...entry.titles].sort(() => Math.random() - 0.5);
    const shuffledVenues = [...NCR_VENUES].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const venue = shuffledVenues[i % shuffledVenues.length]!;
      // Subtle randomized GPS coordinate jitter within venue premises (±0.002 to ±0.004 degrees, ~200-400m)
      const latJitter = Math.round((Math.random() - 0.5) * 0.006 * 1000) / 1000;
      const lngJitter = Math.round((Math.random() - 0.5) * 0.006 * 1000) / 1000;
      const venueLat = Math.round((venue.lat + latJitter) * 1000) / 1000;
      const venueLng = Math.round((venue.lng + lngJitter) * 1000) / 1000;

      const title = shuffledTitles[i] ?? `${entry.sport} Cup ${i + 1}`;
      const prizePool = prizePools[Math.floor(Math.random() * prizePools.length)]!;
      const maxTeams = entry.maxTeamsPool[Math.floor(Math.random() * entry.maxTeamsPool.length)]!;

      // Randomized dates: between Feb 18, 2027 and Apr 25, 2027
      const dayOffset = 18 + Math.floor(Math.random() * 55);
      const startDay = new Date(Date.UTC(2027, 1, dayOffset, 12, 0, 0));
      const endDay = new Date(startDay.getTime() + (3 + Math.floor(Math.random() * 3)) * 86400000);
      const regDeadline = new Date(startDay.getTime() - 5 * 86400000);

      const id = `30000000-0000-4000-8000-${entry.sportCode}${String(i + 1).padStart(2, "0")}`;

      list.push({
        id,
        name: title,
        sport: entry.sport,
        venueName: venue.name,
        venueLat,
        venueLng,
        prizePool,
        maxTeams,
        teamSize: entry.teamSize,
        startDate: startDay.toISOString(),
        endDate: endDay.toISOString(),
        registrationDeadline: regDeadline.toISOString(),
        minGti: "0",
        maxGti: "100",
      });
    }
  }

  return list;
}

function seedOrganizer(): void {
  tournaments.clear();
  brackets.clear();
  healthAlerts.clear();
  vitals.clear();
  matchState = "LIVE";
  matchesRecorded = 0;
  scoutSearchable = true;
  seedAdmin();
  scoutOutreach.clear();
  tournaments.set(ids.tournament, tournamentSchema.parse(makeTournament()));
  brackets.set(ids.bracket, bracketSchema.parse(makeBracket()));
  brackets.set(
    ids.higher,
    bracketSchema.parse({
      ...makeBracket(),
      id: ids.higher,
      name: "Gold tier",
      tierName: "GOLD",
      minGti: "60",
      maxGti: "100",
    }),
  );

  const dynamicTournaments = generateDynamicTournaments();
  for (const t of dynamicTournaments) {
    const tournament = tournamentSchema.parse({
      id: t.id,
      organizerId: federationOrgId,
      name: t.name,
      title: t.name,
      sport: t.sport,
      status: "REGISTRATION_OPEN",
      minGti: t.minGti,
      maxGti: t.maxGti,
      maxTeams: t.maxTeams,
      teamSize: t.teamSize,
      prizePool: t.prizePool,
      currency: "INR",
      venueName: t.venueName,
      venueLat: t.venueLat,
      venueLng: t.venueLng,
      registrationDeadline: t.registrationDeadline,
      startDate: t.startDate,
      endDate: t.endDate,
      rulesConfig: {},
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    });
    tournaments.set(t.id, tournament);

    const bId = t.id.replace(/^3/, "4");
    brackets.set(
      bId,
      bracketSchema.parse({
        id: bId,
        tournamentId: t.id,
        name: "Open Community Bracket",
        tierName: "OPEN",
        minGti: t.minGti,
        maxGti: t.maxGti,
        entryFee: "500",
        maxTeams: t.maxTeams,
        bracketType: "SINGLE_ELIMINATION",
        roundOrder: 1,
        config: {},
      }),
    );
  }
  for (const [id, name] of [
    [ids.athlete, "athlete@example.com"],
    [opponentId, "opponent@example.com"],
  ])
    vitals.set(id!, {
      athleteId: id!,
      name: name!,
      heart_rate: 110,
      spo2: 98,
      skin_temperature: 36.8,
      severity: "NORMAL",
      observedAt: new Date().toISOString(),
      source: "BLE",
      baseline_fields: [],
      matchId: safetyMatchId,
      matchStatus: "LIVE",
    });
}
seedOrganizer();
function triggerCritical(): void {
  matchState = "PAUSED_SAFETY";
  const alert: HealthAlert = {
    id: ids.alert,
    athleteId: ids.athlete,
    tournamentId: ids.tournament,
    bracketId: ids.bracket,
    matchId: safetyMatchId,
    severity: "CRITICAL",
    heartRate: 205,
    spo2: 88,
    skinTemperature: 40,
    triggerReason: "CRITICAL BIOMETRIC EXTREME",
    matchPaused: true,
    source: "BLE",
    baselineFields: [],
    acknowledgedAt: null,
    acknowledgedById: null,
    medicalCheckNote: null,
    medicalCheckDispatched: false,
    createdAt: new Date().toISOString(),
  };
  healthAlerts.set(alert.id, alert);
  const current = vitals.get(ids.athlete)!;
  vitals.set(ids.athlete, {
    ...current,
    heart_rate: 205,
    spo2: 88,
    skin_temperature: 40,
    severity: "CRITICAL",
    matchStatus: matchState,
    observedAt: new Date().toISOString(),
  });
  io.of("/ws/events").to(`safety:tournament:${ids.tournament}`).emit("VITALS_UPDATED", {
    tournament_id: ids.tournament,
    athlete_id: ids.athlete,
    heart_rate: 205,
    spo2: 88,
    skin_temperature: 40,
    severity: "CRITICAL",
    observed_at: new Date().toISOString(),
    source: "BLE",
    baseline_fields: [],
    match_id: safetyMatchId,
    bracket_id: ids.bracket,
  });
  io.of("/ws/events")
    .to(`safety:tournament:${ids.tournament}`)
    .emit("MATCH_PAUSE_ALERT", {
      event: "MATCH_PAUSE_ALERT",
      event_id: crypto.randomUUID(),
      alert_id: alert.id,
      severity: "CRITICAL",
      athlete_id: ids.athlete,
      athlete_name: "athlete@example.com",
      tournament_id: ids.tournament,
      bracket_id: ids.bracket,
      match_id: safetyMatchId,
      source: "BLE",
      vitals: { heart_rate: 205, spo2: 88, skin_temperature: 40 },
      directive: "MANDATORY REST: PAUSE ACTIVITY IMMEDIATELY",
    });
}

function send(response: ServerResponse, data: unknown, status = 200, bare = false): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify(
      bare || status >= 400 ? data : { success: true, data, timestamp: new Date().toISOString() },
    ),
  );
}
function problem(status: number, detail: string, extra: Record<string, JsonValue> = {}) {
  return {
    type: "about:blank",
    title: "Fixture response",
    status,
    detail,
    instance: "",
    timestamp: new Date().toISOString(),
    ...extra,
  };
}
async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  return Buffer.concat(chunks).toString();
}
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost:4100");
  const path = url.pathname.replace(/^\/api\/v1\//, "");
  const method = request.method ?? "GET";
  if (url.pathname === "/__control__/degraded-health") {
    healthDegraded = true;
    send(response, {}, 200, true);
    return;
  }
  if (url.pathname === "/ready") {
    send(response, { ready: true }, 200, true);
    return;
  }
  if (url.pathname === "/__control__/reset") {
    cache.clear();
    joined = false;
    matched = false;
    profileExists = true;
    foreignOwner = false;
    scoutAlertAcknowledged = false;
    seenMutations.length = 0;
    nearbyPages = false;
    passport = makePassport();
    seedOrganizer();
    io.of("/ws/events").disconnectSockets(true);
    io.of("/ws/matchmaking").disconnectSockets(true);
    send(response, {}, 200, true);
    return;
  }
  if (url.pathname === "/__control__/event-in-progress") {
    tournaments.set(ids.tournament, { ...tournaments.get(ids.tournament)!, status: "IN_PROGRESS" });
    send(response, {}, 200, true);
    return;
  }
  if (url.pathname === "/__control__/critical-safety") {
    triggerCritical();
    send(response, {}, 200, true);
    return;
  }
  if (url.pathname === "/__control__/normal-safety") {
    const current = vitals.get(ids.athlete)!;
    vitals.set(ids.athlete, {
      ...current,
      heart_rate: 110,
      spo2: 98,
      skin_temperature: 36.8,
      severity: "NORMAL",
      observedAt: new Date().toISOString(),
    });
    send(response, {}, 200, true);
    return;
  }
  if (url.pathname === "/__control__/gti-update") {
    passport.biomechanicalScore = 94;
    const previousGti = passport.currentGti;
    passport.currentGti = 0.35 * 94 + 0.25 * passport.wearableScore + 0.4 * passport.matchPerfScore;
    io.of("/ws/events").to(`athlete:${ids.athlete}`).emit("GTI_UPDATED", {
      athleteId: ids.athlete,
      previousGti,
      newGti: passport.currentGti,
      eliteBreached: false,
    });
    send(response, {}, 200, true);
    return;
  }
  if (url.pathname === "/__control__/nearby-pages") {
    nearbyPages = true;
    send(response, {}, 200, true);
    return;
  }
  if (url.pathname === "/__control__/foreign-owner") {
    foreignOwner = true;
    send(response, {}, 200, true);
    return;
  }
  if (url.pathname === "/__control__/no-profile") {
    profileExists = false;
    send(response, {}, 200, true);
    return;
  }
  if (url.pathname === "/__control__/mutations") {
    send(response, seenMutations, 200, true);
    return;
  }
  if (url.pathname === "/__control__/sockets") {
    send(
      response,
      {
        matchmaking: io.of("/ws/matchmaking").sockets.size,
        events: io.of("/ws/events").sockets.size,
      },
      200,
      true,
    );
    return;
  }
  if (url.pathname === "/__control__/match") {
    matched = true;
    const payload = {
      event: "ROSTER_FORMED",
      data: {
        team_id: ids.team,
        team_name: "FA-Roster-TEST",
        bracket_id: ids.bracket,
        roster: [
          { user_id: ids.athlete, name: "athlete@example.com", assigned_role: "BOWLER", gti: 72.5 },
        ],
      },
    };
    io.of("/ws/matchmaking").to(`user:${ids.athlete}`).emit("ROSTER_FORMED", payload);
    io.of("/ws/matchmaking").to(`user:${ids.athlete}`).emit("ROSTER_FORMED", payload);
    send(response, {}, 200, true);
    return;
  }
  if (url.pathname === "/__control__/scout-opt-out") {
    scoutSearchable = false;
    send(response, {}, 200, true);
    return;
  }
  const raw = await readBody(request);
  const body: Record<string, unknown> = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  const key = `${request.headers.authorization ?? "public"}:${method}:${path}:${request.headers["idempotency-key"] ?? ""}`;
  const cached = cache.get(key);
  if (method !== "GET" && !request.headers["idempotency-key"]) {
    send(response, problem(400, "Idempotency-Key required"), 400);
    return;
  }
  if (cached) {
    if (cached.body !== raw) send(response, problem(409, "Payload changed"), 409);
    else send(response, cached.response);
    return;
  }
  const ok = (data: unknown, bare = false): void => {
    if (method !== "GET") {
      seenMutations.push(`${method} ${path}`);
      if (!bare) cache.set(key, { body: raw, response: data });
    }
    send(response, data, 200, bare);
  };
  if (["auth/login", "auth/register", "auth/refresh"].includes(path)) {
    const gov = body.governmentId as Record<string, unknown> | undefined;
    const idNumber = typeof gov?.idNumber === "string" ? gov.idNumber.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const hasIdentifier = Boolean(identifier || rawEmail || rawPhone);

    if (path === "auth/login") {
      if (
        password === "wrong-password" ||
        password === "wrong-proof" ||
        idNumber === "wrong-proof" ||
        (!password && !idNumber) ||
        !hasIdentifier
      ) {
        send(response, problem(401, "Invalid login credentials."), 401);
        return;
      }
    } else if (path === "auth/register") {
      if (
        password === "wrong-password" ||
        password === "wrong-proof" ||
        idNumber === "wrong-proof"
      ) {
        send(response, problem(401, "Invalid registration payload."), 401);
        return;
      }
    }

    const email = rawEmail
      ? rawEmail
      : identifier.includes("@")
        ? identifier
        : "athlete@example.com";
    const phone = rawPhone ? rawPhone : !identifier.includes("@") && identifier ? identifier : null;

    const requestedRole = (typeof body.role === "string" ? body.role : null) as UserRole | null;
    const role: UserRole =
      (requestedRole &&
      ["ATHLETE", "ORGANIZER", "SCOUT", "SUPER_ADMIN", "FEDERATION_ADMIN"].includes(requestedRole)
        ? requestedRole
        : null) ??
      (email.startsWith("organizer")
        ? "ORGANIZER"
        : email.startsWith("scout")
          ? "SCOUT"
          : email.startsWith("policy")
            ? "FEDERATION_ADMIN"
            : email.startsWith("admin")
              ? "SUPER_ADMIN"
              : "ATHLETE");

    const baseUser = makeUser(role);
    const isExplicitlyUnverified =
      email.includes("not-legit") ||
      email.includes("unverified") ||
      identifier.includes("not-legit") ||
      identifier.includes("unverified") ||
      body.isVerified === false;
    const isVerified =
      role !== "ATHLETE"
        ? true
        : body.isVerified !== undefined
          ? Boolean(body.isVerified)
          : !isExplicitlyUnverified;

    const user = {
      ...baseUser,
      name:
        typeof body.name === "string" && body.name.trim()
          ? body.name.trim()
          : (baseUser.name ?? "Athlete User"),
      email,
      phone: phone ?? baseUser.phone,
      isVerified,
      isLegit: isVerified,
    };
    passport.identityStatus = isVerified ? "VERIFIED" : "UNVERIFIED";
    ok({
      accessToken: `fixture:${role}`,
      refreshToken: `refresh:${role}`,
      tokenType: "Bearer",
      expiresIn: 900,
      user,
    });
    return;
  }
  if (!request.headers.authorization?.startsWith("Bearer fixture:")) {
    send(response, problem(401, "Missing token"), 401);
    return;
  }
  if (path.startsWith("admin/")) {
    const role = request.headers.authorization?.split(":")[1];
    if (role !== "SUPER_ADMIN" && role !== "FEDERATION_ADMIN") {
      send(response, problem(403, "Administrator access required"), 403);
      return;
    }
    const cursorPage = <T extends { id: string }>(entries: T[], descending = false) => {
      const sorted = [...entries].sort((a, b) =>
        descending ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id),
      );
      const cursor = url.searchParams.get("cursor_id") ?? url.searchParams.get("cursor");
      const start = cursor ? sorted.findIndex((row) => row.id === cursor) + 1 : 0;
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const data = sorted.slice(start, start + limit);
      const has_more = sorted.length > start + limit;
      return { data, has_more, next_cursor: has_more ? data.at(-1)!.id : null, count: data.length };
    };
    if (path === "admin/dashboard") {
      ok({
        totalVerifiedAthletes: [...adminUsers.values()].filter(
          (user) =>
            user.role === "ATHLETE" && user.isActive && user.identityRecord?.status === "VERIFIED",
        ).length,
        activeTournaments: [...tournaments.values()].filter(
          (event) =>
            event.organizerId === ids.organizer &&
            ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"].includes(event.status),
        ).length,
        totalOrganizersAndScouts: [...adminUsers.values()].filter((user) =>
          ["ORGANIZER", "SCOUT"].includes(user.role),
        ).length,
        totalVerifiedDrills: 8,
        totalSafetyMatchPauses: [...adminAudits.values()].filter(
          (event) => event.category === "SAFETY_MATCH_PAUSE",
        ).length,
        totalSandbaggingBlocks: [...adminAudits.values()].filter(
          (event) => event.category === "SANDBAGGING_BLOCKED",
        ).length,
        health: {
          status: healthDegraded ? "degraded" : "ok",
          db: "ok",
          redis: healthDegraded ? "unavailable" : "ok",
          uptime: 500,
        },
        dbLatencyMs: 2.5,
        redisLatencyMs: healthDegraded ? null : 1.25,
        postgisAvailable: true,
        postgisLatencyMs: 3.5,
        bullmqQueuesStatus: ["gti-calculation", "matchmaking", "scout-alerts"].map((name) => ({
          name,
          status: healthDegraded ? "unreachable" : "ok",
          latencyMs: healthDegraded ? null : 2.75,
          waiting: healthDegraded ? null : 2,
          active: healthDegraded ? null : 1,
          delayed: healthDegraded ? null : 0,
          failed: healthDegraded ? null : 0,
          completed: healthDegraded ? null : 12,
        })),
        observedAt: new Date().toISOString(),
      });
      return;
    }
    if (path === "admin/users") {
      ok(
        cursorPage(
          [...adminUsers.values()].filter(
            (user) =>
              (!url.searchParams.get("role") || user.role === url.searchParams.get("role")) &&
              (!url.searchParams.get("verificationStatus") ||
                user.identityRecord?.status === url.searchParams.get("verificationStatus")) &&
              (!url.searchParams.has("isActive") ||
                user.isActive === (url.searchParams.get("isActive") === "true")),
          ),
        ),
      );
      return;
    }
    if (/^admin\/users\/[^/]+\/(governance|status)$/.test(path)) {
      if (role !== "SUPER_ADMIN") {
        send(response, problem(403, "Only super administrators can govern user accounts"), 403);
        return;
      }
      const id = path.split("/")[2]!;
      const target = adminUsers.get(id);
      if (!target) {
        send(response, problem(404, "User not found"), 404);
        return;
      }
      if (
        target.role === "SUPER_ADMIN" &&
        (body.isActive === false || (body.role && body.role !== "SUPER_ADMIN"))
      ) {
        send(response, problem(409, "Cannot revoke the last active super administrator"), 409);
        return;
      }
      const updated = adminUserSchema.parse({
        ...target,
        ...(body.role ? { role: body.role } : {}),
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
        identityRecord: body.verificationStatus
          ? { ...target.identityRecord, status: body.verificationStatus }
          : target.identityRecord,
      });
      adminUsers.set(id, updated);
      recordAdminAudit(
        "ROLE_GOVERNANCE",
        body.isActive === false ? "WARNING" : "INFO",
        "Account credentials or access changed",
        id,
        {
          before: {
            role: target.role,
            isActive: target.isActive,
            verificationStatus: target.identityRecord?.status ?? null,
          },
          after: {
            role: updated.role,
            isActive: updated.isActive,
            verificationStatus: updated.identityRecord?.status ?? null,
          },
        },
      );
      ok(updated);
      return;
    }
    if (path === "admin/tournaments") {
      ok(
        cursorPage(
          [...tournaments.values()]
            .filter(
              (event) =>
                (!url.searchParams.get("status") ||
                  event.status === url.searchParams.get("status")) &&
                event.organizerId === ids.organizer,
            )
            .map((event) => ({ ...event, isFeatured: event.isFeatured ?? false })),
        ),
      );
      return;
    }
    if (/^admin\/tournaments\/[^/]+\/(moderation|status)$/.test(path)) {
      const id = path.split("/")[2]!;
      const target = tournaments.get(id);
      if (!target) {
        send(response, problem(404, "Tournament not found"), 404);
        return;
      }
      const status = body.suspended === true ? "SUSPENDED" : (body.status ?? target.status);
      if (["COMPLETED", "CANCELLED"].includes(target.status) && status !== target.status) {
        send(response, problem(409, "A closed tournament cannot be reopened"), 409);
        return;
      }
      const updated = {
        ...tournamentSchema.parse({ ...target, status }),
        isFeatured: ["SUSPENDED", "CANCELLED", "COMPLETED"].includes(String(status))
          ? false
          : typeof body.featured === "boolean"
            ? body.featured
            : (target.isFeatured ?? false),
      };
      tournaments.set(id, updated);
      recordAdminAudit(
        "TOURNAMENT_MODERATION",
        status === "SUSPENDED" ? "WARNING" : "INFO",
        "Tournament moderated",
        id,
        { previousStatus: target.status, status: updated.status, isFeatured: updated.isFeatured },
      );
      ok(updated);
      return;
    }
    if (path === "admin/audit-logs") {
      ok(
        cursorPage(
          [...adminAudits.values()].filter(
            (event) =>
              (!url.searchParams.get("category") ||
                event.category === url.searchParams.get("category")) &&
              (!url.searchParams.get("severity") ||
                event.severity === url.searchParams.get("severity")),
          ),
          true,
        ),
      );
      return;
    }
  }
  if (path === "auth/logout") {
    ok({ success: true });
    return;
  }
  if (path === "auth/verify-government-id" || path === "auth/verify-gov-id") {
    ok({ message: "Verified", verified: true, idHashPrefix: "abcd1234" });
    return;
  }
  if (path === "users/profile") {
    ok(passport);
    return;
  }
  if (path === "drills/submit") {
    const signed = canonicalJson({
      athlete_id: body.athlete_id,
      sport: body.sport,
      drill_type: body.drill_type,
      form_score: body.form_score,
      frames_analyzed: body.frames_analyzed,
      flaw_flags: body.flaw_flags ?? [],
      joint_angles_summary: body.joint_angles_summary ?? {},
      timestamp: body.timestamp,
    });
    if (
      request.headers["x-drill-signature"] !==
      createHmac("sha256", "e2e-drill-signing-secret").update(signed).digest("hex")
    ) {
      send(response, problem(403, "Drill HMAC mismatch"), 403);
      return;
    }
    passport.biomechanicalScore = Number(body.form_score);
    passport.posturePoints += Math.round(Number(body.form_score) * 10);
    passport.currentGti =
      0.35 * passport.biomechanicalScore +
      0.25 * passport.wearableScore +
      0.4 * passport.matchPerfScore;
    ok(
      {
        success: true,
        posture_points_awarded: Math.round(Number(body.form_score) * 10),
        current_biomechanical_score: passport.biomechanicalScore,
      },
      true,
    );
    return;
  }
  if (path === "safety/telemetry-webhook") {
    if (
      request.headers["x-device-signature"] !==
      createHmac("sha256", "e2e-telemetry-signing-secret").update(raw).digest("hex")
    ) {
      send(response, problem(403, "Telemetry HMAC mismatch"), 403);
      return;
    }
    passport.wearableScore = 5;
    passport.currentGti =
      0.35 * passport.biomechanicalScore +
      0.25 * passport.wearableScore +
      0.4 * passport.matchPerfScore;
    const critical =
      Number(body.heart_rate) > 195 ||
      Number(body.spo2) < 90 ||
      Number(body.skin_temperature) > 39.5;
    if (critical)
      io.of("/ws/events")
        .to(
          typeof body.tournament_id === "string"
            ? `safety:tournament:${body.tournament_id}`
            : `athlete:${ids.athlete}`,
        )
        .emit("MATCH_PAUSE_ALERT", {
          event: "MATCH_PAUSE_ALERT",
          event_id: crypto.randomUUID(),
          severity: "CRITICAL",
          athlete_id: ids.athlete,
          athlete_name: "Fixture athlete",
          source: body.source,
          tournament_id: body.tournament_id,
          bracket_id: body.bracket_id,
          match_id: body.match_id,
          vitals: {
            heart_rate: body.heart_rate,
            spo2: body.spo2,
            skin_temperature: body.skin_temperature,
          },
          directive:
            body.source === "SIMULATOR"
              ? "SIMULATOR STRESS TEST: MANDATORY REST"
              : "MANDATORY REST",
        });
    ok({
      alert_triggered: critical,
      status: critical ? (body.match_id ? "MATCH_PAUSED" : "CRITICAL_ALERT") : "NORMAL",
    });
    return;
  }
  const viewerRole = request.headers.authorization?.split(":")[1] as UserRole;
  const viewer = makeUser(viewerRole);
  if (path.endsWith("/dossier")) {
    if (!scoutSearchable && viewerRole === "SCOUT") {
      send(response, problem(403, "Athlete profile is not opted into scout discovery"), 403);
      return;
    }
    ok(fixtureDossier(path.split("/")[1]!, viewer.id));
    return;
  }
  if (/^scouts\/dossiers\/[^/]+\/outreach$/.test(path)) {
    if (!scoutSearchable && viewerRole === "SCOUT") {
      send(response, problem(403, "Athlete profile is not opted into scout discovery"), 403);
      return;
    }
    const input = outreachSchema.parse(body);
    const athleteId = path.split("/")[2]!;
    const recordKey = `${viewer.id}:${athleteId}`;
    const previous = scoutOutreach.get(recordKey);
    const saved = outreachRecordSchema.parse({
      id: previous?.id ?? "99000000-0000-4000-8000-000000000001",
      athleteId: ids.profile,
      scoutId: viewer.id,
      scoutNotes: input.notes ?? previous?.scoutNotes ?? "",
      organizationName: input.organizationName ?? null,
      isShortlisted: input.actionType === "SHORTLIST_BOOKMARK" || previous?.isShortlisted === true,
      pipelineStatus:
        input.actionType === "SHORTLIST_BOOKMARK"
          ? (previous?.pipelineStatus ?? "DISCOVERED")
          : input.actionType === "OFFER_TRIAL"
            ? "TRIAL_OUTREACH"
            : "SCHOLARSHIP_OUTREACH",
      outreachHistory: [
        ...(previous?.outreachHistory ?? []),
        {
          ...input,
          notes: input.notes ?? "",
          organizationName: input.organizationName ?? null,
          recordedAt: new Date().toISOString(),
        },
      ],
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    scoutOutreach.set(recordKey, saved);
    ok(saved);
    return;
  }
  if (path === "gti/leaderboards") {
    const scope = url.searchParams.get("scope") ?? "NATIONAL";
    const entries = leaderboardEntries()
      .filter(
        (entry) =>
          (scoutSearchable || entry.athlete_id !== ids.athlete) &&
          (!url.searchParams.get("sport") ||
            url.searchParams.get("sport") === "ALL" ||
            entry.primary_sport === url.searchParams.get("sport")) &&
          (scope === "NATIONAL" || entry.state === url.searchParams.get("state")) &&
          (scope !== "DISTRICT" || entry.district === url.searchParams.get("district")) &&
          (!url.searchParams.get("gender") || entry.gender === url.searchParams.get("gender")) &&
          (url.searchParams.get("tier") !== "RURAL_AND_TIER_2_3" ||
            entry.tier_classification !== "METRO"),
      )
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    const cursor = url.searchParams.get("cursor_id");
    const offset = cursor ? entries.findIndex((entry) => entry.profile_id === cursor) + 1 : 0;
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const data = entries.slice(offset, offset + limit);
    const more = entries.length > offset + limit;
    ok(
      {
        success: true,
        scope,
        total: entries.length,
        data,
        next_cursor: more ? data.at(-1)!.profile_id : null,
        has_more: more,
      },
      true,
    );
    return;
  }
  if (path.startsWith("users/")) {
    const target = adminUsers.get(path.split("/")[1]!) ?? makeUser();
    ok({
      ...target,
      isActive: method !== "DELETE",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    });
    return;
  }
  if (path.startsWith("passport/")) {
    if (path.endsWith("/sports")) {
      const record = {
        id: ids.sport,
        athleteId: ids.profile,
        sport: "CRICKET",
        primaryRole: "BOWLER",
        secondaryRoles: [],
        totalMatches: 0,
        winCount: 0,
        winStreak: 0,
        verifiedMetrics: {},
        earnedBadges: [],
        updatedAt: "2026-10-01T00:00:00.000Z",
      };
      ok(
        method === "GET"
          ? { data: [record], next_cursor: null, has_more: false, count: 1 }
          : record,
      );
      return;
    }
    if (!profileExists && method === "GET") {
      send(response, problem(404, "Passport not found"), 404);
      return;
    }
    profileExists = true;
    ok(passport);
    return;
  }
  if (path === "tournaments/nearby") {
    if (nearbyPages) {
      const rows = Array.from({ length: 45 }, (_, index) => ({
        ...makeTournament(),
        id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        name: `Nearby Tournament ${String(index + 1).padStart(2, "0")}`,
        prizePool: 25000,
        minGti: 0,
        maxGti: 100,
        distanceKm: Math.floor(index / 2),
      }));
      const cursor = url.searchParams.get("cursor");
      const start = cursor ? rows.findIndex((row) => row.id === cursor) + 1 : 0;
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const data = rows.slice(start, start + limit);
      const has_more = start + limit < rows.length;
      ok({ data, next_cursor: has_more ? data.at(-1)!.id : null, has_more });
      return;
    }

    const reqLat = Number(url.searchParams.get("lat") ?? 28.6692);
    const reqLng = Number(url.searchParams.get("lng") ?? 77.4538);
    const reqRadius = Number(url.searchParams.get("radius_km") ?? 50);
    const reqSport = url.searchParams.get("sport");

    const all = [...tournaments.values()].map((t) => {
      const dist = haversineDistanceKm(reqLat, reqLng, t.venueLat, t.venueLng);
      return {
        id: t.id,
        name: t.name,
        sport: t.sport,
        status: t.status,
        minGti: Number(t.minGti),
        maxGti: Number(t.maxGti),
        venueName: t.venueName,
        venueLat: t.venueLat,
        venueLng: t.venueLng,
        distanceKm: dist,
        startDate: t.startDate,
        registrationDeadline: t.registrationDeadline,
        prizePool: Number(t.prizePool),
        maxTeams: t.maxTeams,
        teamSize: t.teamSize,
      };
    });

    let filtered = all.filter((t) => t.distanceKm <= reqRadius);
    if (reqSport && reqSport.trim()) {
      filtered = filtered.filter((t) => t.sport === reqSport.trim().toUpperCase());
    }

    const primary = all.find((t) => t.id === ids.tournament);
    if (primary && (!reqSport || primary.sport === reqSport.trim().toUpperCase())) {
      if (!filtered.some((f) => f.id === primary.id)) {
        filtered.push({ ...primary, distanceKm: 0 });
      }
    }

    if (filtered.length < 3) {
      const sportPool = reqSport
        ? all.filter((t) => t.sport === reqSport.trim().toUpperCase())
        : all;
      sportPool.sort((a, b) => a.distanceKm - b.distanceKm);
      for (const t of sportPool) {
        if (!filtered.some((f) => f.id === t.id)) {
          filtered.push(t);
        }
        if (filtered.length >= (reqSport ? sportPool.length : 6)) break;
      }
    }

    filtered.sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));

    const cursor = url.searchParams.get("cursor");
    const start = cursor ? filtered.findIndex((row) => row.id === cursor) + 1 : 0;
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const data = filtered.slice(start, start + limit);
    const has_more = start + limit < filtered.length;
    ok({ data, next_cursor: has_more ? data.at(-1)!.id : null, has_more });
    return;
  }
  const page = <T extends { id: string }>(rows: T[]) => {
    const cursor = url.searchParams.get("cursor_id");
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const start = cursor ? rows.findIndex((row) => row.id === cursor) + 1 : 0;
    const data = rows.slice(start, start + limit);
    const has_more = start + limit < rows.length;
    return { data, next_cursor: has_more ? data.at(-1)!.id : null, has_more, count: data.length };
  };
  if (path === "tournaments/organizer/summary") {
    const mine = [...tournaments.values()].filter((t) => t.organizerId === ids.organizer);
    ok({
      activeTournamentsCount: mine.length,
      totalRegisteredAthletes: matched ? 13 : 2,
      totalPrizePoolInr: mine.reduce((sum, event) => sum + Number(event.prizePool), 0),
      freeAgentTeamsFormed: matched ? 1 : 0,
      activeSafetyAlertsCount: [...healthAlerts.values()].filter((alert) => !alert.acknowledgedAt)
        .length,
    });
    return;
  }
  if (path === "tournaments/organizer/mine") {
    ok(page([...tournaments.values()].filter((t) => t.organizerId === ids.organizer)));
    return;
  }
  if (path.endsWith("/registrations")) {
    const athletes = [
      {
        userId: ids.athlete,
        name: "athlete@example.com",
        gti: passport.currentGti,
        identityStatus: "VERIFIED",
        isActive: true,
        role: "BATSMAN",
      },
      {
        userId: opponentId,
        name: "opponent@example.com",
        gti: 50,
        identityStatus: "VERIFIED",
        isActive: true,
        role: "BOWLER",
      },
    ];
    ok(
      page([
        ...athletes.map((athlete, index) => ({
          id: `51000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          status: "CONFIRMED",
          registeredAt: "2026-11-01T00:00:00.000Z",
          teamId: null,
          teamName: null,
          athletes: [athlete],
        })),
        ...(matched
          ? [
              {
                id: "51000000-0000-4000-8000-000000000003",
                status: "CONFIRMED",
                registeredAt: "2026-11-01T00:00:00.000Z",
                teamId: ids.team,
                teamName: "FA-Roster-TEST",
                athletes: queuedAthletes(),
              },
            ]
          : []),
      ]),
    );
    return;
  }
  if (path.endsWith("/free-agents/pool")) {
    ok(page(matched ? [] : queuedAthletes()));
    return;
  }
  if (path.endsWith("/free-agents/process")) {
    const formed = !matched;
    matched = true;
    ok({ formed });
    return;
  }
  if (path.endsWith("/sandbagging-logs")) {
    ok(
      page([
        {
          id: "92000000-0000-4000-8000-000000000001",
          userId: ids.athlete,
          action: "SANDBAGGING_DETECTED",
          metadata: { athleteGti: 72.5, bracketMaxGti: 60, bracketId: ids.bracket },
          createdAt: "2026-11-01T00:00:00.000Z",
        },
      ]),
    );
    return;
  }
  if (path.endsWith("/matches/results")) {
    matchesRecorded++;
    const bracketId = path.split("/")[3]!;
    const wins = Array.isArray(body.winnerAthleteIds) ? (body.winnerAthleteIds as string[]) : [];
    const losses = Array.isArray(body.loserAthleteIds) ? (body.loserAthleteIds as string[]) : [];
    if (wins.includes(ids.athlete)) {
      passport.matchPerfScore = Number(brackets.get(bracketId)?.maxGti ?? 100) * 0.85;
      passport.currentGti =
        0.35 * passport.biomechanicalScore +
        0.25 * passport.wearableScore +
        0.4 * passport.matchPerfScore;
    }
    ok({
      id: `93000000-0000-4000-8000-${String(matchesRecorded).padStart(12, "0")}`,
      bracketId,
      matchId: body.matchId ?? null,
      matchName: body.matchName,
      scoreSummary: body.scoreSummary,
      participantAthleteIds: [...wins, ...losses],
      winnerAthleteIds: wins,
      createdAt: new Date().toISOString(),
    });
    return;
  }
  if (/^safety\/tournaments\/[^/]+\/vitals$/.test(path)) {
    const players = [...vitals.values()].map((reading) => ({
      ...reading,
      matchStatus: matchState,
    }));
    const result = page(players.map((reading) => ({ ...reading, id: reading.athleteId })));
    ok({
      ...result,
      activeAlerts: [...healthAlerts.values()].filter(
        (alert) => alert.severity === "CRITICAL" && !alert.acknowledgedAt,
      ),
      matches: [
        {
          id: safetyMatchId,
          bracketId: ids.bracket,
          status: matchState,
          pauseReason: matchState === "PAUSED_SAFETY" ? "CRITICAL BIOMETRIC EXTREME" : null,
        },
      ],
    });
    return;
  }
  if (/^safety\/tournaments\/[^/]+\/alerts$/.test(path)) {
    ok(page([...healthAlerts.values()]));
    return;
  }
  if (/^safety\/alerts\/[^/]+\/acknowledge$/.test(path)) {
    const alertId = path.split("/")[2]!;
    const alert = healthAlerts.get(alertId);
    if (!alert) {
      send(response, problem(404, "Incident not found"), 404);
      return;
    }
    const saved = {
      ...alert,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedById: ids.organizer,
      medicalCheckNote: String(body.medicalCheckNote),
      medicalCheckDispatched: body.medicalCheckDispatched === true,
    };
    healthAlerts.set(alertId, saved);
    ok(saved);
    return;
  }
  if (/^safety\/matches\/[^/]+\/resume$/.test(path)) {
    if (
      body.medicalClearanceConfirmed !== true ||
      [...healthAlerts.values()].some(
        (alert) => alert.matchId === safetyMatchId && !alert.acknowledgedAt,
      )
    ) {
      send(response, problem(409, "Medical clearance and acknowledgement are required"), 409);
      return;
    }
    matchState = "LIVE";
    ok({ id: safetyMatchId, status: matchState });
    return;
  }
  if (path === "tournaments" && method === "POST") {
    const event = tournamentSchema.parse({
      ...makeTournament(),
      ...body,
      minGti: String(body.minGti ?? 0),
      maxGti: String(body.maxGti ?? 100),
      prizePool: String(body.prizePool ?? 0),
    });
    tournaments.set(event.id, event);
    ok(event);
    return;
  }
  if (/^tournaments\/[^/]+\/brackets\/[^/]+$/.test(path) && ["PATCH", "DELETE"].includes(method)) {
    const id = path.split("/")[3]!;
    const existing = brackets.get(id);
    if (!existing) {
      send(response, problem(404, "Bracket not found"), 404);
      return;
    }
    if (method === "DELETE") {
      brackets.delete(id);
      ok(existing);
      return;
    }
    const saved = bracketSchema.parse({
      ...existing,
      ...body,
      minGti: String(body.minGti ?? existing.minGti),
      maxGti: String(body.maxGti ?? existing.maxGti),
      entryFee: String(body.entryFee ?? existing.entryFee),
    });
    brackets.set(id, saved);
    ok(saved);
    return;
  }
  if (/^tournaments\/[^/]+$/.test(path) && ["PATCH", "DELETE"].includes(method)) {
    const id = path.split("/")[1]!;
    const existing = tournaments.get(id);
    if (!existing) {
      send(response, problem(404, "Tournament not found"), 404);
      return;
    }
    if (method === "DELETE") {
      tournaments.delete(id);
      ok(existing);
      return;
    }
    const saved = tournamentSchema.parse({
      ...existing,
      ...body,
      minGti: String(body.minGti ?? existing.minGti),
      maxGti: String(body.maxGti ?? existing.maxGti),
      prizePool: String(body.prizePool ?? existing.prizePool),
    });
    tournaments.set(id, saved);
    ok(saved);
    return;
  }
  if (path.includes("/register")) {
    if (path.includes(ids.higher)) {
      ok({
        registrationId: ids.registration,
        bracketId: ids.higher,
        tournamentId: ids.tournament,
        athleteId: ids.profile,
        tierName: "GOLD",
        athleteGti: 72.5,
        status: "CONFIRMED",
        feePaid: 500,
        registeredAt: "2026-10-31T00:00:00.000Z",
        teamId: null,
      });
      return;
    }
    send(
      response,
      problem(409, "Your GTI exceeds this bracket's maximum.", {
        code: "SANDBAGGING_DETECTED",
        athleteGti: 72.5,
        bracketMaxGti: 60,
        bracketMinGti: 0,
        suggestedBracketId: ids.higher,
        suggestedBracketTier: "GOLD",
      }),
      409,
    );
    return;
  }
  if (path.includes("/free-agents/")) {
    if (path.endsWith("/join")) joined = true;
    if (path.endsWith("/leave")) {
      joined = false;
      ok({ message: "Left queue", cancelled: true });
      return;
    }
    if (!joined) {
      send(response, problem(404, "Not in pool"), 404);
      return;
    }
    ok({
      registrationId: ids.registration,
      userId: ids.athlete,
      tournamentId: ids.tournament,
      bracketId: ids.bracket,
      sport: "CRICKET",
      primaryRole: "BOWLER",
      secondaryRole: null,
      status: matched ? "MATCHED" : "QUEUED",
      waitPosition: matched ? 0 : 1,
      matchedTeamId: matched ? ids.team : null,
      teamName: matched ? "FA-Roster-TEST" : null,
      assignedRole: matched ? "BOWLER" : null,
      roster: matched
        ? [
            {
              user_id: ids.athlete,
              name: "athlete@example.com",
              assigned_role: "BOWLER",
              gti: 72.5,
            },
          ]
        : null,
      joinedAt: "2026-10-01T00:00:00.000Z",
    });
    return;
  }
  if (path.endsWith("/brackets")) {
    if (method === "GET") ok(page([...brackets.values()]));
    else {
      const id = `40000000-0000-4000-8000-${String(brackets.size + 1).padStart(12, "0")}`;
      const saved = bracketSchema.parse({
        ...makeBracket(),
        ...body,
        id,
        minGti: String(body.minGti),
        maxGti: String(body.maxGti),
        entryFee: String(body.entryFee ?? 0),
      });
      brackets.set(id, saved);
      ok(saved);
    }
    return;
  }
  if (path.startsWith("tournaments/")) {
    const event = tournaments.get(path.split("/")[1]!);
    if (!event) {
      send(response, problem(404, "Tournament not found"), 404);
      return;
    }
    ok({
      ...event,
      ...(foreignOwner ? { organizerId: ids.athlete } : {}),
      brackets: [...brackets.values()],
    });
    return;
  }
  if (path.startsWith("gti/recalculate/")) {
    passport = {
      ...passport,
      biomechanicalScore: 80,
      wearableScore: 70,
      matchPerfScore: 67.5,
      currentGti: 72.5,
    };
    ok({
      athleteId: ids.athlete,
      gti: 72.5,
      previousGti: 72.5,
      biomechanicalScore: 80,
      wearableScore: 70,
      matchPerformanceScore: 67.5,
      eliteBreached: false,
      scoutAlertTriggered: false,
    });
    return;
  }
  if (path.startsWith("gti/rank/")) {
    ok({ sport: "CRICKET", athleteId: ids.athlete, rank: 12 });
    return;
  }
  if (path === "scouts/feed") {
    const prospects = [
      {
        athlete_id: ids.athlete,
        profile_id: ids.profile,
        gti: 88.5,
        primary_sport: "CRICKET",
        district: "Varanasi",
        state: "Uttar Pradesh",
        tier: "RURAL",
        is_rural_or_underrepresented: true,
        biomechanical_score: 88,
        training_consistency_score: 85,
        match_performance_score: 91,
        posture_points: 100,
        alert_count: 1,
      },
      {
        athlete_id: "10000000-0000-4000-8000-000000000009",
        profile_id: "20000000-0000-4000-8000-000000000009",
        gti: 90,
        primary_sport: "FOOTBALL",
        district: "Pune",
        state: "Maharashtra",
        tier: "METRO",
        is_rural_or_underrepresented: false,
        biomechanical_score: 90,
        training_consistency_score: 90,
        match_performance_score: 90,
        posture_points: 100,
        alert_count: 0,
      },
    ].filter(
      (prospect) =>
        prospect.gti >= Number(url.searchParams.get("min_gti") ?? 0) &&
        (!url.searchParams.get("sport") ||
          prospect.primary_sport === url.searchParams.get("sport")) &&
        (!url.searchParams.get("district") ||
          prospect.district.toLowerCase() === url.searchParams.get("district")?.toLowerCase()),
    );
    ok(
      { success: true, total: prospects.length, limit: 20, next_cursor: null, data: prospects },
      true,
    );
    return;
  }
  if (path === "scouts/alerts" || path === `scouts/alerts/${ids.alert}/acknowledge`) {
    if (method === "PATCH") scoutAlertAcknowledged = true;
    const alert = {
      id: ids.alert,
      athleteId: ids.athlete,
      gtiScore: 88.5,
      district: "Varanasi",
      sport: "CRICKET",
      isAcknowledged: scoutAlertAcknowledged,
      createdAt: "2026-10-30T12:00:00.000Z",
    };
    ok(
      method === "PATCH"
        ? alert
        : [
            {
              ...alert,
              athlete: {
                id: ids.athlete,
                email: "athlete@example.com",
                phone: null,
                athleteProfile: {
                  id: ids.profile,
                  primarySport: "CRICKET",
                  currentGti: "88.5",
                  district: "Varanasi",
                  state: "Uttar Pradesh",
                },
              },
            },
          ].filter(
            (entry) =>
              (!url.searchParams.get("sport") || entry.sport === url.searchParams.get("sport")) &&
              (!url.searchParams.get("district") ||
                entry.district.toLowerCase() === url.searchParams.get("district")?.toLowerCase()),
          ),
    );
    return;
  }
  if (path === "heatmaps/regional") {
    ok(
      {
        success: true,
        count: 5,
        is_complete: true,
        data: [
          {
            state: "Karnataka",
            district: "Varanasi",
            total_athletes: 7,
            average_gti: 60,
            female_participation_pct: 55,
            centroid: { type: "Point", coordinates: [76, 15] },
          },
          {
            state: "Uttar Pradesh",
            district: "Varanasi",
            total_athletes: 100,
            average_gti: 65,
            female_participation_pct: 42,
            centroid: { type: "Point", coordinates: [82.9739, 25.3176] },
          },
          {
            state: "Uttar Pradesh",
            district: "Ghaziabad",
            total_athletes: 50,
            average_gti: 90,
            female_participation_pct: 20,
            centroid: { type: "Point", coordinates: [77.4538, 28.6692] },
          },
          {
            state: "Uttar Pradesh",
            district: "Meerut",
            total_athletes: 0,
            average_gti: 0,
            female_participation_pct: 0,
            centroid: null,
          },
          {
            state: "Uttar Pradesh",
            district: "Lucknow",
            total_athletes: 10,
            average_gti: 70,
            female_participation_pct: 30,
            centroid: { type: "Point", coordinates: [999, 91] },
          },
        ],
      },
      true,
    );
    return;
  }
  send(response, problem(404, "Fixture has no such contract"), 404);
});
const io = new Server(server, { cors: { origin: "http://localhost:3001" } });
io.of("/ws/matchmaking").on("connection", (socket) => {
  socket.on("join:user", (data: { userId: string }) => {
    void socket.join(`user:${data.userId}`);
  });
  socket.on("join:bracket", (data: { bracketId: string }) => {
    void socket.join(`bracket:${data.bracketId}`);
  });
});
io.of("/ws/events")
  .use((socket, next) => {
    const token: unknown = socket.handshake.auth.token;
    if (typeof token !== "string" || !token.startsWith("fixture:")) {
      next(new Error("Unauthorized"));
      return;
    }
    const role = token.slice("fixture:".length);
    void socket.join(`role:${role}`);
    if (role === "ATHLETE") void socket.join(`athlete:${ids.athlete}`);
    next();
  })
  .on("connection", (socket) => {
    socket.on("join:tournament", (data: { tournamentId: string }) => {
      void socket.join(`tournament:${data.tournamentId}`);
      if (
        ["ORGANIZER", "FEDERATION_ADMIN", "SUPER_ADMIN"].includes(
          String(socket.handshake.auth.token).slice("fixture:".length),
        ) &&
        data.tournamentId === ids.tournament
      )
        void socket.join(`safety:tournament:${data.tournamentId}`);
    });
  });
server.listen(4100, "localhost");
process.on("SIGTERM", () => {
  void io.close();
  server.close();
});
