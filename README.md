# KheLEO Web Dashboards

The role-based web application for KheLEO: verified athlete identities, digital sports passports, fair competition entry, free-agent teams, private browser pose analysis, wearable monitoring, and grassroots talent discovery.

`kheleo-web-dashboards` runs alongside the NestJS `kheleo-core-backend`. It uses Next.js App Router, React, strict TypeScript, Tailwind CSS, TanStack Query, Socket.IO, MediaPipe, and Leaflet. Browser API requests pass through an authenticated, allowlisted Next.js relay; PostgreSQL/PostGIS and BullMQ remain backend responsibilities. Backend source revision and schema checksum: [contract source](docs/contracts/source.json).

## Invention alignment and current scope

The **Kheleo Invention Disclosure Form** describes a permanent identity-bound profile, local technique analysis without video upload, complementary free-agent rosters, GTI-based fairness, biometric safety, and regional talent discovery. The frontend implements available contracts and shows explicit dependency states where contracts are missing.

The disclosure describes product goals. Current contracts include calibrated software drill scoring, multi-sensor telemetry, confidential safety subscriptions, organizer operations, scouting, and administration. Physical device provenance, clinical clearance, and production service operation require separate validation. See [verification evidence](docs/verification.md) and [deployment prerequisites](docs/backend-dependencies.md).

## Routes and access

The landing page provides four portal entry points. Protected server layouts enforce roles on direct URL entry; navigation visibility is not authorization.

| Portal               | Required role                                    | Primary routes                                                                                                                      |
| -------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Public/auth          | Public; identity verification requires a session | `/`, `/login`, `/signup`, `/verify-identity`                                                                                        |
| Athlete              | `ATHLETE`, `SUPER_ADMIN`                         | `/athlete/dashboard`, `/athlete/passport`, `/athlete/tournaments`, `/athlete/matchmaking`, `/athlete/drills`, `/athlete/iot-device` |
| Organizer            | `ORGANIZER`, `FEDERATION_ADMIN`, `SUPER_ADMIN`   | `/organizer/dashboard`, `/organizer/tournaments`, `/organizer/tournaments/create`, `/organizer/brackets`, `/organizer/safety`       |
| Scout/academy/policy | `SCOUT`, `FEDERATION_ADMIN`, `SUPER_ADMIN`       | `/scout/dashboard`, `/scout/leaderboards`, `/scout/feed`, `/scout/heatmaps`                                                         |
| Super admin          | `SUPER_ADMIN`                                    | `/admin/dashboard`, `/admin/users`, `/admin/tournaments`, `/admin/audit-logs`, `/admin/theme`                                       |

Short workspace roots and older `/register`, `/athlete/wearable`, `/scout/prospects`, and `/scout/regional` paths remain supported. Detail routes support passport editing, tournament/bracket/pool workflows, organizer events, and scout passport inspection. `UMPIRE` accounts receive an unsupported-workspace screen.

Public signup supports athletes, organizers, and scouts; organizer/scout access remains pending administrator identity approval. Privileged administrators require authorized provisioning. Authentication uses contact details plus government-ID proof; no password, OTP, Supabase authentication, or client role-switching flow is fabricated.

## Multi-portal features

### Digital Sports Passport and identity

Athletes manage demographic, district/state, physical, and sport-role records. The passport displays authoritative identity status, GTI, posture points, wearable score, and match score. Identity verification supports both `POST /api/v1/auth/verify-government-id` and `/auth/verify-gov-id`. `GET/POST/PATCH /users/profile` targets the authenticated passport. Organizer and scout signup remains pending administrator identity verification. Logout revokes upstream refresh families and removes the server session.

The backend enforces permanent one-to-one identity binding and reattaches the existing profile when registration supplies matching identity/contact proof. Conflicts remain visible. Raw government-ID proof and tokens are not persisted in browser storage. Sport-role edits cannot write verified metrics or earned badges through the relay.

### PostGIS Tournament Discovery and Anti-Sandbagging Gatekeeper

Location, radius, and sport filters query `/tournaments/nearby`; a client-only Leaflet map complements the cards. Detail pages expose real bracket bounds, capacity, fees, and deadlines. Discovery follows `(distance_km ASC, id ASC)` keyset cursors through Load More Tournaments. Both PostGIS and Haversine responses include `{ data, next_cursor, has_more }`; the client also decodes legacy arrays.

