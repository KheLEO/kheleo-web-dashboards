import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Server } from "socket.io";
import { ids, makeUser, makePassport, makeBracket, makeTournament } from "../../src/test/factories";
import type { UserRole } from "../../src/contracts/enums.generated";
import type { JsonValue } from "../../src/contracts/common";
const cache = new Map<string, { body: string; response: unknown }>();
let joined = false;
let matched = false;
let profileExists = true;
const seenMutations: string[] = [];
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
    seenMutations.length = 0;
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
    io.of("/ws/matchmaking").emit("ROSTER_FORMED", payload);
    io.of("/ws/matchmaking").emit("ROSTER_FORMED", payload);
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
  if (path === "auth/verify-government-id") {
    ok({ message: "Verified", verified: true, idHashPrefix: "abcd1234" });
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
    ok(makePassport());
    return;
  }
  if (path === "tournaments/nearby") {
    ok([{ ...makeTournament(), minGti: 0, maxGti: 100, prizePool: 25000, distanceKm: 4.2 }]);
    return;
  }
  if (path === "tournaments" && method === "POST") {
    ok(makeTournament());
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
    const brackets = [
      makeBracket(),
      {
        ...makeBracket(),
        id: ids.higher,
        name: "Gold tier",
        tierName: "GOLD",
        minGti: "60",
        maxGti: "100",
      },
    ];
    ok(
      method === "GET"
        ? { data: brackets, next_cursor: null, has_more: false, count: 2 }
        : makeBracket(),
    );
    return;
  }
  if (path.startsWith("tournaments/")) {
    ok({ ...makeTournament(), brackets: [makeBracket()] });
    return;
  }
  if (path.startsWith("gti/recalculate/")) {
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
    ok(
      {
        success: true,
        total: 1,
        limit: 20,
        next_cursor: null,
        data: [
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
        ],
      },
      true,
    );
    return;
  }
  if (path === "scouts/alerts") {
    ok([]);
    return;
  }
  if (path === "heatmaps/regional") {
    ok(
      {
        success: true,
        count: 1,
        data: [
          {
            district: "Varanasi",
            total_athletes: 100,
            average_gti: 65,
            female_participation_pct: 42,
            centroid: { type: "Point", coordinates: [82.9739, 25.3176] },
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
server.listen(4100, "localhost");
process.on("SIGTERM", () => {
  void io.close();
  server.close();
});
