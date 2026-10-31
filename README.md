# KheLEO Web Dashboards

The role-based web application for KheLEO: verified athlete identities, digital sports passports, fair competition entry, free-agent teams, private browser pose analysis, wearable monitoring, and grassroots talent discovery.

`kheleo-web-dashboards` runs alongside the NestJS `kheleo-core-backend`. It uses Next.js App Router, React, strict TypeScript, Tailwind CSS, TanStack Query, Socket.IO, MediaPipe, and Leaflet. Browser API requests pass through an authenticated, allowlisted Next.js relay; PostgreSQL/PostGIS and BullMQ remain backend responsibilities. Audited backend source: [`0067d94`](docs/contracts/source.json).

## Invention alignment and current scope

The **Kheleo Invention Disclosure Form** describes a permanent identity-bound profile, local technique analysis without video upload, complementary free-agent rosters, GTI-based fairness, biometric safety, and regional talent discovery. The frontend implements available contracts and shows explicit dependency states where contracts are missing.

The disclosure is the product specification, not evidence of legal patent validation or complete implementation. Leaderboard lists, historical dossiers, scout outreach, admin moderation/audit APIs, approved drill scoring, full wearable telemetry, and confidential safety rooms remain external requirements. See [the frontend audit](docs/frontend-audit.md) and [backend prerequisites](docs/backend-dependencies.md).

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

Public signup provisions athletes only. Other personas require authorized backend provisioning. Authentication uses contact details plus government-ID proof; no password, OTP, Supabase authentication, or client role-switching flow is fabricated.

## Multi-portal features

### Digital Sports Passport and identity

Athletes manage demographic, district/state, physical, and sport-role records. The passport displays authoritative identity status, GTI, posture points, wearable score, and match score. Identity verification uses the actual `POST /api/v1/auth/verify-government-id` endpoint; `/auth/verify-gov-id` does not exist in this backend.

The backend enforces permanent one-to-one identity binding and reattaches the existing profile when registration supplies matching identity/contact proof. Conflicts remain visible. Raw government-ID proof and tokens are not persisted in browser storage. Sport-role edits cannot write verified metrics or earned badges through the relay.

### PostGIS Tournament Discovery and Anti-Sandbagging Gatekeeper

Location, radius, and sport filters query `/tournaments/nearby`; a client-only Leaflet map complements the cards. Detail pages expose real bracket bounds, capacity, fees, and deadlines. Discovery displays one bounded result set because the backend UUID cursor does not preserve distance ordering; it is not an exhaustive directory.

Registration distinguishes `409 SANDBAGGING_DETECTED` from below-tier and capacity conflicts. A backend-suggested higher bracket opens its real eligibility and a deliberate upgrade/registration action. Showing fees does not imply payment collection or an eligibility override.

### Free-Agent Pool

Athletes select sport-specific primary and secondary positions, join/leave a bracket-scoped pool, and inspect authoritative queue/roster status. `/ws/matchmaking` delivers `ROSTER_FORMED`; the client refetches pool state after events and reconnection. Logout and unmount release subscriptions. Team balancing and complementary-role assignment belong to the backend.

### Client-Side Edge-AI Webcam Studio

MediaPipe inference runs locally in a CPU worker with self-hosted WASM and a checksum-verified pose model. Joint-angle geometry supports cricket bowling, badminton smash, football strike, and athletics sprint-start practice. No raw video, camera frames, or full landmark arrays are uploaded.

The pipeline submits at most 15 frames/second, permits one frame in flight, and updates React at most five times/second. Stop, navigation, hidden tabs, and logout release cameras/workers, including late permission responses. Alignment percentages are provisional practice feedback, not validated athletic scores.

The relay generates `x-drill-signature` through **server-side Web Crypto HMAC-SHA256**, signing `userId:drill_type:form_score:timestamp`. Shared signing keys never enter the client bundle. Production scoring remains disabled until reference models/calibration are reviewed. Explicitly isolated staging can enable provisional practice ingestion; a signed browser estimate is not anti-cheat provenance.

### Web Bluetooth IoT Hub and Match-Pause Command Center

The hub connects to Heart Rate service **`0x180D`**, characteristic **`0x2A37`**, parsing 8-bit and 16-bit packets. A labeled simulator supplies normal and critical scenarios. Standard HR devices do not supply SpO₂ or temperature; unavailable measurements are not invented. Hardware ingestion remains gated pending complete device/context contracts.

Critical thresholds match the backend: **HR > 195 bpm**, **SpO₂ < 90%**, or **temperature > 39.5°C**. The organizer command center validates `MATCH_PAUSE_ALERT`, highlights incidents, and provides opt-in audio, local acknowledgement, and emergency test controls. It cannot perform a server-confirmed pause/resume or emergency dispatch without those backend APIs.

The existing event gateway globally broadcasts sensitive alerts, so event subscriptions default to disabled. `SAFE_EVENTS_VERIFIED` is an operator assertion after backend isolation fixes, not a fix itself. Simulator ingestion requires isolated staging, rejects match/bracket/tournament context, and never targets production data. Telemetry signs exact JSON bytes through server-only `x-device-signature`.

### GTI, Scout Dossiers, and Regional Policy Heatmaps

**GTI = 0.35 × biomechanical score + 0.25 × wearable score + 0.40 × match performance.** The passport explains these weights; posture points do not replace a missing biomechanical score. Individual national/district rank lookup works through the existing endpoint. Full leaderboard lists need a backend listing contract and remain explicitly unavailable.

The scout feed defaults to the **85.0 Elite Target Zone**, with sport/district filters, actual rural/underrepresented labels, alert acknowledgement, and on-demand passport inspection. Feed pages are deduplicated and bounded to five 20-row pages; score ordering lacks a unique cursor tie-breaker. Season history, signed drill evidence, recovery trends, podium history, outreach, and shortlists require additional contracts.

Regional views display backend PostGIS aggregates as centroid circles plus a sortable accessible table and CSV/JSON exports. GTI, participation, and female-participation planning layers share a maximum 500-row dataset. Invalid centroids remain in tables/exports. Maps load through `next/dynamic` with `{ ssr: false }`; coordinates are validated and converted to Leaflet order. Centroids are not district polygons; report metadata preserves unknown completeness. OpenStreetMap attribution remains visible.

### Organizer and Super Admin Consoles

Organizers create supported event metadata, venue coordinates, dates, capacity/prize configuration, and GTI brackets through a multi-step wizard. Owned directories, editing, roster administration, detailed statistics, and results require backend APIs; their screens explain the dependency.

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
| `DRILL_HMAC_SECRET`             | Server-only key matching NestJS; does not unlock production scoring.                                                                                                                      |
| `TELEMETRY_SERVICE_HMAC_SECRET` | Server-only key matching backend telemetry signing.                                                                                                                                       |
| `SAFE_EVENTS_VERIFIED`          | Defaults `false`; enable only after backend socket privacy is fixed and verified.                                                                                                         |
| `DRILL_PRACTICE_INGESTION`      | Defaults `false`; provisional ingestion additionally requires isolated staging.                                                                                                           |
| `SIMULATOR_INGESTION`           | Defaults `false`; requires isolated staging; cannot attach simulations to matches.                                                                                                        |
| `STAGING_DATA_ISOLATED`         | Defaults `false`; must be `true` with `APP_ENV=staging` for staging ingestion.                                                                                                            |

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