Registration distinguishes `409 SANDBAGGING_DETECTED` from below-tier and capacity conflicts. A backend-suggested higher bracket opens its real eligibility and a deliberate upgrade/registration action. Showing fees does not imply payment collection or an eligibility override.

### Free-Agent Pool

Athletes select sport-specific primary and secondary positions, join/leave a bracket-scoped pool, and inspect authoritative queue/roster status. `/ws/matchmaking` delivers `ROSTER_FORMED`; the client refetches pool state after events and reconnection. Logout and unmount release subscriptions. Team balancing and complementary-role assignment belong to the backend.

### Client-Side Edge-AI Webcam Studio

MediaPipe inference runs locally in a CPU worker with self-hosted WASM and a checksum-verified pose model. Joint-angle geometry supports cricket bowling, badminton smash, football strike, and athletics sprint-start practice. Video and camera images remain on-device. Explicit submission sends at most 300 pose landmark frames to the relay for score validation; only the aggregate and its digest reach NestJS.

The pipeline submits at most 15 frames/second, permits one frame in flight, and updates React at most five times/second. Stop, navigation, hidden tabs, and logout release cameras/workers, including late permission responses. Scoring policy `1.0.0` checks reference joint-angle windows, at least 30 visible frames, full-body visibility of 0.6 or higher, two movement cycles, and sport-specific cadence. These software reference windows do not establish sporting legality or clinical validation.

The browser hashes the landmark series with Web Crypto SHA-256 in `x-client-pose-digest`. The relay recomputes the digest and score, then signs all canonical submission fields with **server-side HMAC-SHA256** using the backend FULL_V2 protocol. Shared signing keys never enter the client bundle. Valid sessions award Posture Practice Points and enqueue GTI updates; duplicate pose digests cannot award points again. Browser pose data remains client-reported evidence rather than camera attestation.

### Web Bluetooth IoT Hub and Match-Pause Command Center

The hub connects to Heart Rate **`0x180D/0x2A37`** with optional Pulse Oximeter **`0x1822/0x2A5F`** and Health Thermometer **`0x1809/0x2A1C`** services. A heart-rate-only strap uses explicit baseline labels for SpO₂ 98% and temperature 36.8°C. These defaults are not measurements. Athletes can opt into streaming BLE readings or labeled simulator stress tests with optional tournament/bracket/match context. Daily monitored sessions update wearable consistency and enqueue GTI recalculation.

Critical thresholds match the backend: **HR > 195 bpm**, **SpO₂ < 90%**, or **temperature > 39.5°C**. The organizer command center loads a paginated all-player wall from persisted telemetry and refreshes on `VITALS_UPDATED` and `MATCH_PAUSE_ALERT`. It shows actual match pause states, reading timestamps, source labels, and athletes awaiting readings. Critical incidents open a full-screen override with opt-in siren audio. Medical-check notes and acknowledgements persist on the backend; resuming a paused match requires explicit field-staff clearance confirmation and all critical incidents acknowledged. Recording dispatch confirmation does not itself dispatch medical personnel.

Both Socket.IO namespaces authenticate the handshake. Competition rooms require ownership, assignment, administration, or registered participation; competition medical events target private `safety:tournament`, `safety:bracket`, and `safety:match` rooms joined only by authorized staff. Participants and unrelated organizers receive no competition medical broadcast. Standalone alerts use the affected athlete’s personal room. Telemetry signs exact JSON bytes through server-only `x-device-signature`, including `BLE`/`SIMULATOR` provenance and baseline labels. The backend validates context membership before changing a match. Critical standalone readings also emit alerts, without reporting a persisted match pause.

### GTI, Scout Dossiers, and Regional Policy Heatmaps

**GTI = 0.35 × biomechanical score + 0.25 × wearable score + 0.40 × match performance.** The passport explains these weights; posture points do not replace a missing biomechanical score. Individual national/district rank lookup works through the existing endpoint. Full leaderboard lists need a backend listing contract and remain explicitly unavailable.

The scout feed defaults to the **85.0 Elite Target Zone**, with sport/district filters, actual rural/underrepresented labels, alert acknowledgement, and on-demand passport inspection. Feed pages are deduplicated and bounded to five 20-row pages; score ordering lacks a unique cursor tie-breaker. Season history, signed drill evidence, recovery trends, podium history, outreach, and shortlists require additional contracts.

