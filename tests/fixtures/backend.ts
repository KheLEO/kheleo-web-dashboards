import { z } from "zod";
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
type FixtureTournament = z.infer<typeof tournamentSchema>;
type FixtureBracket = z.infer<typeof bracketSchema>;
const tournaments = new Map<string, FixtureTournament>();
const brackets = new Map<string, FixtureBracket>();
const healthAlerts = new Map<string, HealthAlert>();
const vitals = new Map<string, AthleteVitals>();
const opponentId = "10000000-0000-4000-8000-000000000005";
const safetyMatchId = "91000000-0000-4000-8000-000000000001";
let matchState = "LIVE";
let matchesRecorded = 0;
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
function seedOrganizer(): void {
  tournaments.clear();
  brackets.clear();
  healthAlerts.clear();
  vitals.clear();
  matchState = "LIVE";
  matchesRecorded = 0;
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
  const raw = await readBody(request);
  const body: Record<string, unknown> = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  const key = `${method}:${path}:${request.headers["idempotency-key"] ?? ""}`;
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
    if (path !== "auth/refresh" && gov?.idNumber !== "12345678") {
      send(response, problem(401, "Invalid login credentials."), 401);
      return;
    }
    const email = typeof body.email === "string" ? body.email : "athlete@example.com";
    const role: UserRole = email.startsWith("organizer")
      ? "ORGANIZER"
      : email.startsWith("scout")
        ? "SCOUT"
        : email.startsWith("policy")
          ? "FEDERATION_ADMIN"
          : email.startsWith("admin")
            ? "SUPER_ADMIN"
            : "ATHLETE";
    const user = makeUser(role);
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
  if (path.startsWith("users/")) {
    ok({
      ...makeUser(),
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
    const rows = nearbyPages
      ? Array.from({ length: 45 }, (_, index) => ({
          ...makeTournament(),
          id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          name: `Nearby Tournament ${String(index + 1).padStart(2, "0")}`,
          prizePool: 25000,
          minGti: 0,
          maxGti: 100,
          distanceKm: Math.floor(index / 2),
        }))
      : [{ ...makeTournament(), minGti: 0, maxGti: 100, prizePool: 25000, distanceKm: 4.2 }];
    const cursor = url.searchParams.get("cursor");
    const start = cursor ? rows.findIndex((row) => row.id === cursor) + 1 : 0;
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const data = rows.slice(start, start + limit);
    const has_more = start + limit < rows.length;
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
    ok({
      activeTournamentsCount: tournaments.size,
      totalRegisteredAthletes: matched ? 13 : 2,
      totalPrizePoolInr: [...tournaments.values()].reduce(
        (sum, event) => sum + Number(event.prizePool),
        0,
      ),
      freeAgentTeamsFormed: matched ? 1 : 0,
      activeSafetyAlertsCount: [...healthAlerts.values()].filter((alert) => !alert.acknowledgedAt)
        .length,
    });
    return;
  }
  if (path === "tournaments/organizer/mine") {
    ok(page([...tournaments.values()]));
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
        count: 4,
        data: [
          {
            district: "Varanasi",
            total_athletes: 100,
            average_gti: 65,
            female_participation_pct: 42,
            centroid: { type: "Point", coordinates: [82.9739, 25.3176] },
          },
          {
            district: "Ghaziabad",
            total_athletes: 50,
            average_gti: 90,
            female_participation_pct: 20,
            centroid: { type: "Point", coordinates: [77.4538, 28.6692] },
          },
          {
            district: "Meerut",
            total_athletes: 0,
            average_gti: 0,
            female_participation_pct: 0,
            centroid: null,
          },
          {
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
