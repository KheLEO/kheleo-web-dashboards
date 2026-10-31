# KheLEO Web Dashboards

Unified Next.js application for athlete passports, fair tournament entry, free-agent matchmaking, browser pose tracking, wearable previews, and scouting intelligence.

The application integrates with `kheleo-core-backend` through a server-side, allowlisted relay. Backend contract source: adjacent `KheLEO-backend` at `0067d94`. Missing backend capabilities are visible dependency states; this application does not invent their APIs.

## Setup

Use Node.js 22 LTS (22.13+) and pnpm 11.24.0. The checkout contains `.nvmrc` and `.node-version`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3001`. Configure `REDIS_URL` for web sessions and start the existing NestJS backend separately on port 3000. The web relay never accesses PostgreSQL directly. Backend PostgreSQL/PostGIS, Redis, and BullMQ configuration belongs to the backend repository.

For local UI development without Redis, use `SESSION_STORE=memory pnpm dev`. This does not simulate authentication or backend data: sign-in still needs the real backend. The memory store is rejected by production and staging runtime validation.

`pnpm dev` and `pnpm build` prepare version-matched MediaPipe WASM and a checksum-verified pose model. The first run downloads the model from Google's official model storage. Generated assets are ignored by Git and served locally at runtime. No webcam frames are uploaded.

## Implemented workspaces

| Workspace    | Capabilities                                                                                                                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Athlete      | Gov-ID login/verification, passport create/edit, sport roles, contact updates/deactivation, nearby discovery, bracket registration conflicts, pool join/leave/status, realtime rosters, national/district individual rank, pose tracking, Bluetooth HR and simulator |
| Organizer    | Tournament and bracket creation, known-ID event detail, fee/prize configuration, gated safety command center                                                                                                                                                         |
| Scout/policy | Elite prospect feed, talent alerts/acknowledgement, authorized athlete passport preview, regional centroid maps and participation/equity table                                                                                                                       |
| Super admin  | Protected admin workspace with explicit requirements for unavailable verification, moderation, audit, and monitoring APIs                                                                                                                                            |

Public signup creates athletes only. Other roles must already be provisioned by the platform. Login uses contact details plus Gov-ID proof; no password/OTP flow is fabricated. An `UMPIRE` account is recognized and shown an unsupported-workspace screen.

## Configuration

| Variable                                       | Purpose                                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `APP_ORIGIN`                                   | Exact browser origin; enforced for mutations                                           |
| `NEST_API_URL`                                 | Private NestJS base URL including `/api/v1`                                            |
| `REDIS_URL`                                    | Server-only web session/lock/rate-limit store                                          |
| `SESSION_STORE`                                | `redis` by default; `memory` allowed only locally/tests                                |
| `APP_ENV`                                      | `development`, `test`, `staging`, or `production`                                      |
| `NEXT_PUBLIC_SOCKET_ORIGIN`                    | Backend origin without `/api/v1`; backend CORS must allow the frontend                 |
| `NEXT_PUBLIC_TILE_URL`                         | OSM-compatible raster tiles, with attribution retained                                 |
| `DRILL_HMAC_SECRET`                            | Server-only secret matching NestJS; submission remains calibration-gated               |
| `TELEMETRY_SERVICE_HMAC_SECRET`                | Server-only secret matching NestJS telemetry signing                                   |
| `SAFE_EVENTS_VERIFIED`                         | Leave `false` until backend socket confidentiality is independently fixed and verified |
| `SIMULATOR_INGESTION`, `STAGING_DATA_ISOLATED` | Both must be `true` and `APP_ENV=staging` for simulator ingestion                      |

Production requires HTTPS, private Redis access, and an explicitly configured backend. Signing secrets must never have a `NEXT_PUBLIC_` prefix. The socket access token is supplied only to the browser's in-memory Socket.IO client; refresh tokens stay server-side.

## Important capability boundaries

- Tournament editing, owned event directories, organizer roster operations, leaderboard lists, full dossiers, and admin APIs are absent in the current backend.
- The safety gateway currently broadcasts sensitive alerts globally. `/ws/events` subscriptions default to disabled. Matchmaking uses its separate namespace.
- Nearby search returns at most 20 results; the backend's UUID cursor does not match distance ordering, so exhaustive scrolling is disabled.
- The standard Bluetooth HR service supplies no SpO₂ or temperature. Missing measurements remain unavailable; hardware ingestion is blocked until full device/context contracts exist.
- Production pose scoring is unapproved. Tracking and angle feedback work; GTI submission is rejected on the server.
- Simulator readings are labeled and remain local outside explicitly isolated staging. Simulator ingestion cannot target match/tournament records.
- Logout clears the web session/resources. Backend token revocation requires an API that does not yet exist.

See [verification evidence](docs/verification.md), [backend contracts](docs/backend-contracts.md), [dependencies](docs/backend-dependencies.md), and [architecture](docs/architecture.md).

## Verification

```sh
set -eu
pnpm install --frozen-lockfile
pnpm contracts:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
git diff --check
```

Browser tests start an isolated contract fixture backend on port 4100 and the real frontend on 3001. They exercise actual HTTP relay/session flows, Socket.IO delivery, and MediaPipe inference with Chromium's fake camera. They do not establish live NestJS/PostGIS/Redis/BullMQ or physical-device coverage. Never point the fixture or simulator at production data.

`pnpm contracts:check` validates generated types against the committed schema snapshot and, when available, compares the adjacent backend schema. Refresh deliberately with `pnpm contracts:sync`; pass `--schema=/absolute/path/schema.prisma` through the script for another checkout. Controller/service changes still require manual contract review.

## Production runtime

```sh
pnpm build
pnpm start
```

The production server listens on port 3001. Provision configuration through server environment variables. Use a shared Redis namespace across frontend instances for refresh coordination. Preserve WebSocket connections at the backend reverse proxy and configure its allowed origin.

No backend source changes, production deployment, commit, or push are performed by this implementation.