Regional views display backend PostGIS aggregates as centroid circles plus a sortable accessible table and CSV/JSON exports. GTI, participation, and female-participation planning layers share a maximum 500-row dataset. Invalid centroids remain in tables/exports. Maps load through `next/dynamic` with `{ ssr: false }`; coordinates are validated and converted to Leaflet order. Centroids are not district polygons; report metadata preserves unknown completeness. OpenStreetMap attribution remains visible.

### Organizer and Super Admin Consoles

Organizers see five live scoped KPIs, a paginated owned-event directory, populated event editing, and saved bracket editing/deletion. Tournament and bracket JSON configuration stores validated role quotas and per-place prizes. The bracket workspace provides verified team rosters, queued free agents, a matchmaker trigger, persisted sandbagging rejection logs, and named verified match results. Results update sport counters and enqueue GTI recalculation. Prize totals represent configured INR pools rather than payouts.

Super admins inspect known users through the authorized existing API, check frontend session connectivity, and customize the browser theme. Governance, moderation, identity/HMAC/sandbagging audit streams, and infrastructure-health views identify missing contracts. They do not fabricate audit records, operational metrics, or moderation actions.

## Swappable Golden-Crimson-Silver theme

Colors originate in [`src/app/globals.css`](src/app/globals.css). Tailwind, charts, canvas, and markers consume semantic tokens. Keep hexadecimal tokens and their RGB partners synchronized:

| Color   | Hex token                  | RGB channel token         | Default                   |
| ------- | -------------------------- | ------------------------- | ------------------------- |
| Gold    | `--kheleo-gold-primary`    | `--kheleo-gold-rgb`       | `#f5b014` / `245 176 20`  |
| Crimson | `--kheleo-crimson-primary` | `--kheleo-crimson-rgb`    | `#d91e2a` / `217 30 42`   |
| Silver  | `--kheleo-silver-chrome`   | `--kheleo-silver-primary` | `#e2e8f0` / `226 232 240` |
| Canvas  | `--kheleo-bg-canvas`       | `--kheleo-obsidian`       | `#0a0a0e` / `10 10 14`    |

To change defaults, edit `:root, [data-theme="kheleo-gold-crimson"]`, updating matching RGB channels and contrast-sensitive foregrounds. Semantic tokens such as `--primary`, `--foreground`, and `--destructive` then follow automatically. Preserve the white `--kheleo-text-on-crimson` foreground for readable destructive controls. Other preset blocks independently override palettes.

Alternatively, sign in as `SUPER_ADMIN`, open `/admin/theme`, select Golden Crimson, Royal Emerald, Midnight Cyber, or Light Stadium, and adjust validated color controls. Review component previews/contrast checks, copy the CSS variables, and merge the exported values into the matching source preset. Preferences persist and synchronize tabs when browser storage is available. This is a browser preview, not a shared platform theme publication. Reset custom overrides when checking source defaults.

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local`; never commit credentials. Public variables are compiled into browser bundles and require rebuilding after changes.

| Variable                        | Purpose                                                                                                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_ORIGIN`                    | Exact frontend origin; default `http://localhost:3001`. Enforced for mutations.                                                                                                           |
| `NEST_API_URL`                  | Server-side backend base including `/api/v1`; default `http://localhost:3000/api/v1`.                                                                                                     |
| `NEXT_PUBLIC_API_URL`           | Optional HTTP(S) alias when `NEST_API_URL` is unset. Browser calls still use the relay.                                                                                                   |
| `NEXT_PUBLIC_SOCKET_ORIGIN`     | Canonical Socket.IO origin; default `http://localhost:3000`.                                                                                                                              |
| `NEXT_PUBLIC_WS_URL`            | Optional socket alias when the canonical variable is unset. HTTP(S)/WS(S) origins only, without paths, credentials, queries, or fragments. Socket and CSP use the same normalized origin. |
| `NEXT_PUBLIC_SUPABASE_URL`      | Optional project URL; no current route uses the optional Supabase factory.                                                                                                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional public anon key, never a service-role key. Supabase does not own platform authentication.                                                                                        |
| `NEXT_PUBLIC_DRILL_HMAC_SECRET` | **Unsupported: do not set.** Browser-visible keys allow forged submissions. Use server-only `DRILL_HMAC_SECRET`.                                                                          |
| `NEXT_PUBLIC_TILE_URL`          | OSM-compatible raster tile template.                                                                                                                                                      |
| `APP_ENV`                       | `development`, `test`, `staging`, or `production`.                                                                                                                                        |
| `SESSION_STORE`                 | `redis` by default; `memory` only for local development/tests.                                                                                                                            |
| `REDIS_URL`                     | Private session/refresh/rate-limit/operation store; required in Redis mode.                                                                                                               |
| `DRILL_HMAC_SECRET`             | Server-only key matching NestJS; enables validated drill submission.                                                                                                                      |
| `TELEMETRY_SERVICE_HMAC_SECRET` | Server-only key matching backend telemetry signing; enables BLE and simulator streaming.                                                                                                  |

Unset canonical variables to use aliases; copying defaults otherwise gives them precedence. Production/staging reject memory sessions. Only server processes receive HMAC secrets, which must match the backend.

## Installation and development

Use **pnpm 11.24.0** and Node.js **22.13+ or 24** (`>=22.13 <25`). CI and version files pin Node 22. Configure/start the backend and its PostgreSQL/PostGIS, Redis, and BullMQ prerequisites separately.

```sh
set -eu
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3001`. Configure `.env.local` before signing in. For local work without Redis, use `SESSION_STORE=memory pnpm dev`; authentication still needs a real backend, and data is not automatically simulated.

Development/build scripts prepare version-matched MediaPipe WASM and a SHA-256-verified model from Google's official model storage. Initial preparation requires network access; runtime inference uses local assets. Generated WASM/model files are ignored by Git. If checksum verification fails, remove the cached model and retry asset preparation.

## Verification

```sh
set -eu
pnpm contracts:check
pnpm lint
pnpm format:check
pnpm typecheck
pnpm exec tsc --noEmit
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
git diff --check
```

`pnpm typecheck` generates installed Next.js route types before strict TypeScript validation. ESLint is a separate gate; a production build alone is not a lint check. Browser tests reserve ports 3001/4100 and start the real frontend plus an isolated contract fixture. They exercise sessions, relay/RBAC, forms, sockets, camera cleanup, dialogs, accessibility, and all 24 requested routes at 360px/1920px. Avoid another server on these ports or a build over the same `.next` directory during E2E.

Fixture tests do not establish live NestJS/PostGIS/Redis/BullMQ, production capacity, physical Android, physical Bluetooth, or clinical validation. See [verification evidence](docs/verification.md) for measured results and remaining gates.

`pnpm contracts:check` validates generated schema types and compares the adjacent backend schema when available. Refresh deliberately with `pnpm contracts:sync` or `pnpm contracts:sync --schema=/absolute/path/schema.prisma`; manually review controller/service DTOs too. Schema generation does not validate every HTTP contract.

## Production operation

```sh
set -eu
pnpm build
pnpm start
```

The server listens on port 3001. Configure HTTPS, exact `APP_ORIGIN`, private Redis, backend access, CORS, and WebSocket proxy/origin allowances. Share the Redis namespace across frontend replicas for refresh coordination and operation/rate-limit state. Session cookies are HttpOnly/SameSite and secure over HTTPS; refresh tokens remain server-side, and socket tokens stay in browser memory.

Queries use bounded caches/backoff; mutation retries retain UUIDs and exact serialized bytes. Device loops, alerts, charts, and lists are bounded. These controls do not certify thousands of concurrent users: measure actual services in isolated staging. Logout/self-deactivation clear the web session and resources; immediate backend token revocation still requires a backend API.

## Repository guide

- `src/app`: routes, protected layouts, session endpoints, backend relay.
- `src/features`: domain adapters, queries, interactive workflows.
- `src/components`: portal shells, shared views, accessible UI.
- `src/contracts`: validated wire contracts and generated schema references.
- `src/server`: sessions, refresh, authorization, signing, origin/rate/idempotency protection.
- `scripts`: contract generation and MediaPipe preparation.
- `tests`: contract/unit/integration/browser coverage and isolated backend fixture.
- `docs`: [architecture](docs/architecture.md), [backend contracts](docs/backend-contracts.md), [athlete](docs/athlete-portal.md), [organizer](docs/organizer-portal.md), [scout/policy](docs/scout-policy-portal.md), [admin/resilience](docs/admin-resilience.md), and [audit](docs/frontend-audit.md).

## Inventor credits

**Rishav Raj, Rewas Khatri, and Divyansh Gupta** — **Hi-Tech Institute of Engineering & Technology**.
